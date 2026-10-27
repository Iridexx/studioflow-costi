// Quote dei soci: la somma deve fare sempre 100% (10000 centesimi di punto). Quando un socio entra
// o cambia quota, la differenza si toglie (o si restituisce) agli altri.

export const FULL_SHARE = 10000;

export type Share = { id: string; share: number };

// Divide `remaining` tra gli altri soci in proporzione alle quote che hanno ora: con un solo altro
// socio prende tutto lui (100% e nuovo socio al 50% -> 50%). Chi ha 0% resta a 0%, a meno che
// tutti siano a 0%: allora si divide in parti uguali. Gli arrotondamenti vanno ai più grandi, così
// il totale torna esatto.
export function redistribute(others: Share[], remaining: number): Share[] {
  if (others.length === 0) return [];
  const target = Math.max(0, remaining);
  const current = others.reduce((a, o) => a + Math.max(0, o.share), 0);
  const weights = others.map((o) => (current > 0 ? Math.max(0, o.share) : 1));
  const totalWeight = weights.reduce((a, w) => a + w, 0);
  const exact = weights.map((w) => (target * w) / totalWeight);
  const result = exact.map(Math.floor);
  let left = target - result.reduce((a, v) => a + v, 0);
  const order = exact
    .map((v, i) => ({ i, frac: v - Math.floor(v), weight: weights[i] }))
    .sort((a, b) => b.frac - a.frac || b.weight - a.weight);
  for (const { i } of order) {
    if (left <= 0) break;
    result[i] += 1;
    left -= 1;
  }
  return others.map((o, i) => ({ id: o.id, share: result[i] }));
}

export function sharesTotal(shares: number[]): number {
  return shares.reduce((a, s) => a + s, 0);
}

// Messaggio d'errore se le quote non fanno 100%, altrimenti null.
export function sharesProblem(shares: number[]): string | null {
  const total = sharesTotal(shares);
  if (total === FULL_SHARE) return null;
  const pct = (total / 100).toLocaleString("it-IT", { maximumFractionDigits: 2 });
  return `Le quote sommano a ${pct}% invece di 100%: correggile prima di salvare.`;
}

// Quote delle spese uguali alle quote di partecipazione dell'accordo (art. 3): la Parte A e la
// Parte B prendono la loro, gli altri soci 0%. Solo i soci la cui quota cambia; null se le parti
// dell'accordo non sono ancora scelte.
export function sharesFromAgreement(
  partners: { id: string; shareBasisPoints: number; agreementRole: "A" | "B" | null }[],
  agreement: { A: number; B: number },
): Share[] | null {
  if (
    !partners.some((p) => p.agreementRole === "A") ||
    !partners.some((p) => p.agreementRole === "B")
  )
    return null;
  return partners
    .map((p) => ({ id: p.id, share: p.agreementRole ? agreement[p.agreementRole] : 0 }))
    .filter((s) => s.share !== partners.find((p) => p.id === s.id)!.shareBasisPoints);
}
