import { describe, expect, it } from "vitest";
import {
  addMonths,
  chargeDates,
  fixedMonthlyCost,
  forecast,
  hoursByPartner,
  monthlyTotals,
  partnerBalances,
  pendingExpensesTotal,
  settlements,
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

  it("il piano per lo sviluppo si divide 70% Parte B e 30% Parte A", () => {
    const partners = [
      { id: "a", name: "A", shareBasisPoints: 7000, agreementRole: "A" as const },
      { id: "b", name: "B", shareBasisPoints: 3000, agreementRole: "B" as const },
    ];
    const items = [
      expense({ amountCents: 10000, date: d("2026-05-01") }),
      expense({
        amountCents: 10980,
        date: d("2026-05-02"),
        paidById: "b",
        partyBShareBasisPoints: 7000,
      }),
    ];
    const r = partnerBalances(partners, items, [], today);
    expect(r.balances[0].dueCents).toBe(7000 + 3294);
    expect(r.balances[1].dueCents).toBe(3000 + 7686);
    expect(r.balances[1].balanceCents).toBe(10980 - 10686);
    expect(r.partiesMissing).toBe(false);
  });

  it("senza Parte A e Parte B scelte si divide secondo le quote", () => {
    const partners = [
      { id: "a", name: "A", shareBasisPoints: 7000 },
      { id: "b", name: "B", shareBasisPoints: 3000 },
    ];
    const items = [
      expense({ amountCents: 10000, date: d("2026-05-02"), partyBShareBasisPoints: 7000 }),
    ];
    const r = partnerBalances(partners, items, [], today);
    expect(r.balances.map((b) => b.dueCents)).toEqual([7000, 3000]);
    expect(r.partiesMissing).toBe(true);
  });

  it("una spesa a carico della Parte B pagata dalla Parte A: B la rimborsa", () => {
    const partners = [
      { id: "a", name: "A", shareBasisPoints: 7000, agreementRole: "A" as const },
      { id: "b", name: "B", shareBasisPoints: 3000, agreementRole: "B" as const },
    ];
    const items = [
      expense({
        amountCents: 2440,
        date: d("2026-05-02"),
        paidById: "a",
        partyBShareBasisPoints: 10000,
      }),
    ];
    const r = partnerBalances(partners, items, [], today);
    expect(r.balances[0].balanceCents).toBe(2440);
    expect(r.balances[1].balanceCents).toBe(-2440);
  });

  it("la Parte A paga tutto Claude: la Parte B le deve il 70%", () => {
    const partners = [
      { id: "a", name: "A", shareBasisPoints: 7000, agreementRole: "A" as const },
      { id: "b", name: "B", shareBasisPoints: 3000, agreementRole: "B" as const },
    ];
    const items = [
      expense({
        amountCents: 10980,
        date: d("2026-05-02"),
        paidById: "a",
        partyBShareBasisPoints: 7000,
      }),
    ];
    const s = settlements(partnerBalances(partners, items, [], today).balances);
    expect(s).toHaveLength(1);
    expect(s[0].from.id).toBe("b");
    expect(s[0].to.id).toBe("a");
    expect(s[0].cents).toBe(7686);
  });
});

describe("costo delle ore", () => {
  const partners = [
    { id: "a", name: "Marco", shareBasisPoints: 7000 },
    { id: "b", name: "Steve", shareBasisPoints: 3000 },
    { id: "c", name: "Senza ore", shareBasisPoints: 0 },
  ];
  const entry = (partnerId: string, minutes: number, approved: boolean, date = "2026-10-20") => ({
    partnerId,
    date: d(date),
    minutes,
    hourlyRateCents: 6000,
    approvedAt: approved ? d(date) : null,
  });
  const entries = [
    entry("a", 90, true),
    entry("a", 60, false),
    entry("b", 30, true),
    entry("b", 120, true, "2025-06-01"),
  ];

  it("separa ore confermate e da confermare, per socio e in totale", () => {
    const { rows, total } = hoursByPartner(partners, entries);
    expect(rows.map((r) => r.partner.id)).toEqual(["a", "b"]);
    expect(rows[0]).toMatchObject({
      confirmedMinutes: 90,
      confirmedCents: 9000,
      pendingMinutes: 60,
      pendingCents: 6000,
    });
    expect(total).toEqual({
      confirmedMinutes: 240,
      confirmedCents: 24000,
      pendingMinutes: 60,
      pendingCents: 6000,
    });
  });

  it("con l'anno conta solo le ore di quell'anno", () => {
    expect(hoursByPartner(partners, entries, 2025).total.confirmedCents).toBe(12000);
  });
});

describe("spese da approvare", () => {
  it("somma gli importi", () => {
    expect(pendingExpensesTotal([{ amountCents: 1000 }, { amountCents: 2500 }])).toEqual({
      count: 2,
      cents: 3500,
    });
  });
});
