import { prisma } from "@/lib/db";

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

export function listTimeEntries() {
  return prisma.timeEntry.findMany({ include, orderBy: [{ date: "desc" }, { createdAt: "desc" }] });
}

export function getTimeEntry(id: string) {
  return prisma.timeEntry.findUnique({ where: { id }, include });
}

// Il costo orario si fissa al momento della registrazione.
export async function createTimeEntry(input: TimeEntryInput, createdById: string) {
  const partner = await prisma.partner.findUniqueOrThrow({ where: { id: input.partnerId } });
  return prisma.timeEntry.create({
    data: { ...input, hourlyRateCents: partner.hourlyRateCents, createdById },
  });
}

export async function updateTimeEntry(id: string, input: TimeEntryInput, hourlyRateCents: number) {
  return prisma.timeEntry.update({ where: { id }, data: { ...input, hourlyRateCents } });
}

export function deleteTimeEntry(id: string) {
  return prisma.timeEntry.delete({ where: { id } });
}

// Argomenti già usati, da proporre mentre si scrive.
export async function listTopics() {
  const rows = await prisma.timeEntry.findMany({
    distinct: ["topic"],
    select: { topic: true },
    orderBy: { topic: "asc" },
  });
  return rows.map((r) => r.topic);
}
