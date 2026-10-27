import { describe, expect, it } from "vitest";
import { buildDigest } from "./build";
import { dueDay, parseTime, romeClock } from "./schedule";

describe("orario del riepilogo", () => {
  it("legge l'orario", () => {
    expect(parseTime("23:55")).toBe(23 * 60 + 55);
    expect(parseTime("7.30")).toBe(7 * 60 + 30);
    expect(parseTime("25:00")).toBeNull();
  });

  it("usa l'ora italiana", () => {
    // 22:55 UTC del 25 ottobre 2026 = 23:55 in Italia (ora solare dal 25/10).
    expect(romeClock(new Date("2026-10-25T22:55:00Z"))).toEqual({
      day: "2026-10-25",
      minutes: 23 * 60 + 55,
    });
  });

  const sendAt = 23 * 60 + 55;
  it("spedisce oggi passato l'orario, una volta sola", () => {
    expect(dueDay({ day: "2026-10-25", minutes: 23 * 60 + 54 }, sendAt, "2026-10-24")).toBeNull();
    expect(dueDay({ day: "2026-10-25", minutes: sendAt }, sendAt, "2026-10-24")).toBe("2026-10-25");
    expect(dueDay({ day: "2026-10-25", minutes: 23 * 60 + 59 }, sendAt, "2026-10-25")).toBeNull();
  });

  it("recupera il giorno perso se il PC era spento", () => {
    expect(dueDay({ day: "2026-10-26", minutes: 8 * 60 }, sendAt, "2026-10-24")).toBe("2026-10-25");
    // Recuperato ieri, stasera parte comunque quello di oggi.
    expect(dueDay({ day: "2026-10-26", minutes: sendAt }, sendAt, "2026-10-25")).toBe("2026-10-26");
  });
});

describe("testo del riepilogo", () => {
  it("niente email se non c'è niente di nuovo", () => {
    expect(buildDigest({ day: "2026-10-25", expenses: [], timeEntries: [], appUrl: "x" })).toBe(
      null,
    );
  });

  it("elenca spese e ore con il loro stato", () => {
    const d = buildDigest({
      day: "2026-10-25",
      appUrl: "http://ufficio-pc:3100",
      expenses: [
        {
          date: new Date("2026-10-25T00:00:00Z"),
          description: "Abbonamento Claude",
          amountCents: 2000,
          recurrence: "MONTHLY",
          createdBy: "Marco",
          approved: false,
        },
      ],
      timeEntries: [
        {
          date: new Date("2026-10-25T00:00:00Z"),
          partner: "Steve",
          minutes: 90,
          topic: "Riunione",
          valueCents: 3750,
          approved: true,
        },
      ],
    });
    expect(d?.subject).toBe("StudioFlow Costi, 25/10/2026: 1 spesa e 1 registrazione di ore");
    expect(d?.body).toContain("Abbonamento Claude");
    expect(d?.body).toContain("da approvare");
    expect(d?.body).toContain("1 h 30 · Riunione");
    expect(d?.body).toContain("http://ufficio-pc:3100");
  });

  it("in fondo la situazione: spese da approvare e costo delle ore", () => {
    const d = buildDigest({
      day: "2026-10-25",
      appUrl: "x",
      expenses: [],
      timeEntries: [
        {
          date: new Date("2026-10-25T00:00:00Z"),
          partner: "Marco",
          minutes: 60,
          topic: "Sviluppo",
          valueCents: 6000,
          approved: false,
        },
      ],
      status: {
        spentCents: 10000,
        pendingExpenses: { count: 2, cents: 4500 },
        hours: {
          confirmedMinutes: 120,
          confirmedCents: 12000,
          pendingMinutes: 60,
          pendingCents: 6000,
        },
      },
    });
    expect(d?.body).toContain("Spese da approvare: 2 per 45,00");
    expect(d?.body).toContain("Costo ore confermate: 120,00");
    expect(d?.body).toContain("Costo ore da confermare: 60,00");
    expect(d?.body).toContain("Spese più ore confermate: 220,00");
  });
});
