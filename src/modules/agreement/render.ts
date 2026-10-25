// Testo dell'accordo tra soci: sostituisce i segnaposto {{A.nome}}, {{B.codiceFiscale}}, ...
// con i dati dei soci e divide il testo (Markdown semplice) in blocchi da mostrare e stampare.

export type PartyData = {
  nome: string | null;
  codiceFiscale: string | null;
  luogoNascita: string | null;
  dataNascita: string | null;
  residenza: string | null;
};

export type Parties = { A: PartyData | null; B: PartyData | null };

export const PARTY_FIELDS: { key: keyof PartyData; label: string }[] = [
  { key: "nome", label: "nome e cognome" },
  { key: "luogoNascita", label: "luogo di nascita" },
  { key: "dataNascita", label: "data di nascita" },
  { key: "codiceFiscale", label: "codice fiscale" },
  { key: "residenza", label: "residenza" },
];

// "missing": dato non ancora inserito, mostrato evidenziato con la sua descrizione.
export type Inline = { kind: "text" | "bold" | "missing"; text: string };

export type Block =
  | { kind: "heading"; level: 1 | 2 | 3; content: Inline[] }
  | { kind: "paragraph"; content: Inline[] }
  | { kind: "list"; ordered: boolean; items: Inline[][] }
  | { kind: "rule" };

const PLACEHOLDER = /\{\{\s*([AB])\.(\w+)\s*\}\}/g;

function placeholderValue(parties: Parties, party: "A" | "B", field: string): Inline {
  const spec = PARTY_FIELDS.find((f) => f.key === field);
  const label = `${spec?.label ?? field} Parte ${party}`;
  const value = spec ? parties[party]?.[spec.key] : null;
  return value ? { kind: "text", text: value } : { kind: "missing", text: label };
}

export function parseInline(line: string, parties: Parties): Inline[] {
  const out: Inline[] = [];
  const push = (part: Inline) => {
    if (!part.text) return;
    const last = out.at(-1);
    if (last && last.kind === part.kind && part.kind !== "missing") last.text += part.text;
    else out.push({ ...part });
  };
  // Il grassetto alterna i pezzi tra "**": pari normali, dispari in grassetto.
  line.split("**").forEach((piece, index) => {
    const kind = index % 2 === 1 ? "bold" : "text";
    let from = 0;
    for (const match of piece.matchAll(PLACEHOLDER)) {
      push({ kind, text: piece.slice(from, match.index) });
      const value = placeholderValue(parties, match[1] as "A" | "B", match[2]);
      push(value.kind === "missing" ? value : { kind, text: value.text });
      from = match.index + match[0].length;
    }
    push({ kind, text: piece.slice(from) });
  });
  return out;
}

export function parseAgreement(markdown: string, parties: Parties): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: Inline[][] } | null = null;
  const flush = () => {
    if (paragraph.length)
      blocks.push({ kind: "paragraph", content: parseInline(paragraph.join(" "), parties) });
    if (list) blocks.push({ kind: "list", ...list });
    paragraph = [];
    list = null;
  };
  for (const raw of markdown.split(/\r?\n/)) {
    const line = raw.trim();
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    const item = /^(?:([-*])|(\d+)\.)\s+(.*)$/.exec(line);
    if (!line) flush();
    else if (line === "---") {
      flush();
      blocks.push({ kind: "rule" });
    } else if (heading) {
      flush();
      const level = heading[1].length as 1 | 2 | 3;
      blocks.push({ kind: "heading", level, content: parseInline(heading[2], parties) });
    } else if (item) {
      const ordered = !item[1];
      if (paragraph.length || (list && list.ordered !== ordered)) flush();
      list ??= { ordered, items: [] };
      list.items.push(parseInline(item[3], parties));
    } else if (list) {
      // Riga che continua l'ultima voce dell'elenco.
      const last = list.items.at(-1)!;
      last.push(...parseInline(` ${line}`, parties));
    } else paragraph.push(line);
  }
  flush();
  return blocks;
}

// Dati che mancano a ogni parte, per l'elenco in cima alla pagina.
export function missingFields(parties: Parties): { party: "A" | "B"; labels: string[] }[] {
  return (["A", "B"] as const).map((party) => ({
    party,
    labels: PARTY_FIELDS.filter((f) => !parties[party]?.[f.key]).map((f) => f.label),
  }));
}
