import { Field, inputClass } from "@/components/ui";
import { dayInput, euroInput } from "@/lib/format";

type Option = { id: string; name: string };

export type ExpenseDefaults = {
  date: Date;
  endDate: Date | null;
  description: string;
  supplier: string | null;
  categoryId: string;
  amountCents: number;
  vatBasisPoints: number;
  recurrence: string;
  paidById: string | null;
  notes: string | null;
};

// Campi del modulo spesa, uguali per nuova spesa e modifica.
export function ExpenseFields({
  categories,
  partners,
  defaults,
}: {
  categories: Option[];
  partners: Option[];
  defaults?: ExpenseDefaults;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="sm:col-span-2">
        <Field label="Descrizione">
          <input
            name="description"
            required
            defaultValue={defaults?.description}
            placeholder="es. Abbonamento Claude Max"
            className={inputClass}
          />
        </Field>
      </div>
      <Field label="Fornitore">
        <input name="supplier" defaultValue={defaults?.supplier ?? ""} className={inputClass} />
      </Field>
      <Field label="Categoria">
        <select name="categoryId" defaultValue={defaults?.categoryId} className={inputClass}>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Importo pagato (IVA inclusa) €">
        <input
          name="amount"
          inputMode="decimal"
          required
          defaultValue={defaults ? euroInput(defaults.amountCents) : ""}
          placeholder="0,00"
          className={inputClass}
        />
      </Field>
      <Field label="IVA %" hint="0 se senza IVA o estera">
        <select
          name="vat"
          defaultValue={String((defaults?.vatBasisPoints ?? 2200) / 100)}
          className={inputClass}
        >
          {[22, 10, 5, 4, 0].map((v) => (
            <option key={v} value={v}>
              {v}%
            </option>
          ))}
        </select>
      </Field>
      <Field label="Ricorrenza">
        <select
          name="recurrence"
          defaultValue={defaults?.recurrence ?? "ONE_OFF"}
          className={inputClass}
        >
          <option value="ONE_OFF">Una tantum</option>
          <option value="MONTHLY">Ogni mese</option>
          <option value="YEARLY">Ogni anno</option>
        </select>
      </Field>
      <Field label="Pagata da">
        <select name="paidById" defaultValue={defaults?.paidById ?? ""} className={inputClass}>
          <option value="">Cassa comune</option>
          {partners.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} (di tasca sua)
            </option>
          ))}
        </select>
      </Field>
      <Field label="Data (o primo addebito)">
        <input
          name="date"
          type="date"
          required
          defaultValue={defaults ? dayInput(defaults.date) : dayInput(new Date())}
          className={inputClass}
        />
      </Field>
      <Field label="Fine abbonamento" hint="Solo per le ricorrenti, vuoto se ancora attivo">
        <input
          name="endDate"
          type="date"
          defaultValue={defaults?.endDate ? dayInput(defaults.endDate) : ""}
          className={inputClass}
        />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Note">
          <input name="notes" defaultValue={defaults?.notes ?? ""} className={inputClass} />
        </Field>
      </div>
    </div>
  );
}
