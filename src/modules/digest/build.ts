// Testo dell'email di riepilogo con le spese e le ore inserite, senza database.
import { formatDay, formatEuro, formatHours } from "@/lib/format";
import { RECURRENCE_LABEL } from "@/lib/labels";

export type DigestExpense = {
  date: Date;
  description: string;
  amountCents: number;
  recurrence: string;
  createdBy: string;
  approved: boolean;
};

export type DigestTimeEntry = {
  date: Date;
  partner: string;
  minutes: number;
  topic: string;
  valueCents: number;
  approved: boolean;
};

export function buildDigest(input: {
  day: string;
  expenses: DigestExpense[];
  timeEntries: DigestTimeEntry[];
  appUrl: string;
}): { subject: string; body: string } | null {
  const { expenses, timeEntries } = input;
  if (expenses.length === 0 && timeEntries.length === 0) return null;
  const day = formatDay(new Date(`${input.day}T00:00:00Z`));
  const lines: string[] = [`Riepilogo di StudioFlow Costi del ${day}.`, ""];
  if (expenses.length > 0) {
    lines.push(`SPESE NUOVE (${expenses.length})`);
    for (const e of expenses)
      lines.push(
        `- ${formatDay(e.date)} · ${e.description} · ${formatEuro(e.amountCents)} · ${RECURRENCE_LABEL[e.recurrence] ?? e.recurrence} · inserita da ${e.createdBy} · ${e.approved ? "approvata" : "da approvare"}`,
      );
    lines.push("");
  }
  if (timeEntries.length > 0) {
    const minutes = timeEntries.reduce((a, t) => a + t.minutes, 0);
    lines.push(`ORE NUOVE (${formatHours(minutes)})`);
    for (const t of timeEntries)
      lines.push(
        `- ${formatDay(t.date)} · ${t.partner} · ${formatHours(t.minutes)} · ${t.topic} · ${formatEuro(t.valueCents)} · ${t.approved ? "confermate" : "da confermare"}`,
      );
    lines.push("");
  }
  const pending =
    expenses.filter((e) => !e.approved).length + timeEntries.filter((t) => !t.approved).length;
  if (pending > 0)
    lines.push(`Ci sono voci da approvare o confermare: aprile su ${input.appUrl}`, "");
  else lines.push(`Il programma: ${input.appUrl}`, "");
  lines.push("Email automatica: l'orario di invio si cambia in Impostazioni.");
  const parts = [
    expenses.length ? `${expenses.length} ${expenses.length === 1 ? "spesa" : "spese"}` : "",
    timeEntries.length
      ? `${timeEntries.length} ${timeEntries.length === 1 ? "registrazione di ore" : "registrazioni di ore"}`
      : "",
  ].filter(Boolean);
  return { subject: `StudioFlow Costi, ${day}: ${parts.join(" e ")}`, body: lines.join("\n") };
}
