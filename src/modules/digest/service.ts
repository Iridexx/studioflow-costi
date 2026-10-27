import { prisma } from "@/lib/db";
import { buildDigest } from "@/modules/digest/build";
import { DEFAULT_DIGEST_TIME, dueDay, parseTime, romeClock } from "@/modules/digest/schedule";
import { isMailConfigured, sendMail } from "@/modules/mail/service";
import { listContributions } from "@/modules/contributions/service";
import { listExpenses, listUnapprovedExpenses } from "@/modules/expenses/service";
import { listPartners } from "@/modules/partners/service";
import { getAppUrl } from "@/modules/settings/service";
import { hoursByPartner, partnerBalances, pendingExpensesTotal } from "@/modules/summary/calc";
import { listAllTimeEntries } from "@/modules/time/service";

// Riepilogo email ai soci con le spese e le ore inserite nella giornata. Parte da solo all'orario
// scelto in Impostazioni (di base 23:55), solo nei giorni in cui c'è qualcosa di nuovo.

const ENABLED = "digestEnabled";
const TIME = "digestTime";
const LAST_DAY = "digestLastDay";
const LAST_AT = "digestLastAt";
const LAST_RESULT = "digestLastResult";

async function getSetting(key: string) {
  return (await prisma.setting.findUnique({ where: { key } }))?.value ?? null;
}

async function setSetting(key: string, value: string) {
  await prisma.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
}

export async function getDigestSettings() {
  const [enabled, time, lastResult] = await Promise.all([
    getSetting(ENABLED),
    getSetting(TIME),
    getSetting(LAST_RESULT),
  ]);
  return {
    enabled: enabled !== "false",
    time: time && parseTime(time) !== null ? time : DEFAULT_DIGEST_TIME,
    lastResult,
  };
}

export async function saveDigestSettings(enabled: boolean, time: string) {
  await setSetting(ENABLED, String(enabled));
  await setSetting(TIME, time);
}

// Chi riceve il riepilogo: i soci attivi con un'email.
async function recipients() {
  const partners = await prisma.partner.findMany({
    where: { active: true, email: { not: null } },
    select: { email: true },
  });
  return partners.map((p) => p.email!).filter(Boolean);
}

// Totali dei conti a oggi, come nella pagina Riepilogo.
async function currentStatus(today: Date) {
  const [expenses, unapproved, partners, contributions, entries] = await Promise.all([
    listExpenses(),
    listUnapprovedExpenses(),
    listPartners(),
    listContributions(),
    listAllTimeEntries(),
  ]);
  return {
    spentCents: partnerBalances(partners, expenses, contributions, today).spentCents,
    pendingExpenses: pendingExpensesTotal(unapproved),
    hours: hoursByPartner(partners, entries).total,
  };
}

// Spedisce il riepilogo di quanto è stato inserito dopo `since`. Restituisce un messaggio.
export async function sendDigest(day: string, since: Date, until: Date): Promise<string> {
  const [expenses, entries, status] = await Promise.all([
    prisma.expense.findMany({
      where: { createdAt: { gt: since, lte: until } },
      include: { createdBy: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.timeEntry.findMany({
      where: { createdAt: { gt: since, lte: until } },
      include: { partner: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    currentStatus(new Date(`${day}T00:00:00Z`)),
  ]);
  const digest = buildDigest({
    day,
    appUrl: (await getAppUrl()) ?? "http://localhost:3100",
    status,
    expenses: expenses.map((e) => ({
      date: e.date,
      description: e.description,
      amountCents: e.amountCents,
      recurrence: e.recurrence,
      createdBy: e.createdBy.name,
      approved: !!e.approvedAt,
    })),
    timeEntries: entries.map((t) => ({
      date: t.date,
      partner: t.partner.name,
      minutes: t.minutes,
      topic: t.topic,
      valueCents: Math.round((t.minutes * t.hourlyRateCents) / 60),
      approved: !!t.approvedAt,
    })),
  });
  if (!digest) return "Niente di nuovo: nessuna email spedita.";
  if (!(await isMailConfigured()))
    return "Non spedito: l'invio delle email non è impostato (Impostazioni → Invio email).";
  const to = await recipients();
  if (to.length === 0) return "Non spedito: nessun socio ha un'email.";
  await sendMail({ to: to.join(", "), subject: digest.subject, text: digest.body });
  return `Spedito a ${to.join(", ")}.`;
}

// Controllata ogni minuto dal programma: spedisce se è l'ora e non l'ha già fatto.
export async function runDigestIfDue(now = new Date()) {
  const settings = await getDigestSettings();
  if (!settings.enabled) return;
  const sendAt = parseTime(settings.time) ?? parseTime(DEFAULT_DIGEST_TIME)!;
  const day = dueDay(romeClock(now), sendAt, await getSetting(LAST_DAY));
  if (!day) return;
  const lastAt = await getSetting(LAST_AT);
  // La prima volta si parte dalle ultime 24 ore.
  const since = lastAt ? new Date(lastAt) : new Date(now.getTime() - 24 * 60 * 60 * 1000);
  // Si segna prima di spedire: se l'invio non riesce non si riprova ogni minuto.
  await setSetting(LAST_DAY, day);
  await setSetting(LAST_AT, now.toISOString());
  let result: string;
  try {
    result = await sendDigest(day, since, now);
  } catch (error) {
    result = `Non spedito: ${error instanceof Error ? error.message : "errore sconosciuto"}`;
  }
  await setSetting(LAST_RESULT, `${day}: ${result}`);
}
