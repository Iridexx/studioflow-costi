import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { PartnerFields } from "@/components/partner-fields";
import { TemporaryPasswordField } from "@/components/temporary-password-field";
import {
  Card,
  Empty,
  Field,
  Notice,
  PageTitle,
  inputClass,
  tableClass,
  tdClass,
  thClass,
} from "@/components/ui";
import { SettlementList, SettlementReasons, roleLabel } from "@/components/partner-accounts";
import {
  dayInput,
  formatDay,
  formatEuro,
  formatHours,
  formatPercent,
  todayDay,
} from "@/lib/format";
import { MIN_PASSWORD_LENGTH } from "@/lib/password";
import { requirePartner } from "@/lib/session";
import { listContributions } from "@/modules/contributions/service";
import { getAgreementTerms } from "@/modules/agreement/service";
import { listExpenses, listUnapprovedExpenses } from "@/modules/expenses/service";
import { splitLabel } from "@/modules/expenses/split";
import { listPartners } from "@/modules/partners/service";
import { expenseSharesFromAgreement } from "@/modules/partners/shares";
import {
  hoursByPartner,
  partnerAccounts,
  partnerBalances,
  paidForOthers,
  pendingExpensesTotal,
  settlements,
} from "@/modules/summary/calc";
import { listAllTimeEntries } from "@/modules/time/service";
import { addContribution, addPartner, alignSharesToAgreement, removeContribution } from "./actions";

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

export default async function PartnersPage() {
  const me = await requirePartner();
  const [partners, expenses, unapproved, contributions, timeEntries, terms] = await Promise.all([
    listPartners(),
    listExpenses(),
    listUnapprovedExpenses(),
    listContributions(),
    listAllTimeEntries(),
    getAgreementTerms(),
  ]);
  const today = todayDay();
  const active = partners.filter((p) => p.active);
  const summary = partnerBalances(partners, expenses, contributions, today);
  const toSettle = settlements(summary.balances);
  const accounts = partnerAccounts(summary.balances, partners, timeEntries).filter(
    (a) =>
      a.partner.active ||
      a.dueCents ||
      a.paidCents ||
      a.contributedCents ||
      a.hours.confirmedMinutes ||
      a.hours.pendingMinutes,
  );
  const forOthers = paidForOthers(partners, expenses, today);
  const pendingExpenses = pendingExpensesTotal(unapproved);
  const pendingHours = hoursByPartner(partners, timeEntries).total;
  const shares = terms.shares;
  // Le quote per dividere le spese "secondo le quote" diverse dall'accordo (art. 4.6, tutto alla
  // Parte B): lo si segnala e l'amministratore decide se allinearle, il programma non le cambia.
  const sharesToAlign = expenseSharesFromAgreement(partners);
  const totals = {
    expenses: sum(accounts.map((a) => a.refundExpensesCents)),
    hours: sum(accounts.map((a) => a.refundHoursCents)),
    pendingHours: sum(accounts.map((a) => a.hours.pendingCents)),
  };

  return (
    <>
      <PageTitle
        title="Soci e conti tra soci"
        subtitle="Quote dell'accordo, chi deve dare cosa a chi, quanto ha messo ciascuno e quanto riceverà con i ricavi."
      />
      {summary.sharesTotal !== 10000 && (
        <Notice>
          Le quote per le spese sommano a {formatPercent(summary.sharesTotal)} invece di 100%: apri
          un socio con Modifica e salva, il programma ricalcola le quote degli altri.
        </Notice>
      )}
      {summary.partiesMissing && (
        <Notice>
          Le spese vanno a carico della Parte B (il piano per lo sviluppo diviso con la Parte A), ma
          le parti non sono ancora scelte: l&apos;amministratore le sceglie nella pagina{" "}
          <Link href="/accordo" className="underline">
            Accordo
          </Link>
          . Intanto sono divise secondo le quote per le spese.
        </Notice>
      )}
      {!shares && (
        <Notice>
          Nel testo dell&apos;accordo (versione {terms.versionNumber}) non trovo le quote
          dell&apos;articolo 3 nella forma &quot;Parte A: 70%&quot;: le quote del progetto non si
          possono mostrare.
        </Notice>
      )}
      {sharesToAlign && sharesToAlign.length > 0 && (
        <Notice>
          <p>
            Le <strong>quote per le spese</strong> dei soci (
            {partners
              .filter((p) => p.shareBasisPoints > 0 || p.agreementRole)
              .map((p) => `${p.name} ${formatPercent(p.shareBasisPoints)}`)
              .join(", ")}
            ) non seguono l&apos;accordo: per ora le spese le paga tutte la Parte B (art. 4.6),
            tranne il piano Claude, 70% B e 30% A (art. 4.5), che ha già la sua ripartizione. Le
            quote 70/30 dell&apos;art. 3 sono quelle del progetto (utili), non delle spese. Le quote
            per le spese contano solo per{" "}
            {summary.byShareCount === 0
              ? "le spese con «Secondo le quote dei soci», e adesso non ce n'è nessuna: i conti qui sotto sono già giusti"
              : `${summary.byShareCount} ${summary.byShareCount === 1 ? "spesa divisa" : "spese divise"} «Secondo le quote dei soci»`}
            .
          </p>
          {me.isAdmin ? (
            <ActionForm
              action={alignSharesToAgreement}
              submitLabel="Metti le spese tutte alla Parte B"
              className="mt-2 space-y-2"
            />
          ) : (
            <p className="mt-1">Può allinearle un amministratore da questa pagina.</p>
          )}
        </Notice>
      )}

      <Card title="Chi deve dare cosa a chi" className="mb-6">
        <SettlementList toSettle={toSettle} spentCents={summary.spentCents} />
        <SettlementReasons balances={summary.balances} />
        {forOthers.length > 0 && (
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer text-slate-600">
              Spese pagate anche per la parte di un altro socio ({forOthers.length})
            </summary>
            <div className="mt-2 overflow-x-auto">
              <table className={tableClass}>
                <thead>
                  <tr>
                    <th className={thClass}>Spesa</th>
                    <th className={thClass}>Pagata da</th>
                    <th className={`${thClass} text-right`}>Pagato</th>
                    <th className={`${thClass} text-right`}>Sua parte</th>
                    <th className={`${thClass} text-right`}>Per gli altri</th>
                  </tr>
                </thead>
                <tbody>
                  {forOthers.map((r) => (
                    <tr key={r.expense.id}>
                      <td className={tdClass}>
                        <Link href={`/spese/${r.expense.id}`} className="hover:underline">
                          {r.expense.description}
                        </Link>
                        <span className="block text-xs text-slate-500">
                          {splitLabel(r.expense.partyBShareBasisPoints)}
                          {r.chargesCount > 1 && ` · ${r.chargesCount} addebiti`}
                        </span>
                      </td>
                      <td className={tdClass}>{r.payer.name}</td>
                      <td className={`${tdClass} text-right tabular-nums`}>
                        {formatEuro(r.paidCents)}
                      </td>
                      <td className={`${tdClass} text-right tabular-nums`}>
                        {formatEuro(r.ownCents)}
                      </td>
                      <td className={`${tdClass} text-right font-medium tabular-nums`}>
                        {formatEuro(r.paidCents - r.ownCents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
        <p className="mt-3 text-xs text-slate-500">
          Per ora le spese le paga la Parte B, il piano per lo sviluppo 70% Parte B e 30% Parte A
          (art. 4.5 e 4.6). Chi ha pagato anche la parte di un altro se la fa restituire subito, non
          con i ricavi. Spese sostenute fino a oggi: {formatEuro(summary.spentCents)}
          {summary.cashCents !== 0 && ` · Cassa comune: ${formatEuro(summary.cashCents)}`}.
          {pendingExpenses.count > 0 &&
            ` Non sono ancora comprese ${pendingExpenses.count} ${pendingExpenses.count === 1 ? "spesa" : "spese"} da approvare (${formatEuro(pendingExpenses.cents)}).`}
        </p>
      </Card>

      <Card title="Conti di ogni socio" className="mb-6">
        <div className="overflow-x-auto">
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={thClass}>Socio</th>
                <th className={`${thClass} text-right`}>Spese a suo carico</th>
                <th className={`${thClass} text-right`}>Ha messo</th>
                <th className={`${thClass} text-right`}>Saldo</th>
                <th className={`${thClass} text-right`}>Ore confermate</th>
                <th className={`${thClass} text-right`}>Ore da confermare</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.partner.id}>
                  <td className={tdClass}>
                    {a.partner.name}
                    <span className="block text-xs text-slate-500">
                      {roleLabel(a.partner.agreementRole, shares)}
                    </span>
                  </td>
                  <td className={`${tdClass} text-right tabular-nums`}>{formatEuro(a.dueCents)}</td>
                  <td className={`${tdClass} text-right tabular-nums`}>
                    {formatEuro(a.paidCents + a.contributedCents)}
                    {a.contributedCents > 0 && (
                      <span className="block text-xs text-slate-500">
                        di cui {formatEuro(a.contributedCents)} in cassa
                      </span>
                    )}
                  </td>
                  <td
                    className={`${tdClass} text-right font-medium tabular-nums ${a.balanceCents < 0 ? "text-red-700" : "text-emerald-700"}`}
                  >
                    {a.balanceCents > 0 ? "+" : ""}
                    {formatEuro(a.balanceCents)}
                  </td>
                  <td className={`${tdClass} text-right tabular-nums`}>
                    {formatEuro(a.hours.confirmedCents)}
                    <span className="block text-xs text-slate-500">
                      {formatHours(a.hours.confirmedMinutes)}
                    </span>
                  </td>
                  <td className={`${tdClass} text-right tabular-nums text-amber-700`}>
                    {a.hours.pendingMinutes > 0 ? (
                      <>
                        {formatEuro(a.hours.pendingCents)}
                        <span className="block text-xs">{formatHours(a.hours.pendingMinutes)}</span>
                      </>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Saldo positivo: ha messo più della sua parte e deve ricevere la differenza; negativo: deve
          darla. Le ore entrano nei conti quando le hanno confermate tutti
          {pendingHours.pendingMinutes > 0 &&
            ` (in attesa: ${formatHours(pendingHours.pendingMinutes)})`}
          ; non spostano il saldo, si pagano con i ricavi.
        </p>
      </Card>

      <Card title="Da ricevere con i ricavi" className="mb-6">
        <div className="overflow-x-auto">
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={thClass}>Socio</th>
                <th className={`${thClass} text-right`}>Spese anticipate</th>
                <th className={`${thClass} text-right`}>Ore confermate</th>
                <th className={`${thClass} text-right`}>Totale</th>
              </tr>
            </thead>
            <tbody>
              {accounts
                .filter((a) => a.refundExpensesCents || a.refundHoursCents || a.hours.pendingCents)
                .map((a) => (
                  <tr key={a.partner.id}>
                    <td className={tdClass}>{a.partner.name}</td>
                    <td className={`${tdClass} text-right tabular-nums`}>
                      {formatEuro(a.refundExpensesCents)}
                    </td>
                    <td className={`${tdClass} text-right tabular-nums`}>
                      {formatEuro(a.refundHoursCents)}
                      {a.hours.pendingCents > 0 && (
                        <span className="block text-xs text-amber-700">
                          + {formatEuro(a.hours.pendingCents)} se confermate
                        </span>
                      )}
                    </td>
                    <td className={`${tdClass} text-right font-medium tabular-nums`}>
                      {formatEuro(a.refundExpensesCents + a.refundHoursCents)}
                    </td>
                  </tr>
                ))}
              <tr className="font-medium">
                <td className={tdClass}>Totale</td>
                <td className={`${tdClass} text-right tabular-nums`}>
                  {formatEuro(totals.expenses)}
                </td>
                <td className={`${tdClass} text-right tabular-nums`}>
                  {formatEuro(totals.hours)}
                  {totals.pendingHours > 0 && (
                    <span className="block text-xs font-normal text-amber-700">
                      + {formatEuro(totals.pendingHours)} se confermate
                    </span>
                  )}
                </td>
                <td className={`${tdClass} text-right tabular-nums`}>
                  {formatEuro(totals.expenses + totals.hours)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Sono crediti verso il progetto, non verso l&apos;altro socio: si pagano solo con i ricavi
          (art. 7). Dopo costi, commissioni e una riserva di 3 mesi, si rimborsano prima le spese
          anticipate (art. 4.4), poi le ore fino al lancio al loro valore
          {terms.hourlyRateCents ? ` di ${formatEuro(terms.hourlyRateCents)}/ora` : ""} (art. 5.3),
          a cui va il 50% del disponibile; l&apos;altro 50% va agli utili secondo le quote del
          progetto. Le spese anticipate sono già contate dopo i conguagli tra soci della tabella
          sopra.
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

      <Card title="Soci e quote" className="mb-6">
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
                  {p.isAdmin && " · amministratore"}
                </span>
                <span className="block text-xs text-slate-500">
                  {roleLabel(p.agreementRole, shares)} · quota per le spese{" "}
                  {formatPercent(p.shareBasisPoints)} · {formatEuro(p.hourlyRateCents)}/ora
                  {p.active &&
                    p.agreementRole &&
                    terms.hourlyRateCents !== null &&
                    p.hourlyRateCents !== terms.hourlyRateCents && (
                      <span className="text-amber-700">
                        {" "}
                        (l&apos;accordo dice {formatEuro(terms.hourlyRateCents)}/ora, art. 5.2)
                      </span>
                    )}
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
        <p className="mt-2 text-xs text-slate-500">
          La quota del progetto è quella dell&apos;accordo (art. 3): conta per gli utili, non per le
          spese. Le spese le paga la Parte B, il piano Claude 70% B e 30% A (art. 4.5 e 4.6): è
          scritto su ogni spesa. La quota per le spese serve solo per le spese divise «Secondo le
          quote dei soci».
        </p>
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
