import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { ExpenseFields } from "@/components/expense-fields";
import { Card, Empty, PageTitle, inputClass, tableClass, tdClass, thClass } from "@/components/ui";
import { formatDay, formatEuro, todayDay } from "@/lib/format";
import { RECURRENCE_LABEL } from "@/lib/labels";
import { chargeDates } from "@/modules/summary/calc";
import { listCategories, listExpenses } from "@/modules/expenses/service";
import { listPartners } from "@/modules/partners/service";
import { addExpense } from "./actions";

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ anno?: string; categoria?: string }>;
}) {
  const params = await searchParams;
  const today = todayDay();
  const year = Number(params.anno) || today.getUTCFullYear();
  const [expenses, categories, partners] = await Promise.all([
    listExpenses(),
    listCategories(),
    listPartners({ onlyActive: true }),
  ]);
  const from = new Date(Date.UTC(year, 0, 1));
  const to = new Date(Date.UTC(year, 11, 31));
  const rows = expenses
    .filter((e) => !params.categoria || e.categoryId === params.categoria)
    .map((e) => {
      const dates = chargeDates(e, from, to);
      return { expense: e, charges: dates.length, yearCents: dates.length * e.amountCents };
    })
    .filter((r) => r.charges > 0);
  const total = rows.reduce((a, r) => a + r.yearCents, 0);
  const years = new Set<number>([today.getUTCFullYear()]);
  for (const e of expenses) years.add(e.date.getUTCFullYear());

  return (
    <>
      <PageTitle
        title="Spese"
        subtitle="Abbonamenti, API, server, hardware e ogni altra spesa per StudioFlow."
      />
      <Card title="Nuova spesa" className="mb-6">
        <ActionForm action={addExpense} submitLabel="Salva spesa">
          <ExpenseFields categories={categories.filter((c) => c.active)} partners={partners} />
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
            <span className="text-slate-500">Categoria</span>
            <select name="categoria" defaultValue={params.categoria ?? ""} className={inputClass}>
              <option value="">Tutte</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
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
            Totale {year}: <strong className="tabular-nums">{formatEuro(total)}</strong>
          </p>
        </form>
        {rows.length === 0 ? (
          <Empty>Nessuna spesa nel {year}.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>Data</th>
                  <th className={thClass}>Descrizione</th>
                  <th className={thClass}>Categoria</th>
                  <th className={thClass}>Ricorrenza</th>
                  <th className={`${thClass} text-right`}>Importo</th>
                  <th className={`${thClass} text-right`}>Nel {year}</th>
                  <th className={thClass}>Pagata da</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ expense: e, charges, yearCents }) => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className={`${tdClass} whitespace-nowrap`}>{formatDay(e.date)}</td>
                    <td className={tdClass}>
                      <Link
                        href={`/spese/${e.id}`}
                        className="font-medium text-slate-900 hover:underline"
                      >
                        {e.description}
                      </Link>
                      {e.supplier && (
                        <span className="block text-xs text-slate-500">{e.supplier}</span>
                      )}
                    </td>
                    <td className={tdClass}>{e.category.name}</td>
                    <td className={tdClass}>
                      {RECURRENCE_LABEL[e.recurrence]}
                      {e.endDate && (
                        <span className="block text-xs text-slate-500">
                          fino al {formatDay(e.endDate)}
                        </span>
                      )}
                    </td>
                    <td className={`${tdClass} text-right tabular-nums`}>
                      {formatEuro(e.amountCents)}
                    </td>
                    <td className={`${tdClass} text-right tabular-nums`}>
                      {formatEuro(yearCents)}
                      {charges > 1 && (
                        <span className="block text-xs text-slate-500">{charges} addebiti</span>
                      )}
                    </td>
                    <td className={tdClass}>{e.paidBy?.name ?? "Cassa comune"}</td>
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
