// Indirizzi da cui StudioFlow Costi può essere aperto oltre a localhost: la rete Tailscale dello studio
// (nomi *.ts.net e indirizzi 100.x) più quelli indicati in COSTI_ALLOWED_HOSTS.

// Nomi MagicDNS (pc.tailnet.ts.net) e indirizzi Tailscale (100.64.0.0/10).
const tailscaleHosts = ["**.ts.net", "100.*.*.*"];

// "ufficio-pc, 192.168.1.20:3100" -> ["ufficio-pc", "192.168.1.20"] (senza protocollo né porta).
export function extraHosts(value: string | undefined): string[] {
  return (value ?? "")
    .split(/[,;\s]+/)
    .map((h) =>
      h
        .trim()
        .toLowerCase()
        .replace(/^[a-z]+:\/\//, "")
        .replace(/[/:].*$/, ""),
    )
    .filter(Boolean);
}

// Nomi host (senza porta) accettati da Next: risorse in sviluppo e server action.
export function allowedHosts(env: Record<string, string | undefined> = process.env): string[] {
  return [...new Set([...tailscaleHosts, ...extraHosts(env.COSTI_ALLOWED_HOSTS)])];
}

// Le server action confrontano host e porta: senza porta (https con `tailscale serve`) e con la
// porta dell'app (accesso diretto, es. http://ufficio-pc:3100).
export function allowedActionOrigins(env: Record<string, string | undefined> = process.env) {
  const port = env.PORT || "3100";
  return allowedHosts(env).flatMap((h) => [h, `${h}:${port}`]);
}
