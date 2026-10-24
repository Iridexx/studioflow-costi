import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { ExpenseFields } from "@/components/expense-fields";
import { Card, ConfirmDelete, PageTitle } from "@/components/ui";
import { formatDay } from "@/lib/format";
import { getExpense, listCategories } from "@/modules/expenses/service";
import { listPartners } from "@/modules/partners/service";
import { editExpense, removeExpense } from "../actions";

export default async function ExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [expense, categories, partners] = await Promise.all([
    getExpense(id),
    listCategories(),
    listPartners(),
  ]);
  if (!expense) notFound();
  return (
    <>
      <Link href="/spese" className="text-sm text-slate-500 hover:underline">
        ← Spese
      </Link>
      <PageTitle
        title={expense.description}
        subtitle={`Inserita da ${expense.createdBy.name} il ${formatDay(expense.createdAt)}`}
      />
      <Card title="Modifica" className="mb-6">
        <ActionForm action={editExpense.bind(null, id)} submitLabel="Salva modifiche">
          <ExpenseFields
            categories={categories.filter((c) => c.active || c.id === expense.categoryId)}
            partners={partners.filter((p) => p.active || p.id === expense.paidById)}
            defaults={expense}
          />
        </ActionForm>
      </Card>
      <Card title="Elimina">
        <p className="mb-3 text-sm text-slate-500">
          Per un abbonamento disdetto non eliminarlo: indica la data di fine, così restano le spese
          già sostenute.
        </p>
        <ActionForm action={removeExpense.bind(null, id)} submitLabel="Elimina spesa" danger>
          <ConfirmDelete />
        </ActionForm>
      </Card>
    </>
  );
}
