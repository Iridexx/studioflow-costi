import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";
import { FormError } from "@/lib/form";
import { formatDay } from "@/lib/format";
import { isFullyApproved, missingApprovers } from "@/modules/expenses/approval";
import { listApprovers } from "@/modules/expenses/service";
import type { Parties, PartyData } from "./render";

// La prima versione dell'accordo nasce da docs/accordo-soci.md alla prima apertura della pagina;
// da lì in poi il testo vive nel database e lo modificano i soci.
async function ensureFirstVersion() {
  if ((await prisma.agreementVersion.count()) > 0) return;
  const text = await readFile(path.join(process.cwd(), "docs", "accordo-soci.md"), "utf8");
  await prisma.agreementVersion
    .create({ data: { number: 1, text, note: "Bozza iniziale" } })
    // Due pagine aperte insieme: la seconda trova la versione già creata.
    .catch(() => undefined);
}

const versionInclude = {
  author: { select: { name: true } },
  approvals: { include: { partner: { select: { name: true } } }, orderBy: { createdAt: "asc" } },
} as const;

type Approval = { partnerId: string; kind: "VALIDATE" | "REOPEN" };

// Chi ha convalidato la versione e chi è d'accordo a riaprirla.
export function approvalsOf<A extends Approval>(approvals: A[], kind: Approval["kind"]) {
  return approvals.filter((a) => a.kind === kind);
}

const idsOf = (approvals: Approval[], kind: Approval["kind"]) =>
  approvalsOf(approvals, kind).map((a) => a.partnerId);

// L'accordo è tra almeno due soci: con uno solo che può entrare resta una bozza. Se un socio non
// può più entrare (disattivato, senza password) la sua convalida non serve più.
// Una richiesta di riapertura confermata da tutti crea una versione nuova con lo stesso testo,
// da modificare e convalidare di nuovo; quella definitiva resta nell'elenco come riaperta.
async function settle(versionId: string) {
  const [version, approvers] = await Promise.all([
    prisma.agreementVersion.findUnique({ where: { id: versionId }, include: { approvals: true } }),
    listApprovers(),
  ]);
  if (!version || approvers.length < 2) return;
  if (!version.finalizedAt) {
    if (isFullyApproved(approvers, idsOf(version.approvals, "VALIDATE")))
      await prisma.agreementVersion.update({
        where: { id: versionId },
        data: { finalizedAt: new Date() },
      });
    return;
  }
  if (
    version.reopenRequestedAt &&
    !version.reopenedAt &&
    isFullyApproved(approvers, idsOf(version.approvals, "REOPEN"))
  ) {
    const requester = approvalsOf(version.approvals, "REOPEN").sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    )[0];
    await prisma.$transaction([
      prisma.agreementVersion.update({
        where: { id: versionId },
        data: { reopenedAt: new Date() },
      }),
      prisma.agreementVersion.create({
        data: {
          number: version.number + 1,
          text: version.text,
          note: `Accordo riaperto: ${version.reopenReason}`,
          authorId: requester?.partnerId,
        },
      }),
    ]);
  }
}

export async function getLatestVersion() {
  await ensureFirstVersion();
  const latest = await prisma.agreementVersion.findFirstOrThrow({ orderBy: { number: "desc" } });
  await settle(latest.id);
  const [version, approvers] = await Promise.all([
    prisma.agreementVersion.findFirstOrThrow({
      orderBy: { number: "desc" },
      include: versionInclude,
    }),
    listApprovers(),
  ]);
  const missing = version.finalizedAt
    ? []
    : missingApprovers(approvers, idsOf(version.approvals, "VALIDATE"));
  // Con una richiesta di riapertura in corso: chi deve ancora dire di sì.
  const missingReopen =
    version.reopenRequestedAt && !version.reopenedAt
      ? missingApprovers(approvers, idsOf(version.approvals, "REOPEN"))
      : [];
  return { version, missing, missingReopen, approversCount: approvers.length };
}

export async function listVersions() {
  await ensureFirstVersion();
  return prisma.agreementVersion.findMany({ orderBy: { number: "desc" }, include: versionInclude });
}

// Una versione e quella prima, per mostrare cosa è cambiato.
export async function getVersionWithPrevious(number: number) {
  const [version, previous] = await Promise.all([
    prisma.agreementVersion.findUnique({ where: { number }, include: versionInclude }),
    prisma.agreementVersion.findFirst({
      where: { number: { lt: number } },
      orderBy: { number: "desc" },
    }),
  ]);
  return { version, previous };
}

export async function saveAgreementVersion(
  input: { text: string; note: string; baseNumber: number },
  authorId: string,
) {
  const { version: latest } = await getLatestVersion();
  if (latest.finalizedAt)
    throw new FormError(
      "L'accordo è definitivo: per modificarlo va prima riaperto con il consenso di tutti i soci.",
    );
  // Chi modificava una versione vecchia perderebbe le modifiche dell'altro socio.
  if (latest.number !== input.baseNumber)
    throw new FormError(
      `Nel frattempo ${latest.author?.name ?? "un socio"} ha salvato la versione ${latest.number}. Copia da parte le tue modifiche e riapri la pagina.`,
    );
  if (latest.text.trim() === input.text.trim())
    throw new FormError("Il testo è uguale alla versione attuale: non c'è niente da salvare.");
  const version = await prisma.agreementVersion
    .create({
      data: {
        number: latest.number + 1,
        text: input.text,
        note: input.note,
        authorId,
        approvals: { create: { partnerId: authorId } },
      },
    })
    .catch(() => {
      // Due soci hanno salvato nello stesso istante: il numero è già preso.
      throw new FormError("Un altro socio ha appena salvato una versione: riapri la pagina.");
    });
  await settle(version.id);
  return version;
}

async function addApproval(versionId: string, partnerId: string, kind: Approval["kind"]) {
  await prisma.agreementApproval.upsert({
    where: { versionId_partnerId_kind: { versionId, partnerId, kind } },
    create: { versionId, partnerId, kind },
    update: {},
  });
  await settle(versionId);
}

async function latestOrStale(versionId: string) {
  const { version } = await getLatestVersion();
  if (version.id !== versionId)
    throw new FormError("Nel frattempo l'accordo è cambiato: riapri la pagina.");
  return version;
}

export async function approveAgreementVersion(versionId: string, partnerId: string) {
  const version = await latestOrStale(versionId);
  if (!version.finalizedAt) await addApproval(versionId, partnerId, "VALIDATE");
}

export async function requestReopen(versionId: string, partnerId: string, reason: string) {
  const version = await latestOrStale(versionId);
  if (!version.finalizedAt) throw new FormError("L'accordo è ancora una bozza: si può modificare.");
  if (version.reopenRequestedAt) throw new FormError("C'è già una richiesta di riapertura.");
  await prisma.agreementVersion.update({
    where: { id: versionId },
    data: { reopenReason: reason, reopenRequestedAt: new Date() },
  });
  await addApproval(versionId, partnerId, "REOPEN");
}

export async function agreeReopen(versionId: string, partnerId: string) {
  const version = await latestOrStale(versionId);
  if (!version.reopenRequestedAt) throw new FormError("Nessuno ha chiesto di riaprire l'accordo.");
  await addApproval(versionId, partnerId, "REOPEN");
}

// Chi ha chiesto la riapertura (o chi non è d'accordo) la ritira: l'accordo resta definitivo.
export async function cancelReopen(versionId: string) {
  await latestOrStale(versionId);
  await prisma.$transaction([
    prisma.agreementApproval.deleteMany({ where: { versionId, kind: "REOPEN" } }),
    prisma.agreementVersion.update({
      where: { id: versionId },
      data: { reopenReason: null, reopenRequestedAt: null },
    }),
  ]);
}

// 1 se l'ultima versione aspetta il socio (convalida o riapertura), per l'avviso in alto.
export async function countAgreementWaitingFor(partnerId: string) {
  const latest = await prisma.agreementVersion.findFirst({
    orderBy: { number: "desc" },
    include: { approvals: { select: { partnerId: true, kind: true } } },
  });
  if (!latest) return 0;
  const kind = latest.finalizedAt ? "REOPEN" : "VALIDATE";
  if (kind === "REOPEN" && !latest.reopenRequestedAt) return 0;
  const approvers = await listApprovers();
  const waiting = missingApprovers(approvers, idsOf(latest.approvals, kind));
  return waiting.some((p) => p.id === partnerId) ? 1 : 0;
}

export type AgreementDataInput = {
  taxCode: string | null;
  birthPlace: string | null;
  birthDate: Date | null;
  residence: string | null;
};

export async function getAgreementParties(): Promise<Parties> {
  const partners = await prisma.partner.findMany({ where: { agreementRole: { not: null } } });
  const toParty = (role: "A" | "B"): PartyData | null => {
    const p = partners.find((x) => x.agreementRole === role);
    if (!p) return null;
    return {
      nome: p.name,
      codiceFiscale: p.taxCode,
      luogoNascita: p.birthPlace,
      dataNascita: p.birthDate ? formatDay(p.birthDate) : null,
      residenza: p.residence,
    };
  };
  return { A: toParty("A"), B: toParty("B") };
}

// Ogni socio compila i propri dati; l'amministratore può correggere quelli di tutti.
export async function updateAgreementData(partnerId: string, input: AgreementDataInput) {
  await prisma.partner.update({ where: { id: partnerId }, data: input });
}

// Chi è la Parte A e chi la Parte B. Prima si tolgono i ruoli, poi si assegnano: un socio può
// avere un solo ruolo e ogni ruolo un solo socio.
export async function setAgreementRoles(roles: { A: string | null; B: string | null }) {
  await prisma.$transaction([
    prisma.partner.updateMany({
      where: { agreementRole: { not: null } },
      data: { agreementRole: null },
    }),
    ...(["A", "B"] as const)
      .filter((role) => roles[role])
      .map((role) =>
        prisma.partner.update({ where: { id: roles[role]! }, data: { agreementRole: role } }),
      ),
  ]);
}
