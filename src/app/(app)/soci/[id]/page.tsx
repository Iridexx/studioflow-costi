import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { PartnerFields } from "@/components/partner-fields";
import { Card, Field, PageTitle, inputClass } from "@/components/ui";
import { MIN_PASSWORD_LENGTH } from "@/lib/password";
import { requireAdmin } from "@/lib/session";
import { getPartner } from "@/modules/partners/service";
import { editPartner } from "../actions";

export default async function PartnerPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const partner = await getPartner(id);
  if (!partner) notFound();
  return (
    <>
      <Link href="/soci" className="text-sm text-slate-500 hover:underline">
        ← Soci
      </Link>
      <PageTitle title={partner.name} />
      <Card>
        <ActionForm action={editPartner.bind(null, id)} submitLabel="Salva">
          <PartnerFields defaults={partner} />
          <Field
            label="Nuova password"
            hint={`Lascia vuoto per non cambiarla. Almeno ${MIN_PASSWORD_LENGTH} caratteri; il socio dovrà rientrare.`}
          >
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              className={inputClass}
            />
          </Field>
        </ActionForm>
        <p className="mt-4 text-xs text-slate-500">
          Cambiare il costo orario vale per le ore registrate da ora in poi: quelle già inserite
          mantengono il costo del giorno in cui sono state registrate.
        </p>
      </Card>
    </>
  );
}
