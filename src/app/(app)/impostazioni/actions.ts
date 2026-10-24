"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/components/action-form";
import { FormError, checkbox, handle, requiredText, text } from "@/lib/form";
import { passwordProblem } from "@/lib/password";
import { requireAdmin, requirePartner } from "@/lib/session";
import { categoryNameTaken, createCategory, updateCategory } from "@/modules/expenses/service";
import { checkPassword, setPassword } from "@/modules/partners/service";
import { setPilotStudios } from "@/modules/settings/service";

export async function changeMyPassword(_: FormState, form: FormData): Promise<FormState> {
  const me = await requirePartner();
  return handle(async () => {
    if (!(await checkPassword(me.id, String(form.get("current") ?? ""))))
      throw new FormError("La password attuale non è corretta.");
    const password = String(form.get("password") ?? "");
    const problem = passwordProblem(password);
    if (problem) throw new FormError(problem);
    if (password !== String(form.get("confirm") ?? ""))
      throw new FormError("Le due password nuove non coincidono.");
    await setPassword(me.id, password);
    redirect("/accedi");
  });
}

export async function savePilotStudios(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  return handle(async () => {
    const value = Number(text(form, "pilotStudios") || "0");
    if (!Number.isInteger(value) || value < 0 || value > 10000)
      throw new FormError("Indica un numero intero di studi.");
    await setPilotStudios(value);
    revalidatePath("/", "layout");
    return "Salvato.";
  });
}

export async function addCategory(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  return handle(async () => {
    const name = requiredText(form, "name", "Nome");
    if (await categoryNameTaken(name)) throw new FormError("Questa categoria c'è già.");
    await createCategory(name);
    revalidatePath("/", "layout");
    return `Categoria "${name}" aggiunta.`;
  });
}

export async function editCategory(id: string, _: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  return handle(async () => {
    const name = requiredText(form, "name", "Nome");
    if (await categoryNameTaken(name, id)) throw new FormError("Questa categoria c'è già.");
    await updateCategory(id, { name, active: checkbox(form, "active") });
    revalidatePath("/", "layout");
    return "Salvato.";
  });
}
