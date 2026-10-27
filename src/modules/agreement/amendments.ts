// Modifiche al testo dell'accordo decise dai soci fuori dal programma. Il testo vive nel
// database: il programma non lo cambia da solo, ma prepara la versione nuova con la modifica già
// inserita; un socio la controlla e la salva, e gli altri la convalidano come ogni altra versione.

export type Amendment = {
  id: string;
  title: string;
  // Proposta come "Cosa hai cambiato e perché" della versione nuova.
  note: string;
  // Se il testo contiene già questa frase, la modifica è fatta.
  marker: string;
  // Il paragrafo da inserire, in markdown come il resto dell'accordo.
  section: string;
  // Il paragrafo si inserisce prima del primo titolo trovato tra questi.
  before: string[];
};

export const AMENDMENTS: Amendment[] = [
  {
    id: "piano-sviluppo",
    title: "Piano per lo sviluppo del software: 70% Parte B, 30% Parte A",
    note: "Aggiunto l'articolo 4.5: il piano Claude Max (90 € al mese più IVA) lo paga per il 70% la Parte B e per il 30% la Parte A",
    marker: "Piano per lo sviluppo del software",
    section: `### 4.5 Piano per lo sviluppo del software

Il piano dello strumento di intelligenza artificiale usato per sviluppare il software è pagato per il **70% dalla Parte B** e per il **30% dalla Parte A**, invece che secondo le quote dell'articolo 3. Al momento il piano è **Claude Max**, al costo di **90 euro al mese più IVA**. Se il piano cambia, con l'approvazione di entrambe le parti, la stessa ripartizione vale per il piano che lo sostituisce.`,
    before: ["### 4.6", "## Articolo 5"],
  },
  {
    id: "spese-parte-b",
    title: "Per ora le spese le paga la Parte B (tranne il piano per lo sviluppo)",
    note: "Aggiunto l'articolo 4.6: per ora le spese le paga la Parte B, tranne il piano per lo sviluppo (art. 4.5); chi paga la quota dell'altro se la fa restituire, poi tutto si rimborsa con i ricavi",
    marker: "Chi paga le spese per ora",
    section: `### 4.6 Chi paga le spese per ora

Fino a diverso accordo scritto, le spese operative le paga la Parte B, tranne il piano per lo sviluppo del software, diviso come indicato all'articolo 4.5. Se una parte paga anche la quota che toccava all'altra (per esempio la Parte A paga per comodità l'intero abbonamento del piano), l'altra parte gliela restituisce: il programma StudioFlow Costi calcola da solo quanto ciascuna parte deve dare all'altra. Le spese che ciascuna parte ha sostenuto per la propria quota restano anticipazioni rimborsabili con i ricavi del Progetto, secondo gli articoli 4.4 e 7.`,
    before: ["## Articolo 5"],
  },
];

export function pendingAmendments(text: string): Amendment[] {
  return AMENDMENTS.filter((a) => !text.includes(a.marker));
}

// Il testo con la modifica inserita, o null se i soci hanno tolto il titolo di riferimento: in quel
// caso il paragrafo va incollato a mano.
export function applyAmendment(text: string, amendment: Amendment): string | null {
  const lines = text.split("\n");
  const at = amendment.before
    .map((title) => lines.findIndex((l) => l.trimStart().startsWith(title)))
    .find((i) => i >= 0);
  if (at === undefined) return null;
  return [...lines.slice(0, at), ...amendment.section.split("\n"), "", ...lines.slice(at)].join(
    "\n",
  );
}

// Tutte le modifiche ancora da fare in una sola versione nuova, nell'ordine dell'elenco.
export function applyPendingAmendments(text: string): { text: string; applied: Amendment[] } {
  const applied: Amendment[] = [];
  for (const amendment of pendingAmendments(text)) {
    const next = applyAmendment(text, amendment);
    if (next === null) continue;
    text = next;
    applied.push(amendment);
  }
  return { text, applied };
}
