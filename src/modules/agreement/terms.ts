// Numeri dell'accordo che servono ai conti, letti dal testo in vigore: così se i soci cambiano
// l'accordo il programma segue il testo nuovo. Se una frase non si trova più il valore è null e
// la pagina lo dice, invece di usare un numero vecchio.

export type AgreementTerms = {
  // Quote di partecipazione dell'articolo 3, in centesimi di punto (7000 = 70%).
  shares: { A: number; B: number } | null;
  // Valore orario dell'articolo 5.2, in centesimi.
  hourlyRateCents: number | null;
};

const number = (text: string) => Number(text.replace(",", "."));

// Il testo di un articolo, dal suo titolo al titolo dell'articolo dopo.
function article(text: string, title: RegExp): string | null {
  return text.split(/^## /m).find((part) => title.test(part)) ?? null;
}

export function agreementTerms(text: string): AgreementTerms {
  return { shares: readShares(text), hourlyRateCents: readHourlyRate(text) };
}

// "- Parte A: **70%**;" nell'articolo 3. Le due quote devono fare 100%.
function readShares(text: string): AgreementTerms["shares"] {
  const section = article(text, /^Articolo 3\b/);
  if (!section) return null;
  const read = (role: "A" | "B") => {
    const match = new RegExp(`Parte ${role}:\\s*\\**\\s*(\\d{1,3}(?:[.,]\\d{1,2})?)\\s*%`).exec(
      section,
    );
    return match ? Math.round(number(match[1]) * 100) : null;
  };
  const A = read("A");
  const B = read("B");
  if (A === null || B === null || A + B !== 10000) return null;
  return { A, B };
}

// "Il valore orario di riferimento è di **60 euro**" nell'articolo 5.
function readHourlyRate(text: string): number | null {
  const section = article(text, /^Articolo 5\b/);
  const match =
    section && /valore orario[^*\n]*\**\s*(\d+(?:[.,]\d{1,2})?)\s*(?:euro|€)/i.exec(section);
  return match ? Math.round(number(match[1]) * 100) : null;
}
