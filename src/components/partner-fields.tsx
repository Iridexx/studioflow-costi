import { Field, inputClass } from "@/components/ui";
import { euroInput } from "@/lib/format";

export function PartnerFields({
  defaults,
}: {
  defaults?: {
    name: string;
    username: string | null;
    email: string | null;
    shareBasisPoints: number;
    hourlyRateCents: number;
    isAdmin: boolean;
    active: boolean;
  };
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Nome e cognome">
        <input name="name" required defaultValue={defaults?.name} className={inputClass} />
      </Field>
      <Field label="Nome utente" hint="Per entrare; vuoto se non deve accedere">
        <input
          name="username"
          autoCapitalize="none"
          defaultValue={defaults?.username ?? ""}
          className={inputClass}
        />
      </Field>
      <Field label="Email" hint="Per mandargli le credenziali; non serve per entrare">
        <input
          name="email"
          type="email"
          autoCapitalize="none"
          defaultValue={defaults?.email ?? ""}
          className={inputClass}
        />
      </Field>
      <Field label="Quota delle spese %" hint="es. 50 per metà">
        <input
          name="share"
          inputMode="decimal"
          defaultValue={defaults ? String(defaults.shareBasisPoints / 100).replace(".", ",") : ""}
          className={inputClass}
        />
      </Field>
      <Field label="Costo orario €" hint="Per valorizzare le ore di lavoro">
        <input
          name="hourlyRate"
          inputMode="decimal"
          defaultValue={defaults ? euroInput(defaults.hourlyRateCents) : ""}
          className={inputClass}
        />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isAdmin" defaultChecked={defaults?.isAdmin} /> Amministratore
        (gestisce soci, password e categorie)
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={defaults?.active ?? true} /> Attivo
      </label>
    </div>
  );
}
