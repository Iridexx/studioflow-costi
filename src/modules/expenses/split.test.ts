import { describe, expect, it } from "vitest";
import { automaticPartyBShare, splitLabel } from "./split";

describe("chi sostiene il costo di una spesa", () => {
  it("il piano Claude è 70% Parte B e 30% Parte A", () => {
    expect(automaticPartyBShare({ description: "Abbonamento Claude Max", supplier: null })).toBe(
      7000,
    );
    expect(automaticPartyBShare({ description: "Piano Max", supplier: "Anthropic" })).toBe(7000);
  });

  it("tutte le altre spese sono della Parte B", () => {
    expect(automaticPartyBShare({ description: "Dominio studioflow.it", supplier: "Aruba" })).toBe(
      10000,
    );
    expect(splitLabel(10000)).toBe("tutto a carico della Parte B");
    expect(splitLabel(7000)).toBe("70% Parte B, 30% Parte A");
  });
});
