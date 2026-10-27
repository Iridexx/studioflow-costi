import { AttachmentInput } from "@/components/attachment-input";
import { Field, inputClass } from "@/components/ui";
import { dayInput, euroInput } from "@/lib/format";
import { ATTACHMENT_HINT, formatFileSize } from "@/modules/expenses/attachments";

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

type AttachmentInfo = { id: string; fileName: string; size: number };

// Campi del modulo spesa, uguali per nuova spesa e modifica. In modifica gli allegati già salvati
// si possono togliere spuntando "Togli".
export function ExpenseFields({
  categories,
  partners,
  defaults,
  attachmentRequired,
  attachments = [],
}: {
  categories: Option[];
  partners: Option[];
  defaults?: ExpenseDefaults;
  attachmentRequired: boolean;
  attachments?: AttachmentInfo[];
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
      <div className="sm:col-span-2 lg:col-span-4">
        <div className="text-sm">
          <span className="font-medium text-slate-700">
            {attachments.length > 0 ? "Allegati" : "Ricevuta o giustificativo"}
            {attachmentRequired && attachments.length === 0 && (
              <span className="text-red-700"> (obbligatorio)</span>
            )}
          </span>
          {attachments.length > 0 && (
            <ul className="mt-1 mb-2 space-y-1">
              {attachments.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-3">
                  <a
                    href={`/allegati/${a.id}`}
                    target="_blank"
                    rel="noopener"
                    className="text-slate-900 hover:underline"
                  >
                    📎 {a.fileName}
                  </a>
                  <span className="text-xs text-slate-500">{formatFileSize(a.size)}</span>
                  <label className="flex items-center gap-1 text-xs text-red-700">
                    <input type="checkbox" name="removeAttachment" value={a.id} /> Togli
                  </label>
                </li>
              ))}
            </ul>
          )}
          <AttachmentInput
            required={attachmentRequired && attachments.length === 0}
            existing={attachments.length}
          />
          <span className="mt-1 block text-xs text-slate-500">
            {ATTACHMENT_HINT}
            {attachmentRequired && attachments.length > 0 && " Deve restarne almeno uno."}
          </span>
        </div>
      </div>
    </div>
  );
}
