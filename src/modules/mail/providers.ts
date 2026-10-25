// Servizi di posta già pronti: basta indirizzo e password, il resto lo sa il programma.

export type MailProvider = {
  id: string;
  label: string;
  host: string;
  port: number;
  // Cosa scrivere nel campo password, mostrato sotto il campo.
  passwordHint: string;
};

export const MAIL_PROVIDERS: MailProvider[] = [
  {
    id: "gmail",
    label: "Gmail",
    host: "smtp.gmail.com",
    port: 465,
    passwordHint:
      'Gmail non accetta la password normale: serve una "password per le app" (16 lettere), da myaccount.google.com/apppasswords. Richiede la verifica in due passaggi attiva.',
  },
  {
    id: "aruba",
    label: "Aruba",
    host: "smtps.aruba.it",
    port: 465,
    passwordHint: "La password della casella Aruba.",
  },
  {
    id: "libero",
    label: "Libero",
    host: "smtp.libero.it",
    port: 465,
    passwordHint: "La password della casella Libero.",
  },
  {
    id: "other",
    label: "Altro (indica server e porta)",
    host: "",
    port: 465,
    passwordHint: "La password della casella.",
  },
];

export function findProvider(id: string): MailProvider | undefined {
  return MAIL_PROVIDERS.find((p) => p.id === id);
}

// Dall'indirizzo indovina il servizio: mario@gmail.com -> Gmail.
export function guessProvider(email: string): string {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  if (domain === "gmail.com" || domain === "googlemail.com") return "gmail";
  if (domain === "libero.it") return "libero";
  return "other";
}

export function resolveServer(provider: string, host: string, port: number) {
  const preset = findProvider(provider);
  if (preset && preset.id !== "other") return { host: preset.host, port: preset.port };
  return { host, port };
}

export function explainMailError(error: unknown): string {
  const e = error as { code?: string; responseCode?: number; message?: string };
  if (e.code === "EAUTH" || e.responseCode === 535)
    return 'La casella ha rifiutato indirizzo o password. Con Gmail serve la "password per le app", non quella normale.';
  if (
    e.code === "ECONNECTION" ||
    e.code === "ETIMEDOUT" ||
    e.code === "ESOCKET" ||
    e.code === "EDNS"
  )
    return "Non riesco a collegarmi al server di posta: controlla la connessione a Internet del PC.";
  if (e.code === "EENVELOPE") return "L'indirizzo del destinatario non è valido.";
  return `Invio non riuscito: ${e.message ?? "errore sconosciuto"}`;
}
