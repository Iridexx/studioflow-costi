import { prisma } from "@/lib/db";
import type { Recurrence } from "@/generated/prisma/client";

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
  notes: string | null;
};

const include = {
  category: { select: { name: true } },
  paidBy: { select: { name: true } },
  createdBy: { select: { name: true } },
} as const;

export function listExpenses() {
  return prisma.expense.findMany({ include, orderBy: [{ date: "desc" }, { createdAt: "desc" }] });
}

export function getExpense(id: string) {
  return prisma.expense.findUnique({ where: { id }, include });
}

export function createExpense(input: ExpenseInput, createdById: string) {
  return prisma.expense.create({ data: { ...input, createdById } });
}

export function updateExpense(id: string, input: ExpenseInput) {
  return prisma.expense.update({ where: { id }, data: input });
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
