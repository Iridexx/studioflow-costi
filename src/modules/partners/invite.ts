// Testo dell'email con le credenziali provvisorie di un socio. Il programma non spedisce email:
// l'amministratore la apre nel suo programma di posta (o in Gmail) già compilata e la invia lui.

export type Invite = {
  to: string | null;
  subject: string;
  body: string;
  // Vero se l'indirizzo del programma è localhost: dal PC del socio non funzionerebbe.
  localAddress: boolean;
};

export function buildInvite(input: {
  name: string;
  email: string | null;
  username: string;
  password: string;
  appUrl: string;
  senderName: string;
}): Invite {
  const firstName = input.name.split(/\s+/)[0] || input.name;
  const body = [
    `Ciao ${firstName},`,
    "",
    "ti ho creato l'accesso a StudioFlow Costi, il programma con cui teniamo i conti dello sviluppo di StudioFlow.",
    "",
    `Indirizzo: ${input.appUrl}`,
    `Nome utente: ${input.username}`,
    `Password provvisoria: ${input.password}`,
    "",
    "Al primo accesso il programma ti chiederà di sceglierne una tua.",
    "Se ti colleghi da fuori ufficio serve Tailscale acceso.",
    "",
    input.senderName,
  ].join("\n");
  return {
    to: input.email,
    subject: "Il tuo accesso a StudioFlow Costi",
    body,
    localAddress: isLocalUrl(input.appUrl),
  };
}

export function isLocalUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
  } catch {
    return true;
  }
}

// "http://192.168.1.20:3100/" -> "http://192.168.1.20:3100"; senza protocollo aggiunge http://.
export function normalizeAppUrl(value: string): string | null {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
  try {
    const url = new URL(withProtocol);
    return `${url.protocol}//${url.host}${url.pathname === "/" ? "" : url.pathname}`;
  } catch {
    return null;
  }
}

export function mailtoUrl(to: string | null, subject: string, body: string): string {
  const params = `subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return `mailto:${to ? encodeURIComponent(to) : ""}?${params}`;
}

export function gmailUrl(to: string | null, subject: string, body: string): string {
  const params = new URLSearchParams({ view: "cm", fs: "1", su: subject, body });
  if (to) params.set("to", to);
  return `https://mail.google.com/mail/?${params.toString()}`;
}
