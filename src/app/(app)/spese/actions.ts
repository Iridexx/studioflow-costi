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
  attachmentCountProblem,
  attachmentRequired,
  cleanFileName,
  detectAttachmentType,
  fileProblem,
} from "@/modules/expenses/attachments";
import { getAttachmentRequired } from "@/modules/settings/service";
import {
  addExpenseMessage,
  approveExpense,
  createExpense,
  deleteExpense,
  getExpense,
  listAttachmentIds,
  updateExpense,
  type ExpenseInput,
  type NewAttachment,
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

// File scelti nel campo "Allegati": tipo riconosciuto dal contenuto e dimensione controllata.
async function readAttachments(form: FormData): Promise<NewAttachment[]> {
  const files = form
    .getAll("attachments")
    // Un campo file lasciato vuoto arriva comunque come file di 0 byte: si salta. Un file vuoto
    // scelto davvero lo segnala già il modulo nel browser.
    .filter((f): f is File => f instanceof File && f.size > 0);
  const result: NewAttachment[] = [];
  for (const file of files) {
    const problem = fileProblem(file);
    if (problem) throw new FormError(problem);
    const data = new Uint8Array(await file.arrayBuffer());
    const contentType = detectAttachmentType(data);
    if (!contentType)
      throw new FormError(`"${file.name}" non è un PDF né una foto JPG, PNG o WebP.`);
    result.push({
      fileName: cleanFileName(file.name, contentType),
      contentType,
      size: data.byteLength,
      data,
    });
  }
  return result;
}

export async function addExpense(_: FormState, form: FormData): Promise<FormState> {
  const partner = await requirePartner();
  return handle(async () => {
    const input = await readExpense(form);
    const attachments = await readAttachments(form);
    const required = attachmentRequired(await getAttachmentRequired(), {
      isNew: true,
      attachmentsBefore: 0,
    });
    const problem = attachmentCountProblem(attachments.length, required);
    if (problem) throw new FormError(problem);
    const expense = await createExpense(input, partner.id, attachments);
    revalidatePath("/", "layout");
    if (!(await getExpense(expense.id))?.approvedAt)
      return `Spesa "${input.description}" inviata agli altri soci: entra nei conti quando l'hanno approvata tutti.`;
    return `Spesa "${input.description}" salvata.`;
  });
}

export async function editExpense(id: string, _: FormState, form: FormData): Promise<FormState> {
  const me = await requirePartner();
  return handle(async () => {
    const input = await readExpense(form);
    const add = await readAttachments(form);
    const before = (await listAttachmentIds(id)).map((a) => a.id);
    const removeIds = form
      .getAll("removeAttachment")
      .map(String)
      .filter((r) => before.includes(r));
    const required = attachmentRequired(await getAttachmentRequired(), {
      isNew: false,
      attachmentsBefore: before.length,
    });
    const problem = attachmentCountProblem(before.length - removeIds.length + add.length, required);
    if (problem) throw new FormError(problem);
    await updateExpense(id, input, me.id, { add, removeIds });
    revalidatePath("/", "layout");
    redirect(`/spese/${id}`);
  });
}

// Una spesa già nei conti la elimina solo un amministratore; una in attesa anche chi l'ha inserita.
export async function removeExpense(id: string): Promise<FormState> {
  const me = await requirePartner();
  const expense = await getExpense(id);
  if (!expense) redirect("/spese");
  if (!me.isAdmin && (expense.approvedAt || expense.createdById !== me.id))
    return { error: "Questa spesa può eliminarla solo un amministratore." };
  await deleteExpense(id);
  revalidatePath("/", "layout");
  redirect("/spese");
}

export async function approve(id: string): Promise<FormState> {
  const me = await requirePartner();
  await approveExpense(id, me.id);
  revalidatePath("/", "layout");
  const expense = await getExpense(id);
  return {
    ok: expense?.approvedAt
      ? "Approvata: ora la spesa è nei conti."
      : "Approvata. Manca ancora l'approvazione di altri soci.",
  };
}

export async function sendMessage(id: string, _: FormState, form: FormData): Promise<FormState> {
  const me = await requirePartner();
  return handle(async () => {
    const body = requiredText(form, "body", "Messaggio");
    if (body.length > 4000) throw new FormError("Il messaggio è troppo lungo.");
    if (!(await getExpense(id))) throw new FormError("Spesa non trovata.");
    await addExpenseMessage(id, me.id, body);
    revalidatePath("/", "layout");
    return "Messaggio inviato.";
  });
}
