import { describe, expect, it } from "vitest";
import { redistribute, sharesProblem } from "./shares";

describe("quote dei soci", () => {
  it("con un solo altro socio gli toglie tutta la quota del nuovo", () => {
    expect(redistribute([{ id: "marco", share: 10000 }], 10000 - 5000)).toEqual([
      { id: "marco", share: 5000 },
    ]);
  });

  it("con più soci divide in proporzione alle quote attuali", () => {
    const r = redistribute(
      [
        { id: "a", share: 6000 },
        { id: "b", share: 4000 },
      ],
      10000 - 2000,
    );
    expect(r).toEqual([
      { id: "a", share: 4800 },
      { id: "b", share: 3200 },
    ]);
  });

  it("il totale torna esatto anche con gli arrotondamenti", () => {
    const r = redistribute(
      [
        { id: "a", share: 3333 },
        { id: "b", share: 3333 },
        { id: "c", share: 3334 },
      ],
      10000 - 1000,
    );
    expect(r.reduce((t, s) => t + s.share, 0)).toBe(9000);
  });

  it("chi ha 0% resta a 0%", () => {
    expect(
      redistribute(
        [
          { id: "a", share: 10000 },
          { id: "collab", share: 0 },
        ],
        7000,
      ),
    ).toEqual([
      { id: "a", share: 7000 },
      { id: "collab", share: 0 },
    ]);
  });

  it("sistema anche quote che oggi non fanno 100%", () => {
    // Marco 100% e Steve 50%: salvando Steve al 50%, Marco scende al 50%.
    expect(redistribute([{ id: "marco", share: 10000 }], 5000)).toEqual([
      { id: "marco", share: 5000 },
    ]);
  });

  it("segnala un totale diverso da 100%", () => {
    expect(sharesProblem([5000, 5000])).toBeNull();
    expect(sharesProblem([10000, 5000])).toContain("150%");
  });
});
