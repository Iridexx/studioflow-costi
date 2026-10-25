import Link from "next/link";
import { notFound } from "next/navigation";
import { AgreementDiff } from "@/components/agreement-diff";
import { AgreementStatus } from "@/components/agreement-status";
import { AgreementText } from "@/components/agreement-text";
import { Card, PageTitle } from "@/components/ui";
import { formatDay } from "@/lib/format";
import { requirePartner } from "@/lib/session";
import { describeSummary, diffAgreement, summarize } from "@/modules/agreement/diff";
import { parseAgreement } from "@/modules/agreement/render";
import {
  getAgreementParties,
  getLatestVersion,
  getVersionWithPrevious,
} from "@/modules/agreement/service";

export default async function AgreementVersionPage({
  params,
}: {
  params: Promise<{ numero: string }>;
}) {
  const me = await requirePartner();
  const number = Number((await params).numero);
  if (!Number.isInteger(number)) notFound();
  const [{ version, previous }, latest, parties] = await Promise.all([
    getVersionWithPrevious(number),
    getLatestVersion(),
    getAgreementParties(),
  ]);
  if (!version) notFound();
  const isLatest = latest.version.id === version.id;
  const changes = previous ? diffAgreement(previous.text, version.text) : [];
  return (
    <>
      <Link href="/accordo" className="text-sm text-slate-500 hover:underline">
        ← Accordo
      </Link>
      <PageTitle
        title={`Versione ${version.number} dell'accordo`}
        subtitle={
          version.author
            ? `Salvata da ${version.author.name} il ${formatDay(version.createdAt)}`
            : `Bozza iniziale del ${formatDay(version.createdAt)}`
        }
      />
      <div className="space-y-6">
        {isLatest ? (
          <AgreementStatus {...latest} meId={me.id} />
        ) : (
          <Card title="Versione superata">
            <p className="text-sm text-slate-700">
              “{version.note}”. Dopo questa è stata salvata almeno un&apos;altra versione: quella
              attuale è la{" "}
              <Link href={`/accordo/versioni/${latest.version.number}`} className="underline">
                versione {latest.version.number}
              </Link>
              .
            </p>
          </Card>
        )}
        {previous ? (
          <Card title={`Cosa è cambiato rispetto alla versione ${previous.number}`}>
            <p className="mb-4 text-sm text-slate-500">
              {changes.length > 0
                ? `${describeSummary(summarize(changes))}. Il resto del testo è uguale.`
                : "Il testo è lo stesso della versione precedente."}
            </p>
            {changes.length > 0 && <AgreementDiff groups={changes} />}
          </Card>
        ) : (
          <Card>
            <p className="text-sm text-slate-500">
              È la prima versione: non c&apos;è niente con cui confrontarla.
            </p>
          </Card>
        )}
        <details className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
          <summary className="cursor-pointer text-sm font-medium text-slate-900">
            Testo completo della versione {version.number}
          </summary>
          <div className="mt-4">
            <AgreementText blocks={parseAgreement(version.text, parties)} />
          </div>
        </details>
      </div>
    </>
  );
}
