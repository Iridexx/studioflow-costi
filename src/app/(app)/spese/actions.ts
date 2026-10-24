"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/components/action-form";
import {
  FormError,
  day,
  euro,
  handle,
  optionalDay,
  optionalText,
  requiredText,
  text,
} from "@/lib/form";
import { prisma } from "@/lib/db";
import { requirePartner } from "@/lib/session";
import {
  createExpense,
  deleteExpense,
  updateExpense,
  type ExpenseInput,
} from "@/modules/expenses/service";

const RECURRENCES = ["ONE_OFF", "MONTHLY", "YEARLY"] as const;

async function readExpense(form: FormData): Promise<ExpenseInput> {
  const recurrence = text(form, "recurrence") as ExpenseInput["recurrence"];
  if (!RECURRENCES.includes(recurrence)) throw new FormError("Scegli la ricorrenza.");
  const date = day(form, "date", "Data");
  const endDate =
    recurrence === "ONE_OFF" ? null : optionalDay(form, "endDate", "Fine abbonamento");
  if (endDate && endDate < date)
    throw new FormError("La fine dell'abbonamento è prima del primo addebito.");
  const categoryId = text(form, "categoryId");
  if (!(await prisma.category.findUnique({ where: { id: categoryId } })))
    throw new FormError("Scegli una categoria.");
  const paidById = text(form, "paidById") || null;
  if (paidById && !(await prisma.partner.findUnique({ where: { id: paidById } })))
    throw new FormError("Socio non trovato.");
  const vat = Number(text(form, "vat"));
  return {
    date,
    endDate,
    description: requiredText(form, "description", "Descrizione"),
    supplier: optionalText(form, "supplier"),
    categoryId,
    amountCents: euro(form, "amount", "Importo"),
    vatBasisPoints: Number.isFinite(vat) && vat >= 0 && vat <= 100 ? Math.round(vat * 100) : 0,
    recurrence,
    paidById,
    notes: optionalText(form, "notes"),
  };
}

export async function addExpense(_: FormState, form: FormData): Promise<FormState> {
  const partner = await requirePartner();
  return handle(async () => {
    const input = await readExpense(form);
    await createExpense(input, partner.id);
    revalidatePath("/", "layout");
    return `Spesa "${input.description}" salvata.`;
  });
}

export async function editExpense(id: string, _: FormState, form: FormData): Promise<FormState> {
  await requirePartner();
  return handle(async () => {
    await updateExpense(id, await readExpense(form));
    revalidatePath("/", "layout");
    redirect("/spese");
  });
}

export async function removeExpense(id: string): Promise<FormState> {
  await requirePartner();
  await deleteExpense(id);
  revalidatePath("/", "layout");
  redirect("/spese");
}
