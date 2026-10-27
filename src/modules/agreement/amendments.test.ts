import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { AMENDMENTS, applyAmendment, findAmendment, pendingAmendments } from "./amendments";

const plan = findAmendment("piano-sviluppo")!;
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
});
