import { prisma } from "@/lib/db";

export type ContributionInput = {
  date: Date;
  partnerId: string;
  amountCents: number;
  notes: string | null;
};

export function listContributions() {
  return prisma.contribution.findMany({
    include: { partner: { select: { name: true } }, createdBy: { select: { name: true } } },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
}

export function createContribution(input: ContributionInput, createdById: string) {
  return prisma.contribution.create({ data: { ...input, createdById } });
}

export function deleteContribution(id: string) {
  return prisma.contribution.delete({ where: { id } });
}
