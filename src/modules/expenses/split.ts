// Come si divide il costo di una spesa tra i soci, secondo l'accordo: le spese sono tutte a carico
// della Parte B (art. 4.6), tranne il piano per lo sviluppo del software, 70% Parte B e 30% Parte A
// (art. 4.5). Il valore si compila da solo e si può cambiare su ogni spesa per accordi diversi.
export const PARTY_B_ALL = 10000;
export const DEVELOPMENT_PLAN_PARTY_B_SHARE = 7000;

// Valore del menu "Chi ne sostiene il costo" che chiede al programma di scegliere da solo.
export const AUTOMATIC_SPLIT = "auto";

// Il piano per lo sviluppo si riconosce dal nome: oggi è Claude di Anthropic.
const DEVELOPMENT_PLAN = /\bclaude\b|anthropic/i;

export function isDevelopmentPlan(expense: { description: string; supplier: string | null }) {
  return DEVELOPMENT_PLAN.test(`${expense.description} ${expense.supplier ?? ""}`);
}

export function automaticPartyBShare(expense: {
  description: string;
  supplier: string | null;
}): number {
  return isDevelopmentPlan(expense) ? DEVELOPMENT_PLAN_PARTY_B_SHARE : PARTY_B_ALL;
}

export function splitLabel(partyBShareBasisPoints: number | null): string {
  if (partyBShareBasisPoints === null) return "secondo le quote dei soci";
  if (partyBShareBasisPoints === PARTY_B_ALL) return "tutto a carico della Parte B";
  const b = partyBShareBasisPoints / 100;
  return `${b}% Parte B, ${100 - b}% Parte A`;
}
