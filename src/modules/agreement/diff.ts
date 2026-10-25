// Differenze tra due versioni dell'accordo, senza database. Il testo si confronta riga per riga
// (ogni paragrafo, titolo o voce di elenco è una riga); le righe modificate si confrontano poi
// parola per parola, così si vede subito cosa è stato aggiunto o tolto.

export type WordPart = { kind: "same" | "added" | "removed"; text: string };

export type LineChange =
  | { kind: "added"; text: string }
  | { kind: "removed"; text: string }
  | { kind: "changed"; parts: WordPart[] };

// Modifiche raggruppate sotto il titolo (articolo) in cui si trovano.
export type ChangeGroup = { section: string | null; changes: LineChange[] };

export type DiffSummary = { added: number; removed: number; changed: number };

type Op<T> = { kind: "same" | "added" | "removed"; value: T };

// Sequenza comune più lunga: abbastanza veloce per qualche centinaio di righe o di parole.
function diffSequences<T>(a: T[], b: T[]): Op<T>[] {
  const n = a.length;
  const m = b.length;
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
  const ops: Op<T>[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      ops.push({ kind: "same", value: a[i] });
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) ops.push({ kind: "removed", value: a[i++] });
    else ops.push({ kind: "added", value: b[j++] });
  }
  while (i < n) ops.push({ kind: "removed", value: a[i++] });
  while (j < m) ops.push({ kind: "added", value: b[j++] });
  return ops;
}

export function diffWords(before: string, after: string): WordPart[] {
  const parts: WordPart[] = [];
  for (const op of diffSequences(before.split(/(\s+)/), after.split(/(\s+)/))) {
    if (!op.value) continue;
    const last = parts.at(-1);
    if (last && last.kind === op.kind) last.text += op.value;
    else parts.push({ kind: op.kind, text: op.value });
  }
  return parts;
}

function lines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

const isHeading = (line: string) => /^#{1,3}\s/.test(line);

// Testo leggibile di una riga: senza i segni di titolo, elenco e grassetto.
export function plainLine(line: string): string {
  return line
    .replace(/^#{1,3}\s+/, "")
    .replace(/^[-*]\s+/, "• ")
    .replaceAll("**", "");
}

export function diffAgreement(before: string, after: string): ChangeGroup[] {
  const ops = diffSequences(lines(before), lines(after));
  const groups: ChangeGroup[] = [];
  let section: string | null = null;
  let current: ChangeGroup | null = null;
  const add = (change: LineChange) => {
    if (!current || current.section !== section) {
      current = { section, changes: [] };
      groups.push(current);
    }
    current.changes.push(change);
  };
  for (let k = 0; k < ops.length; k++) {
    const op = ops[k];
    if (op.kind === "same") {
      if (isHeading(op.value)) section = plainLine(op.value);
      continue;
    }
    // Righe tolte seguite da righe aggiunte: le stesse righe modificate, accoppiate in ordine.
    const removed: string[] = [];
    const added: string[] = [];
    while (k < ops.length && ops[k].kind === "removed") removed.push(ops[k++].value);
    while (k < ops.length && ops[k].kind === "added") added.push(ops[k++].value);
    k--;
    // Si accoppiano solo righe dello stesso tipo: un titolo non è la modifica di un paragrafo.
    let pairs = 0;
    while (
      pairs < Math.min(removed.length, added.length) &&
      isHeading(removed[pairs]) === isHeading(added[pairs])
    )
      pairs++;
    // Un titolo nuovo o modificato diventa la sezione di sé stesso e delle righe che seguono.
    const enter = (line: string) => {
      if (isHeading(line)) section = plainLine(line);
    };
    for (let p = 0; p < pairs; p++) {
      enter(added[p]);
      add({ kind: "changed", parts: diffWords(plainLine(removed[p]), plainLine(added[p])) });
    }
    for (const text of removed.slice(pairs)) add({ kind: "removed", text: plainLine(text) });
    for (const text of added.slice(pairs)) {
      enter(text);
      add({ kind: "added", text: plainLine(text) });
    }
  }
  return groups;
}

export function summarize(groups: ChangeGroup[]): DiffSummary {
  const summary: DiffSummary = { added: 0, removed: 0, changed: 0 };
  for (const group of groups) for (const change of group.changes) summary[change.kind]++;
  return summary;
}

export function describeSummary({ added, removed, changed }: DiffSummary): string {
  const count = (n: number, verb: string) =>
    n && `${n} ${n === 1 ? "paragrafo" : "paragrafi"} ${verb}${n === 1 ? "o" : "i"}`;
  const parts = [count(changed, "modificat"), count(added, "aggiunt"), count(removed, "tolt")];
  const text = parts.filter(Boolean).join(", ");
  return text || "nessuna differenza nel testo";
}
