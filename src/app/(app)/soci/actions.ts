"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/components/action-form";
import { prisma } from "@/lib/db";
import {
  FormError,
  checkbox,
  day,
  euro,
  handle,
  optionalText,
  percent,
  requiredText,
  text,
} from "@/lib/form";
import { appUrlForPartners } from "@/lib/app-url";
import { parseEuro } from "@/lib/format";
import { passwordProblem } from "@/lib/password";
import { requireAdmin, requirePartner, type CurrentPartner } from "@/lib/session";
import { createContribution, deleteContribution } from "@/modules/contributions/service";
import {
  countAdmins,
  createPartner,
  setPassword,
  updatePartner,
  usernameTaken,
  type PartnerInput,
} from "@/modules/partners/service";
import { isMailConfigured, sendMail } from "@/modules/mail/service";
import { buildInvite } from "@/modules/partners/invite";

async function readPartner(form: FormData, exceptId?: string): Promise<PartnerInput> {
  const username = text(form, "username").toLowerCase() || null;
  if (username && !/^[a-z0-9._-]{3,30}$/.test(username))
    throw new FormError("Nome utente: da 3 a 30 caratteri tra lettere, numeri, punto e trattino.");
  if (username && (await usernameTaken(username, exceptId)))
    throw new FormError("Questo nome utente è già usato.");
  const email = text(form, "email").toLowerCase() || null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new FormError("L'indirizzo email non sembra corretto.");
  const rate = parseEuro(text(form, "hourlyRate") || "0");
  if (rate === null || rate < 0) throw new FormError("Indica un costo orario valido (es. 25).");
  return {
    name: requiredText(form, "name", "Nome e cognome"),
    username,
    email,
    shareBasisPoints: percent(form, "share", "Quota"),
    hourlyRateCents: rate,
    isAdmin: checkbox(form, "isAdmin"),
    active: checkbox(form, "active"),
  };
}

function readNewPassword(form: FormData): string | null {
  const password = String(form.get("password") ?? "");
  if (!password) return null;
  const problem = passwordProblem(password);
  if (problem) throw new FormError(problem);
  return password;
}

// Manda al socio le credenziali provvisorie. Se l'invio è impostato e il socio ha un'email parte
// subito dal programma; altrimenti (o se l'invio non riesce) si mostra l'email già pronta da
// mandare a mano.
async function deliverInvite(
  input: PartnerInput,
  password: string,
  me: CurrentPartner,
  done: string,
): Promise<FormState> {
  const invite = buildInvite({
    name: input.name,
    email: input.email,
    username: input.username ?? "",
    password,
    appUrl: await appUrlForPartners(),
    senderName: me.name,
  });
  if (!input.email) return { ok: `${done} Non ha un'email: manda tu queste credenziali.`, invite };
  if (!(await isMailConfigured()))
    return {
      ok: `${done} Per spedire le credenziali direttamente dal programma imposta la tua casella in Impostazioni → Invio email; per ora puoi mandarle da qui.`,
      invite,
    };
  if (invite.localAddress)
    return {
      ok: `${done} Email non spedita: l'indirizzo del programma è "localhost", che dal PC del socio non funziona. Salvalo in Impostazioni → Indirizzo per i soci, oppure correggilo qui e mandala.`,
      invite,
    };
  try {
    await sendMail({ to: input.email, subject: invite.subject, text: invite.body });
  } catch (error) {
    return {
      ok: done,
      error: `Email non spedita. ${error instanceof Error ? error.message : ""}`,
      invite,
    };
  }
  return { ok: `${done} Email con le credenziali spedita a ${input.email}.` };
}

// Solo un amministratore aggiunge soci. La password che sceglie è provvisoria: il socio la
// riceve per email e al primo accesso deve cambiarla.
export async function addPartner(_: FormState, form: FormData): Promise<FormState> {
  const me = await requireAdmin();
  return handle(async () => {
    const input = await readPartner(form);
    const password = readNewPassword(form);
    if (password && !input.username) throw new FormError("Per la password serve un nome utente.");
    await createPartner(input, password, { temporary: true });
    revalidatePath("/", "layout");
    if (!password) return `${input.name} aggiunto.`;
    return deliverInvite(
      input,
      password,
      me,
      `${input.name} aggiunto: al primo accesso dovrà cambiare la password.`,
    );
  });
}

export async function editPartner(id: string, _: FormState, form: FormData): Promise<FormState> {
  const me = await requireAdmin();
  return handle(async () => {
    const input = await readPartner(form, id);
    const password = readNewPassword(form);
    // Deve restare almeno un amministratore che può entrare.
    if ((!input.isAdmin || !input.active || !input.username) && (await countAdmins(id)) === 0)
      throw new FormError("Deve restare almeno un amministratore attivo con nome utente.");
    if (password && !input.username) throw new FormError("Per la password serve un nome utente.");
    await updatePartner(id, input);
    const self = id === me.id;
    // La propria password è definitiva; quella data a un altro socio è provvisoria.
    if (password) await setPassword(id, password, { temporary: !self });
    revalidatePath("/", "layout");
    if (self && (password || !input.active)) redirect("/accedi");
    if (!password) redirect("/soci");
    return deliverInvite(
      input,
      password,
      me,
      `Salvato: al prossimo accesso ${input.name} dovrà cambiare la password.`,
    );
  });
}

export async function addContribution(_: FormState, form: FormData): Promise<FormState> {
  const me = await requirePartner();
  return handle(async () => {
    const partnerId = text(form, "partnerId");
    if (!(await prisma.partner.findUnique({ where: { id: partnerId } })))
      throw new FormError("Scegli il socio.");
    const amountCents = euro(form, "amount", "Importo");
    await createContribution(
      {
        partnerId,
        amountCents,
        date: day(form, "date", "Data"),
        notes: optionalText(form, "notes"),
      },
      me.id,
    );
    revalidatePath("/", "layout");
    return "Versamento registrato.";
  });
}

export async function removeContribution(id: string): Promise<FormState> {
  await requirePartner();
  await deleteContribution(id);
  revalidatePath("/", "layout");
  return { ok: "Versamento eliminato." };
}

// Dal riquadro dell'email pronta: spedisce il testo (eventualmente corretto) dal programma.
export async function sendInviteEmail(
  to: string,
  subject: string,
  body: string,
): Promise<FormState> {
  await requireAdmin();
  const address = to.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) return { error: "Scrivi l'email del socio." };
  if (!(await isMailConfigured()))
    return { error: "Prima imposta la tua casella in Impostazioni → Invio email." };
  try {
    await sendMail({ to: address, subject, text: body });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Invio non riuscito." };
  }
  return { ok: `Email spedita a ${address}.` };
}
