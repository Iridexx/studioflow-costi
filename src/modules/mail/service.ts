import nodemailer from "nodemailer";
import { prisma } from "@/lib/db";
import { explainMailError } from "@/modules/mail/providers";

// Casella da cui il programma spedisce le email (es. le credenziali dei soci). Si imposta da
// Impostazioni, senza toccare file; la password resta nel database del programma e non viene mai
// mostrata nelle pagine.
export type MailSettings = {
  provider: string;
  host: string;
  port: number;
  user: string;
  password: string;
  fromName: string;
};

const KEY = "mail";

export async function getMailSettings(): Promise<MailSettings | null> {
  const row = await prisma.setting.findUnique({ where: { key: KEY } });
  if (!row) return null;
  try {
    const value = JSON.parse(row.value) as MailSettings;
    return value.user && value.password && value.host ? value : null;
  } catch {
    return null;
  }
}

export async function saveMailSettings(settings: MailSettings) {
  const value = JSON.stringify(settings);
  await prisma.setting.upsert({
    where: { key: KEY },
    create: { key: KEY, value },
    update: { value },
  });
}

export async function deleteMailSettings() {
  await prisma.setting.deleteMany({ where: { key: KEY } });
}

export async function isMailConfigured() {
  return (await getMailSettings()) !== null;
}

// Spedisce un'email; in caso di errore lancia un messaggio comprensibile.
export async function sendMail(
  message: { to: string; subject: string; text: string; replyTo?: string },
  settings?: MailSettings,
) {
  const s = settings ?? (await getMailSettings());
  if (!s)
    throw new Error("L'invio delle email non è ancora impostato (Impostazioni → Invio email).");
  const transport = nodemailer.createTransport({
    host: s.host,
    port: s.port,
    secure: s.port === 465,
    auth: { user: s.user, pass: s.password },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  });
  try {
    await transport.sendMail({
      from: s.fromName ? { name: s.fromName, address: s.user } : s.user,
      to: message.to,
      replyTo: message.replyTo,
      subject: message.subject,
      text: message.text,
    });
  } catch (error) {
    throw new Error(explainMailError(error));
  }
}
