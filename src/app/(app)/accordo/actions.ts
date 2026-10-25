"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "@/components/action-form";
import { FormError, handle, optionalDay, optionalText, text } from "@/lib/form";
import { requireAdmin, requirePartner } from "@/lib/session";
import { setAgreementRoles, updateAgreementData } from "@/modules/agreement/service";
import { getPartner } from "@/modules/partners/service";

// Codice fiscale delle persone fisiche: 16 caratteri (con le eventuali lettere di omocodia).
const TAX_CODE = /^[A-Z]{6}[0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$/;

// Il socio collegato salva i propri dati; un amministratore anche quelli degli altri.
export async function saveAgreementData(
  partnerId: string,
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const me = await requirePartner();
  return handle(async () => {
    if (partnerId !== me.id && !me.isAdmin)
      throw new FormError("Puoi modificare solo i tuoi dati.");
    const partner = await getPartner(partnerId);
    if (!partner) throw new FormError("Socio non trovato.");
    const taxCode = text(form, "taxCode").toUpperCase().replace(/\s/g, "") || null;
    if (taxCode && !TAX_CODE.test(taxCode))
      throw new FormError("Il codice fiscale non sembra corretto (16 caratteri).");
    const birthDate = optionalDay(form, "birthDate", "Data di nascita");
    if (birthDate && birthDate > new Date())
      throw new FormError("La data di nascita è nel futuro.");
    await updateAgreementData(partnerId, {
      taxCode,
      birthDate,
      birthPlace: optionalText(form, "birthPlace"),
      residence: optionalText(form, "residence"),
    });
    revalidatePath("/accordo");
    return partnerId === me.id ? "I tuoi dati sono salvati." : `Dati di ${partner.name} salvati.`;
  });
}

export async function saveAgreementRoles(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  return handle(async () => {
    const A = text(form, "roleA") || null;
    const B = text(form, "roleB") || null;
    if (A && A === B) throw new FormError("La Parte A e la Parte B devono essere soci diversi.");
    for (const id of [A, B])
      if (id && !(await getPartner(id))) throw new FormError("Socio non trovato.");
    await setAgreementRoles({ A, B });
    revalidatePath("/accordo");
    return "Parti dell'accordo salvate.";
  });
}
