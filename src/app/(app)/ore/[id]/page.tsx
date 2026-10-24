import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { TimeFields } from "@/components/time-fields";
import { Card, ConfirmDelete, PageTitle } from "@/components/ui";
import { formatDay, formatEuro } from "@/lib/format";
import { listPartners } from "@/modules/partners/service";
import { getTimeEntry, listTopics } from "@/modules/time/service";
import { editTimeEntry, removeTimeEntry } from "../actions";

export default async function TimeEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [entry, partners, topics] = await Promise.all([
    getTimeEntry(id),
    listPartners(),
    listTopics(),
  ]);
  if (!entry) notFound();
  return (
    <>
      <Link href="/ore" className="text-sm text-slate-500 hover:underline">
        ← Ore
      </Link>
      <PageTitle
        title={`${entry.topic} · ${formatDay(entry.date)}`}
        subtitle={`Inserite da ${entry.createdBy.name} · costo orario ${formatEuro(entry.hourlyRateCents)}`}
      />
      <Card title="Modifica" className="mb-6">
        <ActionForm action={editTimeEntry.bind(null, id)} submitLabel="Salva modifiche">
          <TimeFields
            partners={partners.filter((p) => p.active || p.id === entry.partnerId)}
            topics={topics}
            currentPartnerId={entry.partnerId}
            defaults={entry}
          />
        </ActionForm>
      </Card>
      <Card title="Elimina">
        <ActionForm
          action={removeTimeEntry.bind(null, id)}
          submitLabel="Elimina registrazione"
          danger
        >
          <ConfirmDelete />
        </ActionForm>
      </Card>
    </>
  );
}
