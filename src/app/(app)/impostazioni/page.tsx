import { ActionForm } from "@/components/action-form";
import { Card, Field, PageTitle, inputClass } from "@/components/ui";
import { MIN_PASSWORD_LENGTH } from "@/lib/password";
import { requirePartner } from "@/lib/session";
import { listCategories } from "@/modules/expenses/service";
import { getPilotStudios } from "@/modules/settings/service";
import { addCategory, changeMyPassword, editCategory, savePilotStudios } from "./actions";

export default async function SettingsPage() {
  const me = await requirePartner();
  const [categories, pilotStudios] = await Promise.all([listCategories(), getPilotStudios()]);
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
