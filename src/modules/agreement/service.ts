import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";
import { formatDay } from "@/lib/format";
import type { Parties, PartyData } from "./render";

// Il testo dell'accordo sta in docs/accordo-soci.md: si legge a ogni apertura della pagina, così
// una nuova versione arriva con il normale aggiornamento del programma.
export function loadAgreementText() {
  return readFile(path.join(process.cwd(), "docs", "accordo-soci.md"), "utf8");
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
