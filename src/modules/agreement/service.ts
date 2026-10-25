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

// L'accordo è tra almeno due soci: con uno solo che può entrare resta una bozza. Se un socio non
// può più entrare (disattivato, senza password) la sua convalida non serve più.
async function settle(versionId: string) {
  const [version, approvers] = await Promise.all([
    prisma.agreementVersion.findUnique({ where: { id: versionId }, include: { approvals: true } }),
    listApprovers(),
  ]);
  if (!version || version.finalizedAt) return;
  if (
    approvers.length >= 2 &&
    isFullyApproved(
      approvers,
      version.approvals.map((a) => a.partnerId),
    )
  )
    await prisma.agreementVersion.update({
      where: { id: versionId },
      data: { finalizedAt: new Date() },
    });
}

export async function getLatestVersion() {
  await ensureFirstVersion();
  const latest = await prisma.agreementVersion.findFirstOrThrow({ orderBy: { number: "desc" } });
  await settle(latest.id);
  const [version, approvers] = await Promise.all([
    prisma.agreementVersion.findUniqueOrThrow({
      where: { id: latest.id },
      include: versionInclude,
    }),
    listApprovers(),
  ]);
  const missing = version.finalizedAt
    ? []
    : missingApprovers(
        approvers,
        version.approvals.map((a) => a.partnerId),
      );
  return { version, missing, approversCount: approvers.length };
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
    throw new FormError("L'accordo è già stato convalidato da tutti i soci: non si modifica più.");
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

export async function approveAgreementVersion(versionId: string, partnerId: string) {
  const { version: latest } = await getLatestVersion();
  if (latest.id !== versionId)
    throw new FormError("Nel frattempo è stata salvata una versione nuova: convalida quella.");
  if (latest.finalizedAt) return;
  await prisma.agreementApproval.upsert({
    where: { versionId_partnerId: { versionId, partnerId } },
    create: { versionId, partnerId },
    update: {},
  });
  await settle(versionId);
}

// 1 se l'ultima versione aspetta la convalida del socio, per l'avviso in alto nelle pagine.
export async function countAgreementWaitingFor(partnerId: string) {
  const latest = await prisma.agreementVersion.findFirst({
    orderBy: { number: "desc" },
    include: { approvals: { select: { partnerId: true } } },
  });
  if (!latest || latest.finalizedAt) return 0;
  const approvers = await listApprovers();
  const waiting = missingApprovers(
    approvers,
    latest.approvals.map((a) => a.partnerId),
  );
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
