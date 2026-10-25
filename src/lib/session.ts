import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

const COOKIE = "costi_sessione";
const SESSION_DAYS = 30;

export type CurrentPartner = {
  id: string;
  name: string;
  isAdmin: boolean;
  mustChangePassword: boolean;
};

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

// Il cookie "secure" solo se la pagina è aperta in https (tailscale serve); in rete interna si
// usa http://IP:3100 e un cookie secure non verrebbe salvato.
async function isHttps() {
  const h = await headers();
  return h.get("x-forwarded-proto") === "https";
}

export async function startSession(partnerId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.session.create({ data: { tokenHash: hashToken(token), partnerId, expiresAt } });
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: await isHttps(),
    path: "/",
    expires: expiresAt,
  });
}

export async function endSession() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  store.delete(COOKIE);
}

export async function getCurrentPartner(): Promise<CurrentPartner | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      partner: {
        select: { id: true, name: true, isAdmin: true, active: true, mustChangePassword: true },
      },
    },
  });
  if (!session || session.expiresAt < new Date() || !session.partner.active) return null;
  const { id, name, isAdmin, mustChangePassword } = session.partner;
  return { id, name, isAdmin, mustChangePassword };
}

// Per ogni pagina e azione: senza accesso si torna al login (o al primo accesso, se non c'è
// ancora nessuno con una password). Chi è entrato con la password provvisoria non può fare altro
// finché non l'ha cambiata.
export async function requirePartner(): Promise<CurrentPartner> {
  const partner = await getCurrentPartner();
  if (partner?.mustChangePassword) redirect("/cambia-password");
  if (partner) return partner;
  const withLogin = await prisma.partner.count({ where: { passwordHash: { not: null } } });
  redirect(withLogin === 0 ? "/primo-accesso" : "/accedi");
}

export async function requireAdmin(): Promise<CurrentPartner> {
  const partner = await requirePartner();
  if (!partner.isAdmin) redirect("/");
  return partner;
}
