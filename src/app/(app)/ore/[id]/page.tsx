import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { TimeFields } from "@/components/time-fields";
import { Card, ConfirmDelete, PageTitle } from "@/components/ui";
import { formatDay, formatEuro } from "@/lib/format";
import { requirePartner } from "@/lib/session";
import { listPartners } from "@/modules/partners/service";
import { missingApprovers } from "@/modules/expenses/approval";
import { listApprovers } from "@/modules/expenses/service";
import { getTimeEntry, listTopics } from "@/modules/time/service";
import { confirmTime, editTimeEntry, removeTimeEntry } from "../actions";

export default async function TimeEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requirePartner();
  const { id } = await params;
  const [entry, partners, topics, approvers] = await Promise.all([
    getTimeEntry(id),
    listPartners(),
    listTopics(),
    listApprovers(),
  ]);
  if (!entry) notFound();
  const confirmedBy = new Set(entry.approvals.map((a) => a.partnerId));
  const missing = entry.approvedAt ? [] : missingApprovers(approvers, confirmedBy);
  const canDelete = me.isAdmin || (!entry.approvedAt && entry.createdById === me.id);
  return (
    <>
      <Link href="/ore" className="text-sm text-slate-500 hover:underline">
        ← Ore
      </Link>
      <PageTitle
        title={`${entry.topic} · ${formatDay(entry.date)}`}
        subtitle={`Inserite da ${entry.createdBy.name} · costo orario ${formatEuro(entry.hourlyRateCents)}`}
      />
      <Card
        title={entry.approvedAt ? "Confermate" : "In attesa di conferma"}
        className={`mb-6 ${entry.approvedAt ? "" : "border-amber-300"}`}
      >
        {entry.approvedAt ? (
          <p className="text-sm text-emerald-700">
            Confermate da tutti i soci il {formatDay(entry.approvedAt)}: sono nei conti.
          </p>
        ) : (
          <>
            <ul className="mb-4 space-y-1 text-sm">
              {approvers.map((p) => (
                <li key={p.id}>
                  {confirmedBy.has(p.id) ? (
                    <span className="text-emerald-700">✓ {p.name}: confermate</span>
                  ) : (
                    <span className="text-amber-700">… {p.name}: deve ancora confermare</span>
                  )}
                </li>
              ))}
            </ul>
            {missing.some((p) => p.id === me.id) && (
              <ActionForm action={confirmTime.bind(null, id)} submitLabel="Confermo queste ore" />
            )}
          </>
        )}
      </Card>
      <Card title="Modifica" className="mb-6">
        <p className="mb-3 text-sm text-slate-500">
          Salvando una modifica le ore tornano in attesa: gli altri soci devono confermarle di
          nuovo.
        </p>
        <ActionForm action={editTimeEntry.bind(null, id)} submitLabel="Salva modifiche">
          <TimeFields
            partners={partners.filter((p) => p.active || p.id === entry.partnerId)}
            topics={topics
              .filter((t) => t.active || t.name === entry.topic)
              .map((t) => t.name)
              .concat(topics.some((t) => t.name === entry.topic) ? [] : [entry.topic])}
            currentPartnerId={entry.partnerId}
            defaults={entry}
          />
        </ActionForm>
      </Card>
      {canDelete && (
        <Card title="Elimina">
          <ActionForm
            action={removeTimeEntry.bind(null, id)}
            submitLabel="Elimina registrazione"
            danger
          >
            <ConfirmDelete />
          </ActionForm>
        </Card>
      )}
    </>
  );
}
