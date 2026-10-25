import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { settlePendingExpenses } from "@/modules/expenses/service";

export type PartnerInput = {
  name: string;
  username: string | null;
  email: string | null;
  shareBasisPoints: number;
  hourlyRateCents: number;
  isAdmin: boolean;
  active: boolean;
};

export function listPartners(options: { onlyActive?: boolean } = {}) {
  return prisma.partner.findMany({
    where: options.onlyActive ? { active: true } : undefined,
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
}

export function getPartner(id: string) {
  return prisma.partner.findUnique({ where: { id } });
}

export async function hasAnyLogin() {
  return (await prisma.partner.count({ where: { passwordHash: { not: null } } })) > 0;
}

export async function usernameTaken(username: string, exceptId?: string) {
  const found = await prisma.partner.findUnique({ where: { username } });
  return !!found && found.id !== exceptId;
}

// La password scelta dall'amministratore per un altro socio è provvisoria: al primo accesso il
// socio deve sostituirla con una sua.
export async function createPartner(
  input: PartnerInput,
  password: string | null,
  options: { temporary?: boolean } = {},
) {
  return prisma.partner.create({
    data: {
      ...input,
      passwordHash: password ? await hashPassword(password) : null,
      mustChangePassword: !!password && !!options.temporary,
    },
  });
}

export async function updatePartner(id: string, input: PartnerInput) {
  await prisma.partner.update({ where: { id }, data: input });
  // Un socio disattivato esce subito da tutti i dispositivi.
  if (!input.active) await prisma.session.deleteMany({ where: { partnerId: id } });
  // Chi non può più entrare non deve più approvare: le spese che aspettavano solo lui passano.
  if (!input.active || !input.username) await settlePendingExpenses();
}

export async function setPassword(
  id: string,
  password: string,
  options: { temporary?: boolean } = {},
) {
  await prisma.partner.update({
    where: { id },
    data: { passwordHash: await hashPassword(password), mustChangePassword: !!options.temporary },
  });
  await prisma.session.deleteMany({ where: { partnerId: id } });
}

export async function authenticate(username: string, password: string) {
  const partner = await prisma.partner.findUnique({ where: { username } });
  if (!partner?.passwordHash || !partner.active) return null;
  return (await verifyPassword(password, partner.passwordHash)) ? partner : null;
}

export async function checkPassword(id: string, password: string) {
  const partner = await prisma.partner.findUnique({ where: { id } });
  return !!partner?.passwordHash && (await verifyPassword(password, partner.passwordHash));
}

export async function countAdmins(exceptId?: string) {
  return prisma.partner.count({
    where: { isAdmin: true, active: true, passwordHash: { not: null }, id: { not: exceptId } },
  });
}
