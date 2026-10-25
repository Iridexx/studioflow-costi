import { ActionForm } from "@/components/action-form";
import { Card, Field, PageTitle, inputClass } from "@/components/ui";
import { MIN_PASSWORD_LENGTH } from "@/lib/password";
import { requirePartner } from "@/lib/session";
import { listCategories } from "@/modules/expenses/service";
import { MailSettingsForm } from "@/components/mail-settings-form";
import { getMailSettings } from "@/modules/mail/service";
import { getAppUrl, getPilotStudios } from "@/modules/settings/service";
import { listTopics } from "@/modules/time/service";
import {
  addCategory,
  addTopic,
  changeMyPassword,
  editCategory,
  editTopic,
  removeMailSetup,
  saveAppUrl,
  saveMailSetup,
  savePilotStudios,
} from "./actions";

export default async function SettingsPage() {
  const me = await requirePartner();
  const [categories, pilotStudios, appUrl, mail, topics] = await Promise.all([
    listCategories(),
    getPilotStudios(),
    getAppUrl(),
    getMailSettings(),
    listTopics(),
  ]);
  return (
    <>
      <PageTitle title="Impostazioni" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="La mia password">
          <ActionForm action={changeMyPassword} submitLabel="Cambia password">
            <Field label="Password attuale">
              <input
                name="current"
                type="password"
                autoComplete="current-password"
                required
                className={inputClass}
              />
            </Field>
            <Field label="Nuova password" hint={`Almeno ${MIN_PASSWORD_LENGTH} caratteri`}>
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
        </Card>

        {me.isAdmin && (
          <Card title="Studi pilota">
            <ActionForm action={savePilotStudios} submitLabel="Salva" resetOnSuccess={false}>
              <Field
                label="Numero di studi pilota"
                hint="Serve per il costo per studio nel riepilogo. 0 per non mostrarlo."
              >
                <input
                  name="pilotStudios"
                  type="number"
                  min={0}
                  defaultValue={pilotStudios}
                  className={inputClass}
                />
              </Field>
            </ActionForm>
          </Card>
        )}

        {me.isAdmin && (
          <Card title="Invio email">
            <p className="mb-4 text-sm text-slate-500">
              {mail
                ? `Attivo: le email partono da ${mail.user}.`
                : "Imposta una volta la tua casella e il programma spedirà da solo le credenziali ai nuovi soci."}
            </p>
            <MailSettingsForm
              action={saveMailSetup}
              current={
                mail
                  ? {
                      provider: mail.provider,
                      host: mail.host,
                      port: mail.port,
                      user: mail.user,
                      fromName: mail.fromName,
                    }
                  : null
              }
            />
            {mail && (
              <details className="mt-4">
                <summary className="cursor-pointer text-xs text-slate-500">
                  Disattiva l&apos;invio
                </summary>
                <ActionForm
                  action={removeMailSetup}
                  submitLabel="Disattiva l'invio delle email"
                  className="mt-2 space-y-2"
                  danger
                />
              </details>
            )}
          </Card>
        )}

        {me.isAdmin && (
          <Card title="Indirizzo per i soci">
            <ActionForm action={saveAppUrl} submitLabel="Salva" resetOnSuccess={false}>
              <Field
                label="Indirizzo del programma"
                hint="Quello che il socio scrive nel browser, es. http://nome-pc:3100 (con Tailscale). Va nell'email con le credenziali; vuoto = l'indirizzo da cui lo stai usando tu."
              >
                <input
                  name="appUrl"
                  defaultValue={appUrl ?? ""}
                  placeholder="http://nome-pc:3100"
                  className={inputClass}
                />
              </Field>
            </ActionForm>
          </Card>
        )}

        <Card title="Argomenti delle ore" className="lg:col-span-2">
          <p className="mb-4 text-sm text-slate-500">
            Le voci del menu Argomento nella pagina Ore. Rinominando un argomento cambia anche nelle
            ore già registrate; togliendo &quot;In uso&quot; sparisce dal menu ma resta nelle ore
            vecchie.
          </p>
          <ul className="mb-6 space-y-3">
            {topics.map((t) => (
              <li key={t.id}>
                <ActionForm
                  action={editTopic.bind(null, t.id)}
                  submitLabel="Salva"
                  resetOnSuccess={false}
                  className="flex flex-wrap items-center gap-3"
                >
                  <input
                    name="name"
                    defaultValue={t.name}
                    required
                    aria-label="Nome dell'argomento"
                    className={`${inputClass} mt-0 max-w-xs`}
                  />
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="active" defaultChecked={t.active} /> In uso
                  </label>
                </ActionForm>
              </li>
            ))}
          </ul>
          <ActionForm
            action={addTopic}
            submitLabel="Aggiungi argomento"
            className="flex flex-wrap items-end gap-3"
          >
            <Field label="Nuovo argomento">
              <input name="name" required className={inputClass} />
            </Field>
          </ActionForm>
        </Card>

        {me.isAdmin && (
          <Card title="Categorie di spesa" className="lg:col-span-2">
            <ul className="mb-6 space-y-3">
              {categories.map((c) => (
                <li key={c.id}>
                  <ActionForm
                    action={editCategory.bind(null, c.id)}
                    submitLabel="Salva"
                    resetOnSuccess={false}
                    className="flex flex-wrap items-center gap-3"
                  >
                    <input
                      name="name"
                      defaultValue={c.name}
                      required
                      className={`${inputClass} mt-0 max-w-xs`}
                    />
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="active" defaultChecked={c.active} /> In uso
                    </label>
                  </ActionForm>
                </li>
              ))}
            </ul>
            <ActionForm
              action={addCategory}
              submitLabel="Aggiungi categoria"
              className="flex flex-wrap items-end gap-3"
            >
              <Field label="Nuova categoria">
                <input name="name" required className={inputClass} />
              </Field>
            </ActionForm>
          </Card>
        )}
      </div>
    </>
  );
}
