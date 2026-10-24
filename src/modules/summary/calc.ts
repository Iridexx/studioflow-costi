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

export type PartnerLike = { id: string; name: string; shareBasisPoints: number };
export type ContributionLike = { partnerId: string; amountCents: number; date: Date };

export type PartnerBalance = {
  partner: PartnerLike;
  // Quota delle spese che gli spetta.
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
): { balances: PartnerBalance[]; spentCents: number; cashCents: number; sharesTotal: number } {
  const past = charges(expenses, EPOCH, today);
  const spentCents = sum(past.map((c) => c.expense.amountCents));
  const counted = contributions.filter((c) => c.date <= today);
  const balances = partners.map((partner) => {
    const dueCents = Math.round((spentCents * partner.shareBasisPoints) / 10000);
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
  };
}
