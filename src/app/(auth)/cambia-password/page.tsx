import { redirect } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { Field, inputClass } from "@/components/ui";
import { MIN_PASSWORD_LENGTH } from "@/lib/password";
import { getCurrentPartner } from "@/lib/session";
import { replaceTemporaryPassword, signOut } from "../actions";

export default async function ChangePasswordPage() {
  const me = await getCurrentPartner();
  if (!me) redirect("/accedi");
  if (!me.mustChangePassword) redirect("/");
  return (
    <>
      <h1 className="mb-1 text-base font-semibold">Benvenuto, {me.name}</h1>
      <p className="mb-4 text-sm text-slate-500">
        Sei entrato con una password provvisoria. Prima di continuare scegline una tua: la conosci
        solo tu.
      </p>
      <ActionForm action={replaceTemporaryPassword} submitLabel="Salva e continua">
        <Field
          label="Nuova password"
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
        <Field label="Ripeti la nuova password">
          <input
            name="confirm"
            type="password"
            autoComplete="new-password"
            required
            className={inputClass}
          />
        </Field>
      </ActionForm>
      <form action={signOut} className="mt-4 text-center">
        <button type="submit" className="text-xs text-slate-500 hover:underline">
          Esci
        </button>
      </form>
    </>
  );
}
