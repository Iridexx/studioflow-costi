import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { ExpenseFields } from "@/components/expense-fields";
import { Card, ConfirmDelete, Field, PageTitle, inputClass } from "@/components/ui";
import { formatDay, formatEuro } from "@/lib/format";
import { RECURRENCE_LABEL } from "@/lib/labels";
import { requirePartner } from "@/lib/session";
import { missingApprovers } from "@/modules/expenses/approval";
import { getExpense, listApprovers, listCategories } from "@/modules/expenses/service";
import { splitLabel } from "@/modules/expenses/split";
import { listPartners } from "@/modules/partners/service";
import { attachmentRequired, formatFileSize, isImage } from "@/modules/expenses/attachments";
import { getAttachmentRequired } from "@/modules/settings/service";
import { approve, editExpense, removeExpense, sendMessage } from "../actions";

const dateTime = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Rome",
});

export default async function ExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requirePartner();
  const { id } = await params;
  const [expense, categories, partners, approvers, requiredSetting] = await Promise.all([
    getExpense(id),
    listCategories(),
    listPartners(),
    listApprovers(),
    getAttachmentRequired(),
  ]);
  if (!expense) notFound();
  const required = attachmentRequired(requiredSetting, {
    isNew: false,
    attachmentsBefore: expense.attachments.length,
  });
  const approvedBy = new Set(expense.approvals.map((a) => a.partnerId));
  const missing = missingApprovers(approvers, approvedBy);
  const mustApprove = !expense.approvedAt && missing.some((p) => p.id === me.id);
  const canDelete = me.isAdmin || (!expense.approvedAt && expense.createdById === me.id);

  return (
    <>
      <Link href="/spese" className="text-sm text-slate-500 hover:underline">
        ← Spese
      </Link>
      <PageTitle
        title={expense.description}
        subtitle={`Inserita da ${expense.createdBy.name} il ${formatDay(expense.createdAt)}`}
      />

      <Card
        title={expense.approvedAt ? "Approvata" : "In attesa di approvazione"}
        className={`mb-6 ${expense.approvedAt ? "" : "border-amber-300"}`}
      >
        <p className="mb-3 text-sm text-slate-700">
          {formatEuro(expense.amountCents)} · {RECURRENCE_LABEL[expense.recurrence]}
          {expense.endDate && ` fino al ${formatDay(expense.endDate)}`} · {expense.category.name} ·
          pagata da {expense.paidBy?.name ?? "cassa comune"}
          {expense.supplier && ` · ${expense.supplier}`}
          {expense.partyBShareBasisPoints !== null &&
            ` · costo: ${splitLabel(expense.partyBShareBasisPoints)}`}
        </p>
        {expense.notes && <p className="mb-3 text-sm text-slate-600">{expense.notes}</p>}
        {expense.approvedAt ? (
          <p className="text-sm text-emerald-700">
            Approvata da tutti i soci il {formatDay(expense.approvedAt)}: è nei conti.
          </p>
        ) : (
          <>
            <p className="mb-2 text-sm text-slate-600">
              Entra nei conti quando l&apos;hanno approvata tutti i soci.
              {expense.recurrence !== "ONE_OFF" &&
                " Per una spesa ricorrente l'approvazione vale per tutti gli addebiti."}
            </p>
            <ul className="mb-4 space-y-1 text-sm">
              {approvers.map((p) => (
                <li key={p.id}>
                  {approvedBy.has(p.id) ? (
                    <span className="text-emerald-700">✓ {p.name}: approvata</span>
                  ) : (
                    <span className="text-amber-700">… {p.name}: deve ancora approvare</span>
                  )}
                </li>
              ))}
            </ul>
            {mustApprove && (
              <ActionForm action={approve.bind(null, id)} submitLabel="Approvo questa spesa" />
            )}
            {!mustApprove && missing.length > 0 && (
              <p className="text-sm text-slate-500">
                Manca: {missing.map((p) => p.name).join(", ")}.
              </p>
            )}
          </>
        )}
      </Card>

      <Card title="Ricevute e giustificativi" className="mb-6">
        {expense.attachments.length === 0 ? (
          <p className="text-sm text-slate-500">
            Nessun allegato.
            {requiredSetting &&
              " La spesa è stata registrata prima che l'allegato fosse obbligatorio: puoi aggiungerlo da Modifica."}
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {expense.attachments.map((a) => (
              <li key={a.id} className="rounded-md border border-slate-200 p-3 text-sm">
                {isImage(a.contentType) ? (
                  <a href={`/allegati/${a.id}`} target="_blank" rel="noopener">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/allegati/${a.id}`}
                      alt={a.fileName}
                      className="mb-2 h-40 w-full rounded bg-slate-50 object-contain"
                    />
                  </a>
                ) : (
                  <a
                    href={`/allegati/${a.id}`}
                    target="_blank"
                    rel="noopener"
                    className="mb-2 flex h-40 items-center justify-center rounded bg-slate-50 text-3xl font-semibold text-red-700"
                  >
                    PDF
                  </a>
                )}
                <p className="truncate font-medium text-slate-900" title={a.fileName}>
                  {a.fileName}
                </p>
                <p className="text-xs text-slate-500">{formatFileSize(a.size)}</p>
                <p className="mt-2 flex gap-3">
                  <a
                    href={`/allegati/${a.id}`}
                    target="_blank"
                    rel="noopener"
                    className="text-slate-900 underline"
                  >
                    Apri
                  </a>
                  <a href={`/allegati/${a.id}?scarica=1`} className="text-slate-900 underline">
                    Scarica
                  </a>
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Domande e spiegazioni" className="mb-6">
        {expense.messages.length === 0 ? (
          <p className="mb-4 text-sm text-slate-500">
            Nessun messaggio. Se qualcosa non è chiaro scrivi qui: lo legge chi ha inserito la spesa
            e anche gli altri soci.
          </p>
        ) : (
          <ul className="mb-4 space-y-3">
            {expense.messages.map((m) => (
              <li
                key={m.id}
                className={`rounded-md px-3 py-2 text-sm ${m.authorId === me.id ? "bg-slate-100" : "bg-sky-50"}`}
              >
                <p className="text-xs text-slate-500">
                  {m.author.name} · {dateTime.format(m.createdAt)}
                </p>
                <p className="whitespace-pre-wrap text-slate-800">{m.body}</p>
              </li>
            ))}
          </ul>
        )}
        <ActionForm action={sendMessage.bind(null, id)} submitLabel="Invia messaggio">
          <Field
            label={
              expense.createdById === me.id ? "Rispondi" : `Scrivi a ${expense.createdBy.name}`
            }
          >
            <textarea name="body" rows={3} required className={inputClass} />
          </Field>
        </ActionForm>
      </Card>

      <Card title="Modifica" className="mb-6">
        <p className="mb-3 text-sm text-slate-500">
          Salvando una modifica (anche solo un allegato aggiunto o tolto) la spesa torna in attesa:
          gli altri soci devono approvarla di nuovo.
        </p>
        <ActionForm action={editExpense.bind(null, id)} submitLabel="Salva modifiche">
          <ExpenseFields
            categories={categories.filter((c) => c.active || c.id === expense.categoryId)}
            partners={partners.filter((p) => p.active || p.id === expense.paidById)}
            defaults={expense}
            attachmentRequired={required}
            attachments={expense.attachments}
          />
        </ActionForm>
      </Card>
      {canDelete && (
        <Card title="Elimina">
          <p className="mb-3 text-sm text-slate-500">
            Per un abbonamento disdetto non eliminarlo: indica la data di fine, così restano le
            spese già sostenute.
          </p>
          <ActionForm action={removeExpense.bind(null, id)} submitLabel="Elimina spesa" danger>
            <ConfirmDelete />
          </ActionForm>
        </Card>
      )}
    </>
  );
}
