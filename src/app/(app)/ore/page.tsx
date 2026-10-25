import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { TimeFields } from "@/components/time-fields";
import { Card, Empty, PageTitle, inputClass, tableClass, tdClass, thClass } from "@/components/ui";
import { formatDay, formatEuro, formatHours, todayDay } from "@/lib/format";
import { requirePartner } from "@/lib/session";
import { listPartners } from "@/modules/partners/service";
import { listTimeEntriesWithStatus, listTopics } from "@/modules/time/service";
import { addTimeEntry, confirmTime } from "./actions";

export default async function TimePage({
  searchParams,
}: {
  searchParams: Promise<{ anno?: string; socio?: string }>;
}) {
  const params = await searchParams;
  const me = await requirePartner();
  const today = todayDay();
  const year = Number(params.anno) || today.getUTCFullYear();
  const [entries, partners, topics] = await Promise.all([
    listTimeEntriesWithStatus(me.id),
    listPartners({ onlyActive: true }),
    listTopics({ onlyActive: true }),
  ]);
  const unpriced = partners.filter((p) => p.hourlyRateCents === 0);
  const rows = entries.filter(
    (e) => e.date.getUTCFullYear() === year && (!params.socio || e.partnerId === params.socio),
  );
  const years = new Set<number>([today.getUTCFullYear()]);
  for (const e of entries) years.add(e.date.getUTCFullYear());
  const value = (e: (typeof rows)[number]) => Math.round((e.minutes * e.hourlyRateCents) / 60);
  // Nei totali solo le ore confermate da tutti; quelle in attesa a parte.
  const confirmed = rows.filter((e) => e.approvedAt);
  const totalMinutes = confirmed.reduce((a, e) => a + e.minutes, 0);
  const totalValue = confirmed.reduce((a, e) => a + value(e), 0);
  const pendingMinutes = rows.filter((e) => !e.approvedAt).reduce((a, e) => a + e.minutes, 0);

  return (
    <>
      <PageTitle
        title="Ore di sviluppo"
        subtitle="Il tempo dedicato a StudioFlow, valorizzato con il costo orario di ciascuno."
      />
      <Card title="Registra ore" className="mb-6">
        {unpriced.length > 0 && (
          <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {unpriced.map((p) => p.name).join(", ")}{" "}
            {unpriced.length === 1 ? "non ha ancora" : "non hanno ancora"} un costo orario: le ore
            valgono 0 €. Un amministratore lo imposta in Soci e versamenti → Modifica, e le ore già
            registrate a 0 € si aggiornano da sole.
          </p>
        )}
        <ActionForm action={addTimeEntry} submitLabel="Salva ore">
          <TimeFields
            partners={partners}
            topics={topics.map((t) => t.name)}
            currentPartnerId={me.id}
          />
        </ActionForm>
      </Card>
      <Card>
        <form className="mb-4 flex flex-wrap items-end gap-3">
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
          <label className="text-sm">
            <span className="text-slate-500">Chi</span>
            <select name="socio" defaultValue={params.socio ?? ""} className={inputClass}>
              <option value="">Tutti</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
          >
            Filtra
          </button>
          <p className="ml-auto text-sm text-slate-600">
            {year}: <strong>{formatHours(totalMinutes)}</strong> ·{" "}
            <strong className="tabular-nums">{formatEuro(totalValue)}</strong> confermate
            {pendingMinutes > 0 && (
              <span className="text-amber-700"> · {formatHours(pendingMinutes)} in attesa</span>
            )}
          </p>
        </form>
        {rows.length === 0 ? (
          <Empty>Nessuna ora registrata nel {year}.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>Data</th>
                  <th className={thClass}>Chi</th>
                  <th className={thClass}>Argomento</th>
                  <th className={`${thClass} text-right`}>Ore</th>
                  <th className={`${thClass} text-right`}>Valore</th>
                  <th className={thClass}>Confermate</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className={`${tdClass} whitespace-nowrap`}>{formatDay(e.date)}</td>
                    <td className={tdClass}>{e.partner.name}</td>
                    <td className={tdClass}>
                      <Link href={`/ore/${e.id}`} className="font-medium hover:underline">
                        {e.topic}
                      </Link>
                      {e.notes && <span className="block text-xs text-slate-500">{e.notes}</span>}
                    </td>
                    <td className={`${tdClass} text-right whitespace-nowrap`}>
                      {formatHours(e.minutes)}
                    </td>
                    <td className={`${tdClass} text-right tabular-nums`}>{formatEuro(value(e))}</td>
                    <td className={tdClass}>
                      {e.approvedAt ? (
                        <span className="text-emerald-700">✓ Sì</span>
                      ) : e.mustConfirm ? (
                        <ActionForm
                          action={confirmTime.bind(null, e.id)}
                          submitLabel="Confermo"
                          className="space-y-1"
                        />
                      ) : (
                        <span className="text-amber-700">
                          In attesa
                          <span className="block text-xs text-slate-500">
                            manca {e.missing.map((p) => p.name).join(", ")}
                          </span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
