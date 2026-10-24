import { describe, expect, it } from "vitest";
import {
  addMonths,
  chargeDates,
  fixedMonthlyCost,
  forecast,
  monthlyTotals,
  partnerBalances,
  spentUntil,
  type ExpenseLike,
} from "./calc";

const d = (text: string) => new Date(`${text}T00:00:00.000Z`);

function expense(over: Partial<ExpenseLike>): ExpenseLike {
  return {
    id: Math.random().toString(),
    date: d("2026-01-15"),
    endDate: null,
    amountCents: 1000,
    recurrence: "ONE_OFF",
    categoryId: "c",
    paidById: null,
    ...over,
  };
}

describe("addMonths", () => {
  it("usa l'ultimo giorno se il mese è più corto", () => {
    expect(addMonths(d("2026-01-31"), 1)).toEqual(d("2026-02-28"));
    expect(addMonths(d("2026-01-31"), 2)).toEqual(d("2026-03-31"));
  });
});

describe("chargeDates", () => {
  it("ripete ogni mese fino alla data di fine", () => {
    const e = expense({ recurrence: "MONTHLY", endDate: d("2026-04-01") });
    expect(chargeDates(e, d("2026-01-01"), d("2026-12-31"))).toEqual([
      d("2026-01-15"),
      d("2026-02-15"),
      d("2026-03-15"),
    ]);
  });

  it("le annuali una volta all'anno", () => {
    const e = expense({ recurrence: "YEARLY" });
    expect(chargeDates(e, d("2026-01-01"), d("2028-06-30"))).toHaveLength(3);
  });
});

describe("riepilogo", () => {
  const today = d("2026-10-24");
  const expenses = [
    expense({ amountCents: 2000, recurrence: "MONTHLY", date: d("2026-08-01") }),
    expense({ amountCents: 12000, recurrence: "YEARLY", date: d("2026-03-10") }),
    expense({ amountCents: 50000, date: d("2026-05-05"), paidById: "a" }),
    expense({ amountCents: 9900, date: d("2026-11-20") }),
  ];

  it("speso fino a oggi", () => {
    // 3 mensili (ago, set, ott) + 1 annuale + una tantum di maggio.
    expect(spentUntil(expenses, today)).toBe(6000 + 12000 + 50000);
  });

  it("spese per mese", () => {
    const months = monthlyTotals(expenses, 2026);
    expect(months[4]).toBe(50000);
    expect(months[10]).toBe(2000 + 9900);
  });

  it("costi fissi mensili", () => {
    expect(fixedMonthlyCost(expenses, today)).toBe(2000 + 1000);
  });

  it("previsione a 12 mesi", () => {
    // 12 mensili (nov..ott), 1 annuale (marzo 2027), una tantum di novembre.
    expect(forecast(expenses, today)).toBe(12 * 2000 + 12000 + 9900);
  });

  it("saldo tra soci e cassa comune", () => {
    const partners = [
      { id: "a", name: "A", shareBasisPoints: 5000 },
      { id: "b", name: "B", shareBasisPoints: 5000 },
    ];
    const contributions = [{ partnerId: "b", amountCents: 30000, date: d("2026-02-01") }];
    const r = partnerBalances(partners, expenses, contributions, today);
    expect(r.spentCents).toBe(68000);
    expect(r.balances[0].balanceCents).toBe(50000 - 34000);
    expect(r.balances[1].balanceCents).toBe(30000 - 34000);
    expect(r.cashCents).toBe(30000 - 18000);
    expect(r.sharesTotal).toBe(10000);
  });
});
