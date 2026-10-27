// Chi è entrato con la password provvisoria non può fare nient'altro finché non l'ha cambiata.
// Decide cosa fare di ogni richiesta (pagine, dati delle pagine, azioni, download) prima che
// arrivi alla pagina: il controllo nel layout non basta, perché passando da una pagina all'altra
// dal menu il layout non viene rifatto.

export const CHANGE_PASSWORD_PATH = "/cambia-password";

// Pagine che restano aperte: il cambio stesso, l'uscita (azione della stessa pagina) e l'accesso.
const OPEN_PATHS = [CHANGE_PASSWORD_PATH, "/accedi", "/primo-accesso"];

export type GateDecision = "pass" | "redirect" | "forbid";

export function passwordGate(
  pathname: string,
  method: string,
  mustChangePassword: boolean,
): GateDecision {
  if (!mustChangePassword) return "pass";
  if (OPEN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return "pass";
  // Le pagine portano al cambio password; azioni e download vengono rifiutati.
  return method === "GET" || method === "HEAD" ? "redirect" : "forbid";
}
