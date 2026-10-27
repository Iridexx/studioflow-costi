// Calcoli del riepilogo, senza database: le voci ricorrenti si espandono nei singoli addebiti.

export type Recurrence = "ONE_OFF" | "MONTHLY" | "YEARLY";

export type ExpenseLike = {
  id: string;
  date: Date;
  endDate: Date | null;
  amountCents: number;
  recurrence: Recurrence;
  categoryId: string;
  paidById: string | null;
  // Parte del costo della Parte B dell'accordo (il resto è della Parte A); vuoto = secondo le quote.
  partyBShareBasisPoints?: number | null;
};

export type Charge<E extends ExpenseLike = ExpenseLike> = { expense: E; date: Date };

// Stesso giorno del mese n mesi dopo; se il mese è più corto, l'ultimo giorno (31 gen -> 28 feb).
export function addMonths(date: Date, months: number): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + months;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(date.getUTCDate(), lastDay)));
}

// Date degli addebiti di una voce tra from e to (compresi).
export function chargeDates(expense: ExpenseLike, from: Date, to: Date): Date[] {
  const last = expense.endDate && expense.endDate < to ? expense.endDate : to;
  if (expense.recurrence === "ONE_OFF") {
    return expense.date >= from && expense.date <= to ? [expense.date] : [];
  }
  const step = expense.recurrence === "MONTHLY" ? 1 : 12;
  const dates: Date[] = [];
  for (let i = 0; ; i += step) {
    const date = addMonths(expense.date, i);
    if (date > last) break;
    if (date >= from) dates.push(date);
  }
  return dates;
}

export function charges<E extends ExpenseLike>(expenses: E[], from: Date, to: Date): Charge<E>[] {
  return expenses
    .flatMap((expense) => chargeDates(expense, from, to).map((date) => ({ expense, date })))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
const EPOCH = new Date(Date.UTC(1970, 0, 1));

// Totale speso fino a oggi compreso.
export function spentUntil(expenses: ExpenseLike[], today: Date): number {
  return sum(charges(expenses, EPOCH, today).map((c) => c.expense.amountCents));
}

// Spesa di ogni mese di un anno (12 valori).
export function monthlyTotals(expenses: ExpenseLike[], year: number): number[] {
  const totals = Array<number>(12).fill(0);
  const from = new Date(Date.UTC(year, 0, 1));
  const to = new Date(Date.UTC(year, 11, 31));
  for (const c of charges(expenses, from, to))
    totals[c.date.getUTCMonth()] += c.expense.amountCents;
  return totals;
}

export function categoryTotals(expenses: ExpenseLike[], from: Date, to: Date): Map<string, number> {
  const totals = new Map<string, number>();
  for (const c of charges(expenses, from, to)) {
    totals.set(
      c.expense.categoryId,
      (totals.get(c.expense.categoryId) ?? 0) + c.expense.amountCents,
    );
  }
  return totals;
}

// Voci ricorrenti attive oggi.
export function activeRecurring<E extends ExpenseLike>(expenses: E[], today: Date): E[] {
  return expenses.filter(
    (e) =>
      e.recurrence !== "ONE_OFF" && e.date <= today && (e.endDate === null || e.endDate >= today),
  );
}

// Costi fissi al mese: ricorrenti mensili più annuali divise per 12.
export function fixedMonthlyCost(expenses: ExpenseLike[], today: Date): number {
  return sum(
    activeRecurring(expenses, today).map((e) =>
      e.recurrence === "MONTHLY" ? e.amountCents : Math.round(e.amountCents / 12),
    ),
  );
}

// Spese già previste nei prossimi mesi (ricorrenti e una tantum con data futura).
export function forecast(expenses: ExpenseLike[], today: Date, months = 12): number {
  const from = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  return sum(charges(expenses, from, addMonths(today, months)).map((c) => c.expense.amountCents));
}

export type PartnerLike = {
  id: string;
  name: string;
  shareBasisPoints: number;
  agreementRole?: "A" | "B" | null;
};
export type ContributionLike = { partnerId: string; amountCents: number; date: Date };

export type PartnerBalance = {
  partner: PartnerLike;
  // Quota delle spese che gli spetta (secondo le quote o, per alcune spese, secondo l'accordo).
  dueCents: number;
  // Spese pagate di tasca propria.
  paidCents: number;
  // Versamenti nella cassa comune.
  contributedCents: number;
  // Positivo: ha messo più della sua quota. Negativo: deve ancora mettere.
  balanceCents: number;
};

export function partnerBalances(
  partners: PartnerLike[],
  expenses: ExpenseLike[],
  contributions: ContributionLike[],
  today: Date,
): {
  balances: PartnerBalance[];
  spentCents: number;
  cashCents: number;
  sharesTotal: number;
  // Ci sono spese da dividere tra Parte A e Parte B ma le parti dell'accordo non sono scelte:
  // intanto si dividono secondo le quote.
  partiesMissing: boolean;
} {
  const past = charges(expenses, EPOCH, today);
  const spentCents = sum(past.map((c) => c.expense.amountCents));
  const counted = contributions.filter((c) => c.date <= today);
  const hasParties =
    partners.some((p) => p.agreementRole === "A") && partners.some((p) => p.agreementRole === "B");
  const byParties = past.filter((c) => hasParties && c.expense.partyBShareBasisPoints != null);
  const byShares = past.filter((c) => !byParties.includes(c));
  const sharedCents = sum(byShares.map((c) => c.expense.amountCents));
  const partyCents = (role: "A" | "B") =>
    sum(
      byParties.map((c) => {
        const b = c.expense.partyBShareBasisPoints!;
        return (c.expense.amountCents * (role === "B" ? b : 10000 - b)) / 10000;
      }),
    );
  const balances = partners.map((partner) => {
    const dueCents = Math.round(
      (sharedCents * partner.shareBasisPoints) / 10000 +
        (partner.agreementRole ? partyCents(partner.agreementRole) : 0),
    );
    const paidCents = sum(
      past.filter((c) => c.expense.paidById === partner.id).map((c) => c.expense.amountCents),
    );
    const contributedCents = sum(
      counted.filter((c) => c.partnerId === partner.id).map((c) => c.amountCents),
    );
    return {
      partner,
      dueCents,
      paidCents,
      contributedCents,
      balanceCents: paidCents + contributedCents - dueCents,
    };
  });
  // Cassa comune: versamenti meno spese pagate dalla cassa.
  const cashCents =
    sum(counted.map((c) => c.amountCents)) -
    sum(past.filter((c) => c.expense.paidById === null).map((c) => c.expense.amountCents));
  return {
    balances,
    spentCents,
    cashCents,
    sharesTotal: sum(partners.map((p) => p.shareBasisPoints)),
    partiesMissing: !hasParties && past.some((c) => c.expense.partyBShareBasisPoints != null),
  };
}

export type Settlement = { from: PartnerLike; to: PartnerLike; cents: number };

// Chi deve dare soldi a chi per pareggiare i saldi: chi è sotto restituisce a chi ha messo di più,
// a partire dagli importi più grandi.
export function settlements(balances: PartnerBalance[]): Settlement[] {
  const debtors = balances
    .filter((b) => b.balanceCents < 0)
    .map((b) => ({ partner: b.partner, cents: -b.balanceCents }))
    .sort((a, b) => b.cents - a.cents);
  const creditors = balances
    .filter((b) => b.balanceCents > 0)
    .map((b) => ({ partner: b.partner, cents: b.balanceCents }))
    .sort((a, b) => b.cents - a.cents);
  const result: Settlement[] = [];
  for (const d of debtors) {
    for (const c of creditors) {
      const cents = Math.min(d.cents, c.cents);
      if (cents <= 0) continue;
      result.push({ from: d.partner, to: c.partner, cents });
      d.cents -= cents;
      c.cents -= cents;
    }
  }
  return result;
}

export type TimeEntryLike = {
  partnerId: string;
  date: Date;
  minutes: number;
  hourlyRateCents: number;
  approvedAt: Date | null;
};

// Valore delle ore al costo orario fissato quando sono state registrate.
export function timeValueCents(entry: { minutes: number; hourlyRateCents: number }): number {
  return Math.round((entry.minutes * entry.hourlyRateCents) / 60);
}

export type HoursTotals = {
  confirmedMinutes: number;
  confirmedCents: number;
  pendingMinutes: number;
  pendingCents: number;
};

export type PartnerHours = HoursTotals & { partner: PartnerLike };

function hoursTotals(entries: TimeEntryLike[]): HoursTotals {
  const confirmed = entries.filter((e) => e.approvedAt);
  const pending = entries.filter((e) => !e.approvedAt);
  return {
    confirmedMinutes: sum(confirmed.map((e) => e.minutes)),
    confirmedCents: sum(confirmed.map(timeValueCents)),
    pendingMinutes: sum(pending.map((e) => e.minutes)),
    pendingCents: sum(pending.map(timeValueCents)),
  };
}

// Ore e loro costo per socio, separando le confermate da tutti da quelle ancora da confermare.
// Solo i soci con ore; con `year` solo le ore di quell'anno.
export function hoursByPartner<P extends PartnerLike>(
  partners: P[],
  entries: TimeEntryLike[],
  year?: number,
): { rows: (HoursTotals & { partner: P })[]; total: HoursTotals } {
  const counted =
    year === undefined ? entries : entries.filter((e) => e.date.getUTCFullYear() === year);
  const rows = partners
    .map((partner) => ({
      partner,
      ...hoursTotals(counted.filter((e) => e.partnerId === partner.id)),
    }))
    .filter((r) => r.confirmedMinutes > 0 || r.pendingMinutes > 0);
  return { rows, total: hoursTotals(counted) };
}

// Spese ancora da approvare: quante e per quanto (ogni voce per il suo importo, gli abbonamenti
// per una rata).
export function pendingExpensesTotal(expenses: { amountCents: number }[]): {
  count: number;
  cents: number;
} {
  return { count: expenses.length, cents: sum(expenses.map((e) => e.amountCents)) };
}
