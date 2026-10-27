import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  AMENDMENTS,
  applyAmendment,
  applyPendingAmendments,
  pendingAmendments,
} from "./amendments";

const plan = AMENDMENTS.find((a) => a.id === "piano-sviluppo")!;
const base = "## Articolo 4 — Spese\n\nTesto.\n\n## Articolo 5 — Ore di lavoro\n\nAltro.";

describe("modifiche proposte all'accordo", () => {
  it("inserisce il paragrafo prima del titolo indicato", () => {
    const text = applyAmendment(base, plan)!;
    expect(text.indexOf("### 4.5 Piano per lo sviluppo")).toBeGreaterThan(text.indexOf("Testo."));
    expect(text.indexOf("### 4.5")).toBeLessThan(text.indexOf("## Articolo 5"));
    expect(text).toContain("**70% dalla Parte B**");
    expect(pendingAmendments(text)).not.toContain(plan);
  });

  it("senza il titolo di riferimento non inserisce niente", () => {
    expect(applyAmendment("## Altro\n\nTesto.", plan)).toBeNull();
  });

  it("una modifica già fatta non si propone più", () => {
    expect(pendingAmendments(base)).toContain(plan);
    expect(pendingAmendments(applyAmendment(base, plan)!)).toEqual(
      AMENDMENTS.filter((a) => a !== plan),
    );
  });

  it("la bozza iniziale contiene già tutte le modifiche", () => {
    const doc = readFileSync(path.join(process.cwd(), "docs", "accordo-soci.md"), "utf8");
    expect(pendingAmendments(doc)).toEqual([]);
    for (const a of AMENDMENTS) expect(doc).toContain(a.section);
  });

  it("prepara tutte le modifiche in una versione, in ordine di articolo", () => {
    const { text, applied } = applyPendingAmendments(base);
    expect(applied).toEqual(AMENDMENTS);
    expect(text.indexOf("### 4.5")).toBeLessThan(text.indexOf("### 4.6"));
    expect(text.indexOf("### 4.6")).toBeLessThan(text.indexOf("## Articolo 5"));
    expect(pendingAmendments(text)).toEqual([]);
  });

  it("con il 4.6 già inserito, il 4.5 va prima", () => {
    const only46 = applyAmendment(
      base,
      AMENDMENTS.find((a) => a.id === "spese-parte-b")!,
    )!;
    const text = applyAmendment(only46, plan)!;
    expect(text.indexOf("### 4.5")).toBeLessThan(text.indexOf("### 4.6"));
  });

  it("la prima stesura del 4.6 viene sostituita, non duplicata", () => {
    const oldText =
      "## Articolo 4\n\n### 4.6 Spese a carico della Parte B\n\nVecchio testo.\n\n## Articolo 5 — Ore di lavoro\n\nAltro.";
    const spese = AMENDMENTS.find((a) => a.id === "spese-parte-b")!;
    const text = applyAmendment(oldText, spese)!;
    expect(text).not.toContain("Vecchio testo.");
    expect(text).toContain("### 4.6 Chi paga le spese per ora");
    expect(text.match(/### 4\.6/g)).toHaveLength(1);
    expect(text).toContain("## Articolo 5 — Ore di lavoro");
  });
});
