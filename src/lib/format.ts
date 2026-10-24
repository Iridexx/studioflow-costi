// Conversioni tra testo inserito nei moduli e valori salvati (centesimi, minuti, date).

// Separatore delle migliaia anche sotto 10.000 (1.159,90 €).
const euro = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  useGrouping: "always",
});

export function formatEuro(cents: number): string {
  return euro.format(cents / 100);
}

// "1.234,56", "1234.56", "12,5", "€ 30" -> centesimi. null se non è un importo valido.
export function parseEuro(text: string): number | null {
  let value = text.replace(/[€\s]/g, "");
  if (!value) return null;
  if (value.includes(",")) value = value.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(value)) value = value.replace(/\./g, "");
  if (!/^-?\d+(\.\d{1,2})?$/.test(value)) return null;
  return Math.round(Number(value) * 100);
}

// Valore da mostrare in un campo importo: 1234,5 -> "1234,50".
export function euroInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

// "1,5", "1.5", "1:30", "2" -> minuti. null se non valido.
export function parseHours(text: string): number | null {
  const value = text.trim();
  const clock = /^(\d{1,3}):([0-5]\d)$/.exec(value);
  if (clock) return Number(clock[1]) * 60 + Number(clock[2]);
  const decimal = value.replace(",", ".");
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(decimal)) return null;
  return Math.round(Number(decimal) * 60);
}

export function formatHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")}`;
}

export function hoursInput(minutes: number): string {
  return (minutes / 60)
    .toFixed(2)
    .replace(/\.?0+$/, "")
    .replace(".", ",");
}

// "22", "22%", "22,5" -> centesimi di punto (2200). null se non valido.
export function parsePercent(text: string): number | null {
  const value = text.replace(/[%\s]/g, "").replace(",", ".");
  if (!value) return 0;
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(value)) return null;
  const n = Math.round(Number(value) * 100);
  return n > 10000 ? null : n;
}

export function formatPercent(basisPoints: number): string {
  return `${(basisPoints / 100).toLocaleString("it-IT", { maximumFractionDigits: 2 })}%`;
}

// Date "solo giorno" salvate a mezzanotte UTC: YYYY-MM-DD <-> Date.
export function parseDay(text: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const date = new Date(`${text}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function dayInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function formatDay(date: Date): string {
  return new Intl.DateTimeFormat("it-IT", { timeZone: "UTC" }).format(date);
}

const MONTHS = [
  "gennaio",
  "febbraio",
  "marzo",
  "aprile",
  "maggio",
  "giugno",
  "luglio",
  "agosto",
  "settembre",
  "ottobre",
  "novembre",
  "dicembre",
];

export function monthName(index: number): string {
  return MONTHS[index];
}

// Oggi in Italia, come data "solo giorno".
export function todayDay(): Date {
  const text = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date());
  return parseDay(text)!;
}
