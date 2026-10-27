import { prisma } from "@/lib/db";

const PILOT_STUDIOS = "pilotStudios";

// Numero di studi pilota, per calcolare il costo per studio nel riepilogo (0 = non mostrato).
export async function getPilotStudios(): Promise<number> {
  const row = await prisma.setting.findUnique({ where: { key: PILOT_STUDIOS } });
  const n = Number(row?.value ?? 0);
  return Number.isInteger(n) && n > 0 ? n : 0;
}

export async function setPilotStudios(value: number) {
  await prisma.setting.upsert({
    where: { key: PILOT_STUDIOS },
    create: { key: PILOT_STUDIOS, value: String(value) },
    update: { value: String(value) },
  });
}

const APP_URL = "appUrl";

// Indirizzo con cui i soci aprono il programma (es. http://nome-pc:3100), per l'email d'invito.
export async function getAppUrl(): Promise<string | null> {
  const row = await prisma.setting.findUnique({ where: { key: APP_URL } });
  return row?.value || null;
}

export async function setAppUrl(value: string | null) {
  if (!value) {
    await prisma.setting.deleteMany({ where: { key: APP_URL } });
    return;
  }
  await prisma.setting.upsert({
    where: { key: APP_URL },
    create: { key: APP_URL, value },
    update: { value },
  });
}

const ATTACHMENT_REQUIRED = "expenseAttachmentRequired";

// Allegato (ricevuta o giustificativo) obbligatorio per registrare una spesa. Di base sì.
export async function getAttachmentRequired(): Promise<boolean> {
  const row = await prisma.setting.findUnique({ where: { key: ATTACHMENT_REQUIRED } });
  return row?.value !== "false";
}

export async function setAttachmentRequired(value: boolean) {
  await prisma.setting.upsert({
    where: { key: ATTACHMENT_REQUIRED },
    create: { key: ATTACHMENT_REQUIRED, value: String(value) },
    update: { value: String(value) },
  });
}
