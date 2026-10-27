import { prisma } from "@/lib/db";
import type { Recurrence } from "@/generated/prisma/client";
import { awaitsReply, isFullyApproved, missingApprovers } from "@/modules/expenses/approval";

export type ExpenseInput = {
  date: Date;
  endDate: Date | null;
  description: string;
  supplier: string | null;
  categoryId: string;
  amountCents: number;
  vatBasisPoints: number;
  recurrence: Recurrence;
  paidById: string | null;
  partyBShareBasisPoints: number | null;
  notes: string | null;
};

// File già controllato (tipo riconosciuto dal contenuto, dimensione nei limiti).
export type NewAttachment = {
  fileName: string;
  contentType: string;
  size: number;
  data: Uint8Array<ArrayBuffer>;
};

// Dati dell'allegato senza il file: per gli elenchi.
const attachmentInfo = {
  select: { id: true, fileName: true, contentType: true, size: true, createdAt: true },
  orderBy: { createdAt: "asc" },
} as const;

const include = {
  category: { select: { name: true } },
  paidBy: { select: { name: true } },
  createdBy: { select: { name: true } },
} as const;

// Solo le spese approvate da tutti: sono quelle che entrano nei conti.
export function listExpenses() {
  return prisma.expense.findMany({
    where: { approvedAt: { not: null } },
    include: { ...include, _count: { select: { attachments: true } } },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
}

export function getExpense(id: string) {
  return prisma.expense.findUnique({
    where: { id },
    include: {
      ...include,
      approvals: { select: { partnerId: true, createdAt: true } },
      attachments: attachmentInfo,
      messages: {
        include: { author: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

// Soci che devono approvare: quelli che possono entrare nel programma.
export function listApprovers() {
  return prisma.partner.findMany({
    where: { active: true, username: { not: null }, passwordHash: { not: null } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

// Spese in attesa, con chi manca all'appello e se tocca al socio indicato fare qualcosa.
export async function listPendingExpenses(partnerId: string) {
  const [expenses, approvers] = await Promise.all([
    prisma.expense.findMany({
      where: { approvedAt: null },
      include: {
        ...include,
        approvals: { select: { partnerId: true } },
        messages: { select: { authorId: true }, orderBy: { createdAt: "desc" }, take: 1 },
        _count: { select: { messages: true, attachments: true } },
      },
      orderBy: [{ createdAt: "desc" }],
    }),
    listApprovers(),
  ]);
  return expenses.map((e) => {
    const missing = missingApprovers(
      approvers,
      e.approvals.map((a) => a.partnerId),
    );
    const mustApprove = missing.some((p) => p.id === partnerId);
    const mustReply = awaitsReply(e.createdById, partnerId, e.messages[0]?.authorId ?? null);
    return {
      expense: e,
      missing,
      mustApprove,
      mustReply,
      messages: e._count.messages,
      attachments: e._count.attachments,
    };
  });
}

// Quante spese aspettano qualcosa dal socio: la sua approvazione o una sua risposta.
export async function countExpensesWaitingFor(partnerId: string) {
  const pending = await listPendingExpenses(partnerId);
  return pending.filter((p) => p.mustApprove || p.mustReply).length;
}

// Se ora tutti l'hanno approvata, la spesa entra nei conti.
async function settle(expenseId: string) {
  const [expense, approvers] = await Promise.all([
    prisma.expense.findUnique({
      where: { id: expenseId },
      select: { approvedAt: true, approvals: { select: { partnerId: true } } },
    }),
    listApprovers(),
  ]);
  if (!expense || expense.approvedAt) return;
  if (
    isFullyApproved(
      approvers,
      expense.approvals.map((a) => a.partnerId),
    )
  )
    await prisma.expense.update({ where: { id: expenseId }, data: { approvedAt: new Date() } });
}

// Dopo che un socio è stato disattivato o ha perso l'accesso: le spese che aspettavano solo lui
// entrano nei conti.
export async function settlePendingExpenses() {
  const pending = await prisma.expense.findMany({
    where: { approvedAt: null },
    select: { id: true },
  });
  for (const e of pending) await settle(e.id);
}

export async function createExpense(
  input: ExpenseInput,
  createdById: string,
  attachments: NewAttachment[] = [],
) {
  const expense = await prisma.expense.create({
    data: {
      ...input,
      createdById,
      approvals: { create: { partnerId: createdById } },
      attachments: { create: attachments.map((a) => ({ ...a, createdById })) },
    },
  });
  await settle(expense.id);
  return expense;
}

// Una modifica cancella le approvazioni: la spesa torna in attesa, approvata solo da chi l'ha
// modificata, e gli altri soci devono rivederla. Anche aggiungere o togliere un allegato è una
// modifica.
export async function updateExpense(
  id: string,
  input: ExpenseInput,
  editorId: string,
  attachments: { add: NewAttachment[]; removeIds: string[] } = { add: [], removeIds: [] },
) {
  await prisma.$transaction([
    prisma.expenseApproval.deleteMany({ where: { expenseId: id } }),
    prisma.expenseAttachment.deleteMany({
      where: { expenseId: id, id: { in: attachments.removeIds } },
    }),
    prisma.expense.update({
      where: { id },
      data: {
        ...input,
        approvedAt: null,
        approvals: { create: { partnerId: editorId } },
        attachments: { create: attachments.add.map((a) => ({ ...a, createdById: editorId })) },
      },
    }),
  ]);
  await settle(id);
}

export async function approveExpense(id: string, partnerId: string) {
  await prisma.expenseApproval.upsert({
    where: { expenseId_partnerId: { expenseId: id, partnerId } },
    create: { expenseId: id, partnerId },
    update: {},
  });
  await settle(id);
}

export function addExpenseMessage(expenseId: string, authorId: string, body: string) {
  return prisma.expenseMessage.create({ data: { expenseId, authorId, body } });
}

export function deleteExpense(id: string) {
  return prisma.expense.delete({ where: { id } });
}
export function listCategories(options: { onlyActive?: boolean } = {}) {
  return prisma.category.findMany({
    where: options.onlyActive ? { active: true } : undefined,
    orderBy: [{ position: "asc" }, { name: "asc" }],
  });
}

export async function createCategory(name: string) {
  const last = await prisma.category.aggregate({ _max: { position: true } });
  return prisma.category.create({ data: { name, position: (last._max.position ?? 0) + 1 } });
}

export function updateCategory(id: string, data: { name: string; active: boolean }) {
  return prisma.category.update({ where: { id }, data });
}

export async function categoryNameTaken(name: string, exceptId?: string) {
  const found = await prisma.category.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });
  return !!found && found.id !== exceptId;
}

export function listAttachmentIds(expenseId: string) {
  return prisma.expenseAttachment.findMany({ where: { expenseId }, select: { id: true } });
}

// L'allegato con il file, per aprirlo o scaricarlo.
export function getAttachment(id: string) {
  return prisma.expenseAttachment.findUnique({ where: { id } });
}
