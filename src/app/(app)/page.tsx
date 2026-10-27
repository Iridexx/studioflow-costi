import Link from "next/link";
import {
  Card,
  Empty,
  PageTitle,
  Stat,
  inputClass,
  tableClass,
  tdClass,
  thClass,
} from "@/components/ui";
import { formatEuro, formatHours, monthName, todayDay } from "@/lib/format";
import { RECURRENCE_LABEL } from "@/lib/labels";
import { requirePartner } from "@/lib/session";
import { listContributions } from "@/modules/contributions/service";
import { listCategories, listExpenses, listUnapprovedExpenses } from "@/modules/expenses/service";
import { listPartners } from "@/modules/partners/service";
import { getPilotStudios } from "@/modules/settings/service";
import {
  activeRecurring,
  categoryTotals,
  fixedMonthlyCost,
  forecast,
  hoursByPartner,
  monthlyTotals,
  partnerBalances,
  pendingExpensesTotal,
  settlements,
  type HoursTotals,
} from "@/modules/summary/calc";
import { listAllTimeEntries } from "@/modules/time/service";

export default async function SummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ anno?: string }>;
}) {
  // Anche qui e non solo nel layout: dal menu il layout non viene rifatto.
  await requirePartner();
  const params = await searchParams;
  const today = todayDay();
  const year = Number(params.anno) || today.getUTCFullYear();
  const [expenses, unapproved, categories, partners, contributions, timeEntries, pilotStudios] =
    await Promise.all([
      listExpenses(),
      listUnapprovedExpenses(),
      listCategories(),
      listPartners(),
      listContributions(),
      listAllTimeEntries(),
      getPilotStudios(),
    ]);

  const months = monthlyTotals(expenses, year);
  const yearTotal = months.reduce((a, b) => a + b, 0);
  const maxMonth = Math.max(...months, 1);
  const byCategory = categoryTotals(
    expenses,
    new Date(Date.UTC(year, 0, 1)),
    new Date(Date.UTC(year, 11, 31)),
  );
  const balances = partnerBalances(partners, expenses, contributions, today);
  const recurring = activeRecurring(expenses, today);
  const years = new Set<number>([today.getUTCFullYear()]);
  for (const e of expenses) years.add(e.date.getUTCFullYear());

  const pendingExpenses = pendingExpensesTotal(unapproved);
  // Le ore dall'inizio servono per il totale; quelle dell'anno per la tabella.
  const allHours = hoursByPartner(partners, timeEntries).total;
  const yearHours = hoursByPartner(partners, timeEntries, year);

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageTitle title="Riepilogo" subtitle="Quanto costa sviluppare StudioFlow." />
        <div className="flex items-end gap-2">
          <form className="flex items-end gap-2">
            <label className="text-sm">
              <span className="text-slate-500">Anno</span>
              <select name="anno" defaultValue={year} className={inputClass}>
                {[...years]
                  .sort((a, b) => b - a)
                  .map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
              </select>
            </label>
            <button
              type="submit"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
            >
              Mostra
            </button>
          </form>
          {/* Link normale: il file si scarica, non è una pagina. */}
          <a
            href="/esporta"
            className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-700"
          >
            Esporta in Excel
          </a>
        </div>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Speso dall'inizio a oggi" value={formatEuro(balances.spentCents)} />
        <Stat
          label={`Speso nel ${year}`}
          value={formatEuro(yearTotal)}
          hint="Comprese le spese già programmate dell'anno"
        />
        <Stat
          label="Costi fissi al mese"
          value={formatEuro(fixedMonthlyCost(expenses, today))}
          hint="Abbonamenti attivi (gli annuali divisi per 12)"
        />
        <Stat
          label="Previsione prossimi 12 mesi"
          value={formatEuro(forecast(expenses, today))}
          hint="Abbonamenti attivi e spese con data futura"
        />
        <Stat
          label="Spese da approvare"
          value={formatEuro(pendingExpenses.cents)}
          hint={
            pendingExpenses.count === 0
              ? "Nessuna spesa in attesa"
              : `${pendingExpenses.count} ${pendingExpenses.count === 1 ? "spesa" : "spese"} in attesa, non ancora nei conti (abbonamenti contati per una rata)`
          }
        />
        <Stat
          label="Costo ore dall'inizio a oggi"
          value={formatEuro(allHours.confirmedCents)}
          hint={`${formatHours(allHours.confirmedMinutes)} confermate da tutti${allHours.pendingMinutes > 0 ? `; altre ${formatHours(allHours.pendingMinutes)} da confermare (${formatEuro(allHours.pendingCents)})` : ""}`}
        />
        <Stat
          label="Spese più ore"
          value={formatEuro(balances.spentCents + allHours.confirmedCents)}
          hint="Speso a oggi più il costo delle ore confermate"
        />
        <Stat
          label="Cassa comune"
          value={formatEuro(balances.cashCents)}
          hint="Versamenti meno spese pagate dalla cassa"
        />
        {pilotStudios > 0 ? (
          <Stat
            label="Costo per studio pilota"
            value={formatEuro(Math.round(balances.spentCents / pilotStudios))}
            hint={`Speso finora diviso ${pilotStudios} studi`}
          />
        ) : (
          <Stat
            label="Costo per studio pilota"
            value="—"
            hint="Indica il numero di studi pilota in Impostazioni"
          />
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title={`Spese per mese · ${year}`}>
          <ul className="space-y-1.5">
            {months.map((cents, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <span className="w-20 shrink-0 capitalize text-slate-500">{monthName(i)}</span>
                <span className="h-4 flex-1 rounded bg-slate-100">
                  <span
                    className="block h-4 rounded bg-slate-700"
                    style={{ width: `${(cents / maxMonth) * 100}%` }}
                  />
                </span>
                <span className="w-24 shrink-0 text-right tabular-nums">{formatEuro(cents)}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title={`Per categoria · ${year}`}>
          {yearTotal === 0 ? (
            <Empty>
              Nessuna spesa.{" "}
              <Link href="/spese" className="underline">
                Inserisci la prima
              </Link>
              .
            </Empty>
          ) : (
            <table className={tableClass}>
              <tbody>
                {categories
                  .filter((c) => byCategory.get(c.id))
                  .sort((a, b) => byCategory.get(b.id)! - byCategory.get(a.id)!)
                  .map((c) => (
                    <tr key={c.id}>
                      <td className={tdClass}>
                        <Link
                          href={`/spese?anno=${year}&categoria=${c.id}`}
                          className="hover:underline"
                        >
                          {c.name}
                        </Link>
                      </td>
                      <td className={`${tdClass} text-right tabular-nums`}>
                        {formatEuro(byCategory.get(c.id)!)}
                      </td>
                      <td className={`${tdClass} w-16 text-right text-slate-500`}>
                        {Math.round((byCategory.get(c.id)! / yearTotal) * 100)}%
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card title="Saldo tra soci (a oggi)">
          <table className={tableClass}>
            <tbody>
              {balances.balances
                .filter((b) => b.partner.shareBasisPoints > 0 || b.paidCents || b.contributedCents)
                .map((b) => (
                  <tr key={b.partner.id}>
                    <td className={tdClass}>{b.partner.name}</td>
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
          {settlements(balances.balances).map((t) => (
            <p key={`${t.from.id}-${t.to.id}`} className="mt-2 text-sm text-sky-900">
              {t.from.name} deve dare <strong>{formatEuro(t.cents)}</strong> a {t.to.name}
            </p>
          ))}
          <Link href="/soci" className="mt-3 inline-block text-sm text-slate-500 hover:underline">
            Dettaglio e versamenti →
          </Link>
        </Card>

        <Card title={`Ore di lavoro · ${year}`}>
          {yearHours.rows.length === 0 ? (
            <Empty>
              Nessuna ora registrata.{" "}
              <Link href="/ore" className="underline">
                Registra le ore
              </Link>
              .
            </Empty>
          ) : (
            <>
              <table className={tableClass}>
                <thead>
                  <tr>
                    <th className={thClass}>Socio</th>
                    <th className={`${thClass} text-right`}>Confermate</th>
                    <th className={`${thClass} text-right`}>Da confermare</th>
                  </tr>
                </thead>
                <tbody>
                  {yearHours.rows.map((r) => (
                    <HoursRow key={r.partner.id} label={r.partner.name} hours={r} />
                  ))}
                  {yearHours.rows.length > 1 && (
                    <HoursRow label="Totale" hours={yearHours.total} strong />
                  )}
                </tbody>
              </table>
              <p className="mt-2 text-xs text-slate-500">
                Ore al costo orario di ogni socio. Entrano nei conti quando le hanno confermate
                tutti.
              </p>
              <Link
                href="/ore"
                className="mt-3 inline-block text-sm text-slate-500 hover:underline"
              >
                Dettaglio ore →
              </Link>
            </>
          )}
        </Card>

        <Card title="Abbonamenti attivi" className="lg:col-span-2">
          {recurring.length === 0 ? (
            <Empty>Nessun abbonamento attivo.</Empty>
          ) : (
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>Voce</th>
                  <th className={thClass}>Categoria</th>
                  <th className={thClass}>Ricorrenza</th>
                  <th className={`${thClass} text-right`}>Importo</th>
                </tr>
              </thead>
              <tbody>
                {recurring.map((e) => (
                  <tr key={e.id}>
                    <td className={tdClass}>
                      <Link href={`/spese/${e.id}`} className="hover:underline">
                        {e.description}
                      </Link>
                    </td>
                    <td className={tdClass}>{e.category.name}</td>
                    <td className={tdClass}>{RECURRENCE_LABEL[e.recurrence]}</td>
                    <td className={`${tdClass} text-right tabular-nums`}>
                      {formatEuro(e.amountCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </>
  );
}

function HoursRow({
  label,
  hours,
  strong,
}: {
  label: string;
  hours: HoursTotals;
  strong?: boolean;
}) {
  return (
    <tr className={strong ? "font-medium" : undefined}>
      <td className={tdClass}>{label}</td>
      <td className={`${tdClass} text-right tabular-nums`}>
        {formatEuro(hours.confirmedCents)}
        <span className="block text-xs font-normal text-slate-500">
          {formatHours(hours.confirmedMinutes)}
        </span>
      </td>
      <td className={`${tdClass} text-right tabular-nums text-amber-700`}>
        {hours.pendingMinutes > 0 ? (
          <>
            {formatEuro(hours.pendingCents)}
            <span className="block text-xs font-normal">{formatHours(hours.pendingMinutes)}</span>
          </>
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </td>
    </tr>
  );
}
