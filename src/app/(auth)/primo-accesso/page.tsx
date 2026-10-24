import { redirect } from "next/navigation";
import { connection } from "next/server";
import { ActionForm } from "@/components/action-form";
import { Field, inputClass } from "@/components/ui";
import { MIN_PASSWORD_LENGTH } from "@/lib/password";
import { hasAnyLogin } from "@/modules/partners/service";
import { createFirstPartner } from "../actions";

export default async function FirstAccessPage() {
  // Legge il database a ogni richiesta, mai durante la build.
  await connection();
  if (await hasAnyLogin()) redirect("/accedi");
  return (
    <>
      <h1 className="mb-1 text-base font-semibold">Primo accesso</h1>
      <p className="mb-4 text-sm text-slate-500">
        Crea il tuo accesso da amministratore. Poi potrai aggiungere il tuo socio con la sua
        password.
      </p>
      <ActionForm action={createFirstPartner} submitLabel="Crea accesso">
        <Field label="Il tuo nome">
          <input name="name" required className={inputClass} />
        </Field>
        <Field label="Nome utente" hint="Quello che scriverai per entrare, es. marco">
          <input name="username" autoCapitalize="none" required className={inputClass} />
        </Field>
        <Field
          label="Password"
          hint={`Almeno ${MIN_PASSWORD_LENGTH} caratteri, diversa da quella di StudioFlow`}
        >
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            required
            className={inputClass}
          />
        </Field>
        <Field label="Ripeti la password">
          <input
            name="confirm"
            type="password"
            autoComplete="new-password"
            required
            className={inputClass}
          />
        </Field>
      </ActionForm>
    </>
  );
}
