import { headers } from "next/headers";
import { getAppUrl } from "@/modules/settings/service";

// Indirizzo del programma da mandare ai soci: quello salvato in Impostazioni, altrimenti quello
// da cui l'amministratore sta usando il programma in questo momento.
export async function appUrlForPartners(): Promise<string> {
  const saved = await getAppUrl();
  if (saved) return saved;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3100";
  const proto = h.get("x-forwarded-proto") === "https" ? "https" : "http";
  return `${proto}://${host}`;
}
