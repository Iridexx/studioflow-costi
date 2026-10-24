"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/components/action-form";
import { prisma } from "@/lib/db";
import { FormError, day, handle, hours, optionalText, requiredText, text } from "@/lib/form";
import { formatHours } from "@/lib/format";
import { requirePartner } from "@/lib/session";
import {
  createTimeEntry,
  deleteTimeEntry,
  getTimeEntry,
  updateTimeEntry,
  type TimeEntryInput,
} from "@/modules/time/service";

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
    topic: requiredText(form, "topic", "Argomento"),
    notes: optionalText(form, "notes"),
  };
}

export async function addTimeEntry(_: FormState, form: FormData): Promise<FormState> {
  const partner = await requirePartner();
  return handle(async () => {
    const input = await readTimeEntry(form);
    await createTimeEntry(input, partner.id);
    revalidatePath("/", "layout");
    return `${formatHours(input.minutes)} registrate.`;
  });
}

export async function editTimeEntry(id: string, _: FormState, form: FormData): Promise<FormState> {
  await requirePartner();
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
    await updateTimeEntry(id, input, rate);
    revalidatePath("/", "layout");
    redirect("/ore");
  });
}

export async function removeTimeEntry(id: string): Promise<FormState> {
  await requirePartner();
  await deleteTimeEntry(id);
  revalidatePath("/", "layout");
  redirect("/ore");
}
