"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import { InviteBox } from "@/components/invite-box";
import type { Invite } from "@/modules/partners/invite";

export type FormState = { error?: string; ok?: string; invite?: Invite };
export type FormAction = (state: FormState, formData: FormData) => Promise<FormState>;

// Modulo con messaggio d'errore o di conferma e pulsante che mostra l'attesa.
// L'invio passa da onSubmit e non dall'attributo action: così, se c'è un errore, quello che si è
// scritto resta nei campi (con action React svuoterebbe il modulo in ogni caso). Il modulo si
// svuota solo dopo un salvataggio riuscito, per inserire subito la voce successiva.
export function ActionForm({
  action,
  submitLabel,
  children,
  className = "space-y-4",
  danger = false,
  resetOnSuccess = true,
}: {
  action: FormAction;
  submitLabel: string;
  children?: React.ReactNode;
  className?: string;
  danger?: boolean;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok && resetOnSuccess) form.current?.reset();
  }, [state, resetOnSuccess]);
  // Il riquadro dell'email sta fuori dal modulo: un Invio nei suoi campi non deve rimandarlo.
  return (
    <>
      <form
        ref={form}
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          startTransition(() => formAction(data));
        }}
        className={className}
      >
        {children}
        {state.error && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        )}
        {state.ok && (
          <p role="status" className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {state.ok}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className={
            (danger
              ? "bg-white text-red-700 ring-1 ring-red-200 hover:bg-red-50"
              : "bg-slate-900 text-white hover:bg-slate-700") +
            " rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60"
          }
        >
          {pending ? "Attendere…" : submitLabel}
        </button>
      </form>
      {state.invite && <InviteBox key={state.invite.body} invite={state.invite} />}
    </>
  );
}
