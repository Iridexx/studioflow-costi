"use client";

import { useState } from "react";
import { ActionForm, type FormAction } from "@/components/action-form";
import { Field, inputClass } from "@/components/ui";
import { MAIL_PROVIDERS, findProvider, guessProvider } from "@/modules/mail/providers";

// Casella da cui il programma spedisce le email: servizio, indirizzo e password.
export function MailSettingsForm({
  action,
  current,
}: {
  action: FormAction;
  current: { provider: string; host: string; port: number; user: string; fromName: string } | null;
}) {
  const [provider, setProvider] = useState(current?.provider ?? "gmail");
  const preset = findProvider(provider);
  return (
    <ActionForm
      action={action}
      submitLabel="Salva e invia un'email di prova"
      resetOnSuccess={false}
    >
      <Field label="La tua email" hint="Le email ai soci partono da questo indirizzo">
        <input
          name="user"
          type="email"
          required
          autoCapitalize="none"
          defaultValue={current?.user ?? ""}
          onBlur={(e) => {
            if (!current && e.target.value) setProvider(guessProvider(e.target.value));
          }}
          className={inputClass}
        />
      </Field>
      <Field label="Servizio">
        <select
          name="provider"
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          className={inputClass}
        >
          {MAIL_PROVIDERS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </Field>
      {provider === "other" && (
        <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
          <Field label="Server di posta in uscita (SMTP)">
            <input
              name="host"
              required
              defaultValue={current?.host ?? ""}
              placeholder="smtp.esempio.it"
              className={inputClass}
            />
          </Field>
          <Field label="Porta">
            <input
              name="port"
              inputMode="numeric"
              defaultValue={current?.port ?? 465}
              className={inputClass}
            />
          </Field>
        </div>
      )}
      <Field
        label="Password"
        hint={
          (preset?.passwordHint ?? "") + (current ? " Lascia vuoto per tenere quella salvata." : "")
        }
      >
        <input
          name="password"
          type="password"
          autoComplete="off"
          required={!current}
          className={inputClass}
        />
      </Field>
      <Field
        label="Nome del mittente"
        hint="Come appare a chi riceve, es. Marco – StudioFlow Costi"
      >
        <input name="fromName" defaultValue={current?.fromName ?? ""} className={inputClass} />
      </Field>
    </ActionForm>
  );
}
