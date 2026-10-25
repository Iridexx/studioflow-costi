import { ActionForm } from "@/components/action-form";
import { Card } from "@/components/ui";
import { formatDay } from "@/lib/format";
import { approveVersion } from "@/app/(app)/accordo/actions";

type Version = {
  id: string;
  number: number;
  note: string;
  createdAt: Date;
  finalizedAt: Date | null;
  author: { name: string } | null;
  approvals: { partnerId: string; partner: { name: string } }[];
};

// Stato dell'ultima versione: chi l'ha salvata, chi l'ha convalidata e chi manca.
export function AgreementStatus({
  version,
  missing,
  approversCount,
  meId,
}: {
  version: Version;
  missing: { id: string; name: string }[];
  approversCount: number;
  meId: string;
}) {
  const mustApprove = missing.some((p) => p.id === meId);
  const final = !!version.finalizedAt;
  return (
    <Card
      title={final ? "Accordo definitivo" : `Versione ${version.number} — bozza in discussione`}
      className={final ? "border-emerald-300" : "border-amber-300"}
    >
      <p className="mb-3 text-sm text-slate-700">
        {version.author
          ? `Salvata da ${version.author.name} il ${formatDay(version.createdAt)}: “${version.note}”`
          : `Bozza iniziale del ${formatDay(version.createdAt)}.`}
      </p>
      {final ? (
        <p className="text-sm text-emerald-700">
          Convalidata da tutti i soci il {formatDay(version.finalizedAt!)}: il testo non si modifica
          più. Si può stampare e firmare.
        </p>
      ) : (
        <>
          <p className="mb-2 text-sm text-slate-600">
            L&apos;accordo diventa definitivo quando tutti i soci convalidano la stessa versione.
            Chi salva una modifica la convalida in automatico; ogni modifica crea una versione nuova
            da convalidare di nuovo.
          </p>
          <ul className="mb-4 space-y-1 text-sm">
            {version.approvals.map((a) => (
              <li key={a.partnerId} className="text-emerald-700">
                ✓ {a.partner.name}: convalidata
              </li>
            ))}
            {missing.map((p) => (
              <li key={p.id} className="text-amber-700">
                … {p.name}: deve ancora convalidare
              </li>
            ))}
          </ul>
          {approversCount < 2 && (
            <p className="mb-4 text-sm text-slate-500">
              Resta una bozza finché nel programma non entra almeno un altro socio.
            </p>
          )}
          {mustApprove && (
            <ActionForm
              action={approveVersion.bind(null, version.id)}
              submitLabel={`Convalido la versione ${version.number}`}
              resetOnSuccess={false}
            />
          )}
        </>
      )}
    </Card>
  );
}
