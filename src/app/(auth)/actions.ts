"use server";

import { redirect } from "next/navigation";
import type { FormState } from "@/components/action-form";
import { passwordProblem } from "@/lib/password";
import { endSession, startSession } from "@/lib/session";
import { lockedMinutes, recordFailure, recordSuccess } from "@/modules/auth/throttle";
import { authenticate, createPartner, hasAnyLogin } from "@/modules/partners/service";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  const username = text(form, "username").toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!username || !password) return { error: "Inserisci nome utente e password." };
  const minutes = lockedMinutes(username);
  if (minutes > 0) return { error: `Troppi tentativi sbagliati: riprova tra ${minutes} minuti.` };
  const partner = await authenticate(username, password);
  if (!partner) {
    recordFailure(username);
    return { error: "Nome utente o password non corretti." };
  }
  recordSuccess(username);
  await startSession(partner.id);
  redirect("/");
}

export async function signOut() {
  await endSession();
  redirect("/accedi");
}

// Solo finché nessuno ha ancora una password: crea il primo socio, amministratore.
export async function createFirstPartner(_: FormState, form: FormData): Promise<FormState> {
  if (await hasAnyLogin()) redirect("/accedi");
  const name = text(form, "name");
  const username = text(form, "username").toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!name) return { error: "Inserisci il tuo nome." };
  if (!/^[a-z0-9._-]{3,30}$/.test(username))
    return { error: "Nome utente: da 3 a 30 caratteri tra lettere, numeri, punto e trattino." };
  const problem = passwordProblem(password);
  if (problem) return { error: problem };
  if (password !== String(form.get("confirm") ?? ""))
    return { error: "Le due password non coincidono." };
  const partner = await createPartner(
    { name, username, shareBasisPoints: 10000, hourlyRateCents: 0, isAdmin: true, active: true },
    password,
  );
  await startSession(partner.id);
  redirect("/soci");
}
