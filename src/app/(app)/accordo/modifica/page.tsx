import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { Card, Field, PageTitle, inputClass } from "@/components/ui";
import { requirePartner } from "@/lib/session";
import { getLatestVersion } from "@/modules/agreement/service";
import { saveNewVersion } from "../actions";

export default async function EditAgreementPage() {
  await requirePartner();
  const { version } = await getLatestVersion();
  if (version.finalizedAt) redirect("/accordo");
  return (
    <>
      <Link href="/accordo" className="text-sm text-slate-500 hover:underline">
        ← Accordo
      </Link>
      <PageTitle
        title="Modifica l'accordo"
        subtitle={`Parti dalla versione ${version.number}. Salvando nasce la versione ${version.number + 1}: la precedente resta com'era e l'altro socio vede subito cosa hai cambiato.`}
      />
      <Card>
        <ActionForm
          action={saveNewVersion}
          submitLabel="Salva la nuova versione"
          resetOnSuccess={false}
        >
          <input type="hidden" name="baseNumber" value={version.number} />
          <Field
            label="Cosa hai cambiato e perché"
            hint="Una riga per l'altro socio, es. “Commissione portata al 10%: il 15% mi sembra alto”"
          >
            <input name="note" required maxLength={300} className={inputClass} />
          </Field>
          <Field
            label="Testo dell'accordo"
            hint="Righe che iniziano con # sono titoli, con - sono elenchi; il testo tra ** e ** è in grassetto. Lascia {{A.nome}}, {{B.codiceFiscale}} e simili: il programma li sostituisce con i dati dei soci."
          >
            <textarea
              name="text"
              required
              defaultValue={version.text}
              rows={30}
              className={`${inputClass} font-mono text-xs leading-relaxed`}
            />
          </Field>
        </ActionForm>
      </Card>
    </>
  );
}
