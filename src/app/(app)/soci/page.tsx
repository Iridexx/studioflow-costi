import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { PartnerFields } from "@/components/partner-fields";
import { TemporaryPasswordField } from "@/components/temporary-password-field";
import {
  Card,
  Empty,
  Field,
  PageTitle,
  inputClass,
  tableClass,
  tdClass,
  thClass,
} from "@/components/ui";
import { dayInput, formatDay, formatEuro, formatPercent, todayDay } from "@/lib/format";
import { MIN_PASSWORD_LENGTH } from "@/lib/password";
import { requirePartner } from "@/lib/session";
import { listContributions } from "@/modules/contributions/service";
import { listExpenses } from "@/modules/expenses/service";
import { listPartners } from "@/modules/partners/service";
import { partnerBalances } from "@/modules/summary/calc";
import { addContribution, addPartner, removeContribution } from "./actions";

export default async function PartnersPage() {
  const me = await requirePartner();
  const [partners, expenses, contributions] = await Promise.all([
    listPartners(),
    listExpenses(),
    listContributions(),
  ]);
  const today = todayDay();
  const active = partners.filter((p) => p.active);
  const summary = partnerBalances(partners, expenses, contributions, today);

  return (
    <>
      <PageTitle
        title="Soci e versamenti"
        subtitle="Quanto ha messo ciascuno rispetto alla sua quota delle spese sostenute fino a oggi."
      />
      <Card title="Saldo tra soci" className="mb-6">
        {summary.sharesTotal !== 10000 && (
          <p className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Le quote dei soci sommano a {formatPercent(summary.sharesTotal)} invece di 100%: apri un
            socio con Modifica e salva, il programma ricalcola le quote degli altri.
          </p>
        )}
        <div className="overflow-x-auto">
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={thClass}>Socio</th>
                <th className={`${thClass} text-right`}>Quota</th>
                <th className={`${thClass} text-right`}>Gli spetta</th>
                <th className={`${thClass} text-right`}>Pagato di tasca</th>
                <th className={`${thClass} text-right`}>Versato in cassa</th>
                <th className={`${thClass} text-right`}>Saldo</th>
              </tr>
            </thead>
            <tbody>
              {summary.balances.map((b) => (
                <tr key={b.partner.id}>
                  <td className={tdClass}>{b.partner.name}</td>
                  <td className={`${tdClass} text-right`}>
                    {formatPercent(b.partner.shareBasisPoints)}
                  </td>
                  <td className={`${tdClass} text-right tabular-nums`}>{formatEuro(b.dueCents)}</td>
                  <td className={`${tdClass} text-right tabular-nums`}>
                    {formatEuro(b.paidCents)}
                  </td>
                  <td className={`${tdClass} text-right tabular-nums`}>
                    {formatEuro(b.contributedCents)}
                  </td>
                  <td
                    className={`${tdClass} text-right font-medium tabular-nums ${b.balanceCents < 0 ? "text-red-700" : "text-emerald-700"}`}
                  >
                    {b.balanceCents >= 0 ? "+" : ""}
                    {formatEuro(b.balanceCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-slate-600">
          Spese sostenute fino a oggi: <strong>{formatEuro(summary.spentCents)}</strong> · Cassa
          comune: <strong>{formatEuro(summary.cashCents)}</strong>
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Saldo positivo: ha messo più della sua quota. Negativo: deve ancora mettere la differenza.
          Le ore di lavoro non entrano nel saldo: sono nella pagina Ore.
        </p>
      </Card>

      <Card title="Nuovo versamento in cassa comune" className="mb-6">
        <ActionForm action={addContribution} submitLabel="Registra versamento">
          <div className="grid gap-4 sm:grid-cols-4">
            <Field label="Socio">
              <select name="partnerId" defaultValue={me.id} className={inputClass}>
                {active.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Data">
              <input
                name="date"
                type="date"
                required
                defaultValue={dayInput(today)}
                className={inputClass}
              />
            </Field>
            <Field label="Importo €">
              <input name="amount" inputMode="decimal" required className={inputClass} />
            </Field>
            <Field label="Note">
              <input name="notes" className={inputClass} />
            </Field>
          </div>
        </ActionForm>
      </Card>

      <Card title="Versamenti" className="mb-6">
        {contributions.length === 0 ? (
          <Empty>Nessun versamento registrato.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>Data</th>
                  <th className={thClass}>Socio</th>
                  <th className={`${thClass} text-right`}>Importo</th>
                  <th className={thClass}>Note</th>
                  <th className={thClass}></th>
                </tr>
              </thead>
              <tbody>
                {contributions.map((c) => (
                  <tr key={c.id}>
                    <td className={`${tdClass} whitespace-nowrap`}>{formatDay(c.date)}</td>
                    <td className={tdClass}>{c.partner.name}</td>
                    <td className={`${tdClass} text-right tabular-nums`}>
                      {formatEuro(c.amountCents)}
                    </td>
                    <td className={tdClass}>{c.notes}</td>
                    <td className={`${tdClass} text-right`}>
                      <details>
                        <summary className="cursor-pointer text-xs text-slate-500">Elimina</summary>
                        <ActionForm
                          action={removeContribution.bind(null, c.id)}
                          submitLabel="Conferma eliminazione"
                          className="mt-2 space-y-2"
                          danger
                        />
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Soci" className="mb-6">
        <ul className="divide-y divide-slate-100">
          {partners.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
            >
              <span>
                <strong>{p.name}</strong>
                {!p.active && <span className="ml-2 text-xs text-slate-500">(non attivo)</span>}
                <span className="block text-xs text-slate-500">
                  {p.username ? `accede come "${p.username}"` : "senza accesso"}
                  {p.mustChangePassword && " · non ha ancora cambiato la password provvisoria"}
                  {p.isAdmin && " · amministratore"} · quota {formatPercent(p.shareBasisPoints)} ·{" "}
                  {formatEuro(p.hourlyRateCents)}/ora
                </span>
              </span>
              {me.isAdmin && (
                <Link
                  href={`/soci/${p.id}`}
                  className="rounded-md border border-slate-300 px-3 py-1 hover:bg-slate-50"
                >
                  Modifica
                </Link>
              )}
            </li>
          ))}
        </ul>
      </Card>

      {me.isAdmin && (
        <Card title="Aggiungi un socio (solo amministratori)">
          <ActionForm action={addPartner} submitLabel="Aggiungi socio">
            <PartnerFields others={partners} />
            <TemporaryPasswordField
              label="Password provvisoria"
              hint={`Almeno ${MIN_PASSWORD_LENGTH} caratteri, scrivila tu o premi Genera. Dopo il salvataggio prepari l'email per il socio; al primo accesso dovrà sceglierne una sua.`}
            />
          </ActionForm>
        </Card>
      )}
    </>
  );
}
