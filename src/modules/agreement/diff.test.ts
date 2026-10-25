import { describe, expect, it } from "vitest";
import { describeSummary, diffAgreement, diffWords, summarize } from "./diff";

const before = [
  "# Accordo",
  "",
  "## Articolo 3 — Quote",
  "",
  "- Parte A: **70%**;",
  "- Parte B: **30%**.",
  "",
  "## Articolo 4 — Spese",
  "",
  "La soglia è di **100 euro**.",
  "",
  "Paragrafo da togliere.",
].join("\n");

describe("diffWords", () => {
  it("segna solo le parole cambiate", () => {
    expect(diffWords("La soglia è di 100 euro.", "La soglia è di 200 euro.")).toEqual([
      { kind: "same", text: "La soglia è di " },
      { kind: "removed", text: "100" },
      { kind: "added", text: "200" },
      { kind: "same", text: " euro." },
    ]);
  });
});

describe("diffAgreement", () => {
  it("mostra solo le righe cambiate, sotto il loro articolo", () => {
    const after = before
      .replace("**70%**", "**60%**")
      .replace("**30%**", "**40%**")
      .replace("Paragrafo da togliere.", "Nuovo paragrafo sulle commissioni.");
    const groups = diffAgreement(before, after);
    expect(groups.map((g) => g.section)).toEqual(["Articolo 3 — Quote", "Articolo 4 — Spese"]);
    expect(groups[0].changes).toEqual([
      {
        kind: "changed",
        parts: [
          { kind: "same", text: "• Parte A: " },
          { kind: "removed", text: "70%;" },
          { kind: "added", text: "60%;" },
        ],
      },
      {
        kind: "changed",
        parts: [
          { kind: "same", text: "• Parte B: " },
          { kind: "removed", text: "30%." },
          { kind: "added", text: "40%." },
        ],
      },
    ]);
    expect(groups[1].changes).toHaveLength(1);
    expect(summarize(groups)).toEqual({ added: 0, removed: 0, changed: 3 });
  });

  it("distingue righe aggiunte e tolte", () => {
    const after = before
      .replace("\nParagrafo da togliere.", "")
      .concat("\n\n## Articolo 5 — Ore\n\nIl valore orario è di 60 euro.");
    const groups = diffAgreement(before, after);
    const summary = summarize(groups);
    expect(summary).toEqual({ added: 2, removed: 1, changed: 0 });
    expect(groups.at(-1)?.section).toBe("Articolo 5 — Ore");
    expect(groups.at(-1)?.changes.map((c) => c.kind)).toEqual(["added", "added"]);
    expect(describeSummary(summary)).toBe("2 paragrafi aggiunti, 1 paragrafo tolto");
  });

  it("non trova differenze in un testo uguale", () => {
    expect(diffAgreement(before, `${before}\n\n`)).toEqual([]);
    expect(describeSummary({ added: 0, removed: 0, changed: 0 })).toBe(
      "nessuna differenza nel testo",
    );
  });
});
