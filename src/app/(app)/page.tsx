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
import { listCategories, listExpenses } from "@/modules/expenses/service";
import { listPartners } from "@/modules/partners/service";
import { getPilotStudios } from "@/modules/settings/service";
import {
  activeRecurring,
  categoryTotals,
  fixedMonthlyCost,
  forecast,
  monthlyTotals,
  partnerBalances,
  settlements,
} from "@/modules/summary/calc";
import { listTimeEntries } from "@/modules/time/service";

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
  const [expenses, categories, partners, contributions, timeEntries, pilotStudios] =
    await Promise.all([
      listExpenses(),
      listCategories(),
      listPartners(),
      listContributions(),
      listTimeEntries(),
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

  const yearEntries = timeEntries.filter((e) => e.date.getUTCFullYear() === year);
  const hoursByPartner = partners
    .map((p) => {
      const mine = yearEntries.filter((e) => e.partnerId === p.id);
      return {
        partner: p,
        minutes: mine.reduce((a, e) => a + e.minutes, 0),
        value: mine.reduce((a, e) => a + Math.round((e.minutes * e.hourlyRateCents) / 60), 0),
      };
    })
    .filter((r) => r.minutes > 0);

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
          {hoursByPartner.length === 0 ? (
            <Empty>Nessuna ora registrata.</Empty>
          ) : (
            <table className={tableClass}>
              <tbody>
                {hoursByPartner.map((r) => (
                  <tr key={r.partner.id}>
                    <td className={tdClass}>{r.partner.name}</td>
                    <td className={`${tdClass} text-right`}>{formatHours(r.minutes)}</td>
                    <td className={`${tdClass} text-right tabular-nums`}>{formatEuro(r.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
