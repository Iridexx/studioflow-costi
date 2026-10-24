import { parseDay, parseEuro, parseHours, parsePercent } from "@/lib/format";

// Lettura dei campi dei moduli: ogni funzione lancia FormError con un messaggio per l'utente.
export class FormError extends Error {}

export function text(form: FormData, key: string): string {
  return String(form.get(key) ?? "").trim();
}

export function optionalText(form: FormData, key: string): string | null {
  return text(form, key) || null;
}

export function requiredText(form: FormData, key: string, label: string): string {
  const value = text(form, key);
  if (!value) throw new FormError(`Compila il campo "${label}".`);
  return value;
}

export function day(form: FormData, key: string, label: string): Date {
  const value = parseDay(text(form, key));
  if (!value) throw new FormError(`Indica una data valida in "${label}".`);
  return value;
}

export function optionalDay(form: FormData, key: string, label: string): Date | null {
  return text(form, key) ? day(form, key, label) : null;
}

export function euro(form: FormData, key: string, label: string, options = { min: 1 }): number {
  const value = parseEuro(text(form, key));
  if (value === null || value < options.min)
    throw new FormError(`Indica un importo valido in "${label}" (es. 19,99).`);
  return value;
}

export function percent(form: FormData, key: string, label: string): number {
  const value = parsePercent(text(form, key));
  if (value === null) throw new FormError(`Indica una percentuale valida in "${label}".`);
  return value;
}

export function hours(form: FormData, key: string, label: string): number {
  const value = parseHours(text(form, key));
  if (!value) throw new FormError(`Indica le ore in "${label}" (es. 1,5 oppure 1:30).`);
  return value;
}

export function checkbox(form: FormData, key: string): boolean {
  return form.get(key) === "on";
}

// Esegue l'azione e trasforma gli errori di compilazione in messaggi del modulo.
export async function handle(run: () => Promise<string | void>) {
  try {
    const ok = await run();
    return ok ? { ok } : {};
  } catch (error) {
    if (error instanceof FormError) return { error: error.message };
    throw error;
  }
}
