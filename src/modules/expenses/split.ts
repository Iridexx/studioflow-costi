// Come si divide il costo di una spesa tra i soci. Di solito secondo le quote; il piano per lo
// sviluppo del software segue l'articolo 4.5 dell'accordo: 70% Parte B, 30% Parte A.
export const DEVELOPMENT_PLAN_PARTY_B_SHARE = 7000;

export function splitLabel(partyBShareBasisPoints: number | null): string {
  if (partyBShareBasisPoints === null) return "secondo le quote dei soci";
  const b = partyBShareBasisPoints / 100;
  return `${b}% Parte B, ${100 - b}% Parte A`;
}
