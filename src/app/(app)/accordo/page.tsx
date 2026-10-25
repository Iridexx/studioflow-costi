import { ActionForm } from "@/components/action-form";
import { AgreementText } from "@/components/agreement-text";
import { PrintButton } from "@/components/print-button";
import { Card, Field, PageTitle, inputClass } from "@/components/ui";
import { dayInput } from "@/lib/format";
import { requirePartner } from "@/lib/session";
import { missingFields, parseAgreement } from "@/modules/agreement/render";
import { getAgreementParties, loadAgreementText } from "@/modules/agreement/service";
import { listPartners } from "@/modules/partners/service";
import { saveAgreementData, saveAgreementRoles } from "./actions";

type PartnerRow = Awaited<ReturnType<typeof listPartners>>[number];

function DataForm({ partner }: { partner: PartnerRow }) {
  return (
    <ActionForm
      action={saveAgreementData.bind(null, partner.id)}
      submitLabel="Salva i dati"
      resetOnSuccess={false}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Codice fiscale">
          <input
            name="taxCode"
            autoCapitalize="characters"
            maxLength={16}
            defaultValue={partner.taxCode ?? ""}
            className={inputClass}
          />
        </Field>
        <Field label="Data di nascita">
          <input
            name="birthDate"
            type="date"
            defaultValue={partner.birthDate ? dayInput(partner.birthDate) : ""}
            className={inputClass}
          />
        </Field>
        <Field label="Luogo di nascita" hint="Comune e provincia, es. Roma (RM)">
          <input name="birthPlace" defaultValue={partner.birthPlace ?? ""} className={inputClass} />
        </Field>
        <Field label="Residenza" hint="Via, numero, CAP, comune e provincia">
          <input name="residence" defaultValue={partner.residence ?? ""} className={inputClass} />
        </Field>
      </div>
    </ActionForm>
  );
}

export default async function AgreementPage() {
  const me = await requirePartner();
  const [partners, parties, text] = await Promise.all([
    listPartners({ onlyActive: true }),
    getAgreementParties(),
    loadAgreementText(),
  ]);
  const mine = partners.find((p) => p.id === me.id);
  const others = partners.filter((p) => p.id !== me.id);
  const missing = missingFields(parties);
  const complete = missing.every((m) => m.labels.length === 0);
  const roleA = partners.find((p) => p.agreementRole === "A");
  const roleB = partners.find((p) => p.agreementRole === "B");

  return (
    <>
      <div className="print:hidden">
        <PageTitle
          title="Accordo tra i soci"
          subtitle="Bozza dell'accordo con i dati dei soci. Ognuno inserisce qui i propri dati e il testo si aggiorna da solo."
        />
        <div className="mb-6 grid gap-6 lg:grid-cols-2">
          <Card title="Cosa manca">
            {complete ? (
              <p className="text-sm text-emerald-700">
                Tutti i dati delle due parti sono inseriti: l&apos;accordo si può stampare.
              </p>
            ) : (
              <ul className="space-y-2 text-sm text-slate-700">
                {missing.map(({ party, labels }) => {
                  const who = party === "A" ? roleA : roleB;
                  return (
                    <li key={party}>
                      <span className="font-medium">
                        Parte {party}
                        {who ? ` (${who.name})` : ""}:
                      </span>{" "}
                      {!who
                        ? "socio non ancora scelto dall'amministratore."
                        : labels.length === 0
                          ? "completa."
                          : `manca ${labels.join(", ")}.`}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
          {me.isAdmin && (
            <Card title="Parti dell'accordo">
              <ActionForm action={saveAgreementRoles} submitLabel="Salva" resetOnSuccess={false}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Parte A — sviluppo">
                    <select name="roleA" defaultValue={roleA?.id ?? ""} className={inputClass}>
                      <option value="">Nessuno</option>
                      {partners.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Parte B — commerciale e spese">
                    <select name="roleB" defaultValue={roleB?.id ?? ""} className={inputClass}>
                      <option value="">Nessuno</option>
                      {partners.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              </ActionForm>
            </Card>
          )}
          {mine && (
            <Card title="I tuoi dati per l'accordo">
              <p className="mb-4 text-sm text-slate-500">
                Il nome è quello del tuo profilo ({mine.name}). Servono solo per il testo
                dell&apos;accordo e li vedono soltanto i soci.
              </p>
              <DataForm partner={mine} />
            </Card>
          )}
          {me.isAdmin &&
            others.map((p) => (
              <Card key={p.id} title={`Dati di ${p.name}`}>
                <p className="mb-4 text-sm text-slate-500">
                  Di solito li inserisce il socio stesso; da qui puoi correggerli.
                </p>
                <DataForm partner={p} />
              </Card>
            ))}
        </div>
      </div>
      <Card className="print:border-0 print:p-0">
        <div className="mb-4 flex justify-end">
          <PrintButton label="Stampa o salva in PDF" />
        </div>
        <AgreementText blocks={parseAgreement(text, parties)} />
      </Card>
    </>
  );
}
