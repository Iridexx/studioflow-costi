import { describe, expect, it } from "vitest";
import { awaitsReply, isFullyApproved, missingApprovers } from "./approval";

const marco = { id: "m", name: "Marco" };
const luca = { id: "l", name: "Luca" };
const anna = { id: "a", name: "Anna" };

describe("approvazione delle spese", () => {
  it("con un socio solo la spesa è approvata da chi la inserisce", () => {
    expect(isFullyApproved([marco], ["m"])).toBe(true);
  });

  it("serve l'approvazione di tutti gli altri soci", () => {
    expect(isFullyApproved([marco, luca, anna], ["m", "l"])).toBe(false);
    expect(missingApprovers([marco, luca, anna], ["m", "l"])).toEqual([anna]);
    expect(isFullyApproved([marco, luca, anna], ["m", "l", "a"])).toBe(true);
  });

  it("non conta chi ha approvato ma non è più tra i soci con accesso", () => {
    expect(isFullyApproved([marco, luca], ["m", "x"])).toBe(false);
  });

  it("segnala a chi ha inserito la spesa che c'è una domanda a cui rispondere", () => {
    expect(awaitsReply("m", "m", "l")).toBe(true);
    expect(awaitsReply("m", "m", "m")).toBe(false);
    expect(awaitsReply("m", "m", null)).toBe(false);
    expect(awaitsReply("m", "l", "l")).toBe(false);
  });
});
