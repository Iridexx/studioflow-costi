import { redirect } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { Field, inputClass } from "@/components/ui";
import { getCurrentPartner } from "@/lib/session";
import { hasAnyLogin } from "@/modules/partners/service";
import { signIn } from "../actions";

export default async function SignInPage() {
  if (await getCurrentPartner()) redirect("/");
  if (!(await hasAnyLogin())) redirect("/primo-accesso");
  return (
    <ActionForm action={signIn} submitLabel="Accedi">
      <Field label="Nome utente">
        <input
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          required
          className={inputClass}
        />
      </Field>
      <Field label="Password">
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
        />
      </Field>
    </ActionForm>
  );
}
