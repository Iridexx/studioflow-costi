import { ActionForm } from "@/components/action-form";
import { Card, Field, inputClass } from "@/components/ui";
import { formatDay } from "@/lib/format";
import {
  acceptReopen,
  approveVersion,
  askReopen,
  withdrawReopen,
} from "@/app/(app)/accordo/actions";
import { approvalsOf } from "@/modules/agreement/service";

type Version = {
  id: string;
  number: number;
  note: string;
  createdAt: Date;
  finalizedAt: Date | null;
  reopenReason: string | null;
  reopenRequestedAt: Date | null;
  author: { name: string } | null;
  approvals: { partnerId: string; kind: "VALIDATE" | "REOPEN"; partner: { name: string } }[];
};

type Person = { id: string; name: string };

function Checklist({
  done,
  missing,
  doneLabel,
  missingLabel,
}: {
  done: Person[];
  missing: Person[];
  doneLabel: string;
  missingLabel: string;
}) {
  return (
    <ul className="mb-4 space-y-1 text-sm">
      {done.map((p) => (
        <li key={p.id} className="text-emerald-700">
          ✓ {p.name}: {doneLabel}
        </li>
      ))}
      {missing.map((p) => (
        <li key={p.id} className="text-amber-700">
          … {p.name}: {missingLabel}
        </li>
      ))}
    </ul>
  );
}

// Riapertura di un accordo definitivo: un socio la chiede con un motivo, gli altri confermano.
function Reopen({
  version,
  missingReopen,
  meId,
}: {
  version: Version;
  missingReopen: Person[];
  meId: string;
}) {
  if (!version.reopenRequestedAt)
    return (
      <details className="mt-4 text-sm">
        <summary className="cursor-pointer text-slate-600">
          Va cambiato qualcosa? Chiedi di riaprirlo
        </summary>
        <div className="mt-3">
          <ActionForm
            action={askReopen.bind(null, version.id)}
            submitLabel="Chiedi di riaprire l'accordo"
          >
            <Field
              label="Perché va riaperto"
              hint="Es. “Il commercialista chiede di cambiare l'articolo 14”. Si riapre quando sono d'accordo tutti i soci."
            >
              <input name="reason" required maxLength={300} className={inputClass} />
            </Field>
          </ActionForm>
        </div>
      </details>
    );
  const agreed = approvalsOf(version.approvals, "REOPEN").map((a) => ({
    id: a.partnerId,
    name: a.partner.name,
  }));
  const mustAgree = missingReopen.some((p) => p.id === meId);
  return (
    <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-4">
      <p className="mb-2 text-sm font-medium text-amber-900">
        Richiesta di riapertura del {formatDay(version.reopenRequestedAt)}: “{version.reopenReason}”
      </p>
      <Checklist
        done={agreed}
        missing={missingReopen}
        doneLabel="d'accordo"
        missingLabel="deve ancora rispondere"
      />
      <div className="flex flex-wrap gap-3">
        {mustAgree && (
          <ActionForm
            action={acceptReopen.bind(null, version.id)}
            submitLabel="Sono d'accordo, riapriamo"
            resetOnSuccess={false}
          />
        )}
        <ActionForm
          action={withdrawReopen.bind(null, version.id)}
          submitLabel={mustAgree ? "Non sono d'accordo" : "Ritira la richiesta"}
          danger
          resetOnSuccess={false}
        />
      </div>
    </div>
  );
}

// Stato dell'ultima versione: chi l'ha salvata, chi l'ha convalidata e chi manca.
export function AgreementStatus({
  version,
  missing,
  missingReopen,
  approversCount,
  meId,
}: {
  version: Version;
  missing: Person[];
  missingReopen: Person[];
  approversCount: number;
  meId: string;
}) {
  const mustApprove = missing.some((p) => p.id === meId);
  const final = !!version.finalizedAt;
  const validated = approvalsOf(version.approvals, "VALIDATE").map((a) => ({
    id: a.partnerId,
    name: a.partner.name,
  }));
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
        <>
          <p className="text-sm text-emerald-700">
            Convalidata da tutti i soci il {formatDay(version.finalizedAt!)}: il testo non si
            modifica più. Si può stampare e firmare.
          </p>
          <Reopen version={version} missingReopen={missingReopen} meId={meId} />
        </>
      ) : (
        <>
          <p className="mb-2 text-sm text-slate-600">
            L&apos;accordo diventa definitivo quando tutti i soci convalidano la stessa versione.
            Chi salva una modifica la convalida in automatico; ogni modifica crea una versione nuova
            da convalidare di nuovo.
          </p>
          <Checklist
            done={validated}
            missing={missing}
            doneLabel="convalidata"
            missingLabel="deve ancora convalidare"
          />
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
