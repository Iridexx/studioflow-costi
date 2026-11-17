import { describe, expect, it } from "vitest";
import { canEditTimeEntry, editBlock, editBlockMessage } from "./rules";

const pending = { createdById: "m", approvedAt: null };
const confirmed = { createdById: "m", approvedAt: new Date("2026-11-11") };

describe("modifica delle ore", () => {
  it("chi le ha inserite le modifica finché sono in attesa", () => {
    expect(canEditTimeEntry(pending, "m")).toBe(true);
  });

  it("un altro socio non può modificarle, anche se in attesa", () => {
    expect(canEditTimeEntry(pending, "s")).toBe(false);
    expect(editBlock(pending, "s")).toBe("not-author");
  });

  it("confermate da tutti restano bloccate, anche per chi le ha inserite", () => {
    expect(canEditTimeEntry(confirmed, "m")).toBe(false);
    expect(editBlock(confirmed, "s")).toBe("confirmed");
  });

  it("con un socio solo le ore sono confermate subito e quindi bloccate", () => {
    expect(canEditTimeEntry({ createdById: "m", approvedAt: new Date() }, "m")).toBe(false);
  });

  it("spiega perché non si possono modificare", () => {
    expect(editBlockMessage("not-author", "Steve")).toContain("solo Steve");
    expect(editBlockMessage("confirmed", "Steve")).toContain("confermate");
  });
});
