"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/components/action-form";
import { FormError, checkbox, handle, requiredText, text } from "@/lib/form";
import { passwordProblem } from "@/lib/password";
import { requireAdmin, requirePartner } from "@/lib/session";
import { categoryNameTaken, createCategory, updateCategory } from "@/modules/expenses/service";
import { checkPassword, setPassword } from "@/modules/partners/service";
import { findProvider, resolveServer } from "@/modules/mail/providers";
import {
  deleteMailSettings,
  getMailSettings,
  saveMailSettings,
  sendMail,
} from "@/modules/mail/service";
import { normalizeAppUrl } from "@/modules/partners/invite";
import { setAppUrl, setPilotStudios } from "@/modules/settings/service";
import { createTopic, topicNameTaken, updateTopic } from "@/modules/time/service";

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

export async function saveAppUrl(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  return handle(async () => {
    const raw = text(form, "appUrl");
    const url = normalizeAppUrl(raw);
    if (raw && !url) throw new FormError("Indirizzo non valido (es. http://nome-pc:3100).");
    await setAppUrl(url);
    revalidatePath("/", "layout");
    return url ? `Salvato: ${url}` : "Indirizzo tolto: si userà quello da cui apri il programma.";
  });
}

// Salva la casella solo se un'email di prova parte davvero: così si scopre subito se la password
// è sbagliata, e non quando si aggiunge un socio.
export async function saveMailSetup(_: FormState, form: FormData): Promise<FormState> {
  const me = await requireAdmin();
  return handle(async () => {
    const provider = text(form, "provider");
    if (!findProvider(provider)) throw new FormError("Scegli il servizio di posta.");
    const user = text(form, "user").toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user)) throw new FormError("Scrivi la tua email.");
    const saved = await getMailSettings();
    // Gmail mostra la password per le app a gruppi di 4 lettere: gli spazi non contano.
    const raw = String(form.get("password") ?? "");
    const typed = provider === "gmail" ? raw.replace(/\s+/g, "") : raw;
    const password = typed || (saved?.user === user ? saved.password : "");
    if (!password) throw new FormError("Scrivi la password della casella.");
    const port = Number(text(form, "port") || "465");
    if (provider === "other" && (!text(form, "host") || !Number.isInteger(port) || port <= 0))
      throw new FormError("Indica server e porta della posta in uscita.");
    const server = resolveServer(provider, text(form, "host"), port);
    const settings = {
      provider,
      ...server,
      user,
      password,
      fromName: text(form, "fromName") || me.name,
    };
    try {
      await sendMail(
        {
          to: user,
          subject: "StudioFlow Costi: prova di invio",
          text: "Se leggi questa email, StudioFlow Costi può spedire le credenziali ai soci.",
        },
        settings,
      );
    } catch (error) {
      throw new FormError(error instanceof Error ? error.message : "Invio di prova non riuscito.");
    }
    await saveMailSettings(settings);
    revalidatePath("/", "layout");
    return `Fatto: ti ho mandato un'email di prova a ${user}. Da ora le credenziali ai soci partono da sole.`;
  });
}

export async function removeMailSetup(): Promise<FormState> {
  await requireAdmin();
  await deleteMailSettings();
  revalidatePath("/", "layout");
  return { ok: "Invio delle email disattivato." };
}

// Argomenti delle ore: li gestisce ogni socio, come quando li scrive registrando le ore.
export async function addTopic(_: FormState, form: FormData): Promise<FormState> {
  await requirePartner();
  return handle(async () => {
    const name = requiredText(form, "name", "Argomento");
    if (await topicNameTaken(name)) throw new FormError("Questo argomento c'è già.");
    await createTopic(name);
    revalidatePath("/", "layout");
    return `Argomento "${name}" aggiunto.`;
  });
}

export async function editTopic(id: string, _: FormState, form: FormData): Promise<FormState> {
  await requirePartner();
  return handle(async () => {
    const name = requiredText(form, "name", "Argomento");
    if (await topicNameTaken(name, id)) throw new FormError("Questo argomento c'è già.");
    await updateTopic(id, { name, active: checkbox(form, "active") });
    revalidatePath("/", "layout");
    return "Salvato.";
  });
}
