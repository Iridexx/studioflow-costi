"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/components/action-form";
import { prisma } from "@/lib/db";
import { FormError, day, handle, hours, optionalText, requiredText, text } from "@/lib/form";
import { formatHours } from "@/lib/format";
import { requirePartner } from "@/lib/session";
import {
  confirmTimeEntry,
  createTimeEntry,
  ensureTopic,
  deleteTimeEntry,
  getTimeEntry,
  updateTimeEntry,
  type TimeEntryInput,
} from "@/modules/time/service";

// Argomento scelto dal menu, oppure scritto nuovo: in quel caso entra nel menu.
async function readTopic(form: FormData): Promise<string> {
  const choice = text(form, "topicChoice");
  if (choice && choice !== "__nuovo__") return choice;
  const name = requiredText(form, "topicNew", "Nuovo argomento");
  if (name.length > 80) throw new FormError("L'argomento è troppo lungo.");
  return ensureTopic(name);
}

async function readTimeEntry(form: FormData): Promise<TimeEntryInput> {
  const partnerId = text(form, "partnerId");
  if (!(await prisma.partner.findUnique({ where: { id: partnerId } })))
    throw new FormError("Scegli chi ha lavorato.");
  const minutes = hours(form, "hours", "Ore");
  if (minutes > 24 * 60)
    throw new FormError("Non si possono registrare più di 24 ore in un giorno.");
  return {
    partnerId,
    date: day(form, "date", "Data"),
    minutes,
    topic: await readTopic(form),
    notes: optionalText(form, "notes"),
  };
}

export async function addTimeEntry(_: FormState, form: FormData): Promise<FormState> {
  const partner = await requirePartner();
  return handle(async () => {
    const input = await readTimeEntry(form);
    const entry = await createTimeEntry(input, partner.id);
    revalidatePath("/", "layout");
    return entry.approvedAt
      ? `${formatHours(input.minutes)} registrate.`
      : `${formatHours(input.minutes)} registrate: entrano nei conti quando le confermano gli altri soci.`;
  });
}

export async function editTimeEntry(id: string, _: FormState, form: FormData): Promise<FormState> {
  const me = await requirePartner();
  return handle(async () => {
    const current = await getTimeEntry(id);
    if (!current) throw new FormError("Registrazione non trovata.");
    const input = await readTimeEntry(form);
    // Cambiando persona si usa il costo orario della nuova persona.
    let rate = current.hourlyRateCents;
    if (input.partnerId !== current.partnerId) {
      rate = (await prisma.partner.findUniqueOrThrow({ where: { id: input.partnerId } }))
        .hourlyRateCents;
    }
    await updateTimeEntry(id, input, rate, me.id);
    revalidatePath("/", "layout");
    redirect("/ore");
  });
}

// Ore già confermate le elimina solo un amministratore; in attesa anche chi le ha inserite.
export async function removeTimeEntry(id: string): Promise<FormState> {
  const me = await requirePartner();
  const entry = await getTimeEntry(id);
  if (!entry) redirect("/ore");
  if (!me.isAdmin && (entry.approvedAt || entry.createdById !== me.id))
    return { error: "Queste ore può eliminarle solo un amministratore." };
  await deleteTimeEntry(id);
  revalidatePath("/", "layout");
  redirect("/ore");
}

export async function confirmTime(id: string): Promise<FormState> {
  const me = await requirePartner();
  if (!(await getTimeEntry(id))) return { error: "Registrazione non trovata." };
  await confirmTimeEntry(id, me.id);
  revalidatePath("/", "layout");
  return { ok: "Confermate." };
}
