import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { agreementTerms } from "./terms";

const draft = readFileSync(path.join(process.cwd(), "docs", "accordo-soci.md"), "utf8");

describe("numeri dell'accordo", () => {
  it("legge le quote dell'art. 3 e il valore orario dell'art. 5.2 dalla bozza", () => {
    expect(agreementTerms(draft)).toEqual({ shares: { A: 7000, B: 3000 }, hourlyRateCents: 6000 });
  });

  it("segue il testo se i soci cambiano le quote", () => {
    const text = draft
      .replace("Parte A: **70%**", "Parte A: **60%**")
      .replace("Parte B: **30%**", "Parte B: **40%**");
    expect(agreementTerms(text).shares).toEqual({ A: 6000, B: 4000 });
  });

  it("niente quote se non fanno 100% o se l'articolo non c'è", () => {
    expect(agreementTerms(draft.replace("Parte B: **30%**", "Parte B: **20%**")).shares).toBeNull();
    expect(agreementTerms("# Accordo\n\nTesto libero.")).toEqual({
      shares: null,
      hourlyRateCents: null,
    });
  });

  it("le percentuali del piano per lo sviluppo (art. 4.5) non sono le quote", () => {
    const text = "## Articolo 4 — Spese\n\n70% dalla Parte B e 30% dalla Parte A\n";
    expect(agreementTerms(text).shares).toBeNull();
  });
});
