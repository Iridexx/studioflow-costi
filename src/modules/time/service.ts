import { prisma } from "@/lib/db";
import { isFullyApproved, missingApprovers } from "@/modules/expenses/approval";
import { listApprovers } from "@/modules/expenses/service";

export type TimeEntryInput = {
  date: Date;
  partnerId: string;
  minutes: number;
  topic: string;
  notes: string | null;
};

const include = {
  partner: { select: { name: true } },
  createdBy: { select: { name: true } },
} as const;

// Solo le ore confermate da tutti: sono quelle che entrano nei conti.
export function listTimeEntries() {
  return prisma.timeEntry.findMany({
    where: { approvedAt: { not: null } },
    include,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
}

// Tutte le ore, con chi deve ancora confermarle e se tocca al socio indicato.
export async function listTimeEntriesWithStatus(partnerId: string) {
  const [entries, approvers] = await Promise.all([
    prisma.timeEntry.findMany({
      include: { ...include, approvals: { select: { partnerId: true } } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    }),
    listApprovers(),
  ]);
  return entries.map((e) => {
    const missing = e.approvedAt
      ? []
      : missingApprovers(
          approvers,
          e.approvals.map((a) => a.partnerId),
        );
    return { ...e, missing, mustConfirm: missing.some((p) => p.id === partnerId) };
  });
}

export async function countTimeEntriesWaitingFor(partnerId: string) {
  const entries = await prisma.timeEntry.findMany({
    where: { approvedAt: null, approvals: { none: { partnerId } } },
    select: { id: true },
  });
  if (entries.length === 0) return 0;
  const approvers = await listApprovers();
  return approvers.some((p) => p.id === partnerId) ? entries.length : 0;
}

export function getTimeEntry(id: string) {
  return prisma.timeEntry.findUnique({
    where: { id },
    include: { ...include, approvals: { select: { partnerId: true } } },
  });
}

// Se ora tutti le hanno confermate, le ore entrano nei conti.
async function settle(id: string) {
  const [entry, approvers] = await Promise.all([
    prisma.timeEntry.findUnique({
      where: { id },
      select: { approvedAt: true, approvals: { select: { partnerId: true } } },
    }),
    listApprovers(),
  ]);
  if (!entry || entry.approvedAt) return;
  if (
    isFullyApproved(
      approvers,
      entry.approvals.map((a) => a.partnerId),
    )
  )
    await prisma.timeEntry.update({ where: { id }, data: { approvedAt: new Date() } });
}

export async function settlePendingTimeEntries() {
  const pending = await prisma.timeEntry.findMany({
    where: { approvedAt: null },
    select: { id: true },
  });
  for (const e of pending) await settle(e.id);
}

// Il costo orario si fissa al momento della registrazione. Chi registra conferma in automatico.
export async function createTimeEntry(input: TimeEntryInput, createdById: string) {
  const partner = await prisma.partner.findUniqueOrThrow({ where: { id: input.partnerId } });
  const entry = await prisma.timeEntry.create({
    data: {
      ...input,
      hourlyRateCents: partner.hourlyRateCents,
      createdById,
      approvals: { create: { partnerId: createdById } },
    },
  });
  await settle(entry.id);
  return prisma.timeEntry.findUniqueOrThrow({ where: { id: entry.id } });
}

// Una modifica rimette le ore in attesa: le confermano di nuovo gli altri soci.
export async function updateTimeEntry(
  id: string,
  input: TimeEntryInput,
  hourlyRateCents: number,
  editorId: string,
) {
  await prisma.$transaction([
    prisma.timeEntryApproval.deleteMany({ where: { timeEntryId: id } }),
    prisma.timeEntry.update({
      where: { id },
      data: {
        ...input,
        hourlyRateCents,
        approvedAt: null,
        approvals: { create: { partnerId: editorId } },
      },
    }),
  ]);
  await settle(id);
}

export async function confirmTimeEntry(id: string, partnerId: string) {
  await prisma.timeEntryApproval.upsert({
    where: { timeEntryId_partnerId: { timeEntryId: id, partnerId } },
    create: { timeEntryId: id, partnerId },
    update: {},
  });
  await settle(id);
}

export function deleteTimeEntry(id: string) {
  return prisma.timeEntry.delete({ where: { id } });
}

// Argomenti del menu a tendina (solo quelli in uso, se richiesto).
export function listTopics(options: { onlyActive?: boolean } = {}) {
  return prisma.timeTopic.findMany({
    where: options.onlyActive ? { active: true } : undefined,
    orderBy: [{ position: "asc" }, { name: "asc" }],
  });
}

async function findTopic(name: string) {
  return prisma.timeTopic.findFirst({ where: { name: { equals: name, mode: "insensitive" } } });
}

export async function topicNameTaken(name: string, exceptId?: string) {
  const found = await findTopic(name);
  return !!found && found.id !== exceptId;
}

// Un argomento nuovo scritto registrando le ore entra nel menu; se c'era già (anche scritto con
// maiuscole diverse) si usa quello, e se era stato tolto dal menu torna in uso.
export async function ensureTopic(name: string): Promise<string> {
  const found = await findTopic(name);
  if (found) {
    if (!found.active)
      await prisma.timeTopic.update({ where: { id: found.id }, data: { active: true } });
    return found.name;
  }
  const last = await prisma.timeTopic.aggregate({ _max: { position: true } });
  const created = await prisma.timeTopic.create({
    data: { name, position: (last._max.position ?? 0) + 1 },
  });
  return created.name;
}

export async function createTopic(name: string) {
  return ensureTopic(name);
}

// Rinominando un argomento si aggiornano anche le ore già registrate con quel nome.
export async function updateTopic(id: string, data: { name: string; active: boolean }) {
  const current = await prisma.timeTopic.findUniqueOrThrow({ where: { id } });
  await prisma.$transaction([
    prisma.timeTopic.update({ where: { id }, data }),
    prisma.timeEntry.updateMany({ where: { topic: current.name }, data: { topic: data.name } }),
  ]);
}

// Ore registrate quando il socio non aveva ancora un costo orario: prendono quello nuovo.
export async function applyRateToUnpricedEntries(partnerId: string, hourlyRateCents: number) {
  if (hourlyRateCents <= 0) return 0;
  const result = await prisma.timeEntry.updateMany({
    where: { partnerId, hourlyRateCents: 0 },
    data: { hourlyRateCents },
  });
  return result.count;
}
