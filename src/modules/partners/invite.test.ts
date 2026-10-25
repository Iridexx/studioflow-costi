import { describe, expect, it } from "vitest";
import { buildInvite, gmailUrl, isLocalUrl, mailtoUrl, normalizeAppUrl } from "./invite";

describe("buildInvite", () => {
  const base = {
    name: "Mario Rossi",
    email: "mario@example.com",
    username: "mario",
    password: "Provvisoria-123",
    appUrl: "http://ufficio-pc:3100",
    senderName: "Marco",
  };

  it("mette nel testo indirizzo, nome utente e password provvisoria", () => {
    const invite = buildInvite(base);
    expect(invite.to).toBe("mario@example.com");
    expect(invite.body).toContain("Ciao Mario,");
    expect(invite.body).toContain("Indirizzo: http://ufficio-pc:3100");
    expect(invite.body).toContain("Nome utente: mario");
    expect(invite.body).toContain("Password provvisoria: Provvisoria-123");
    expect(invite.localAddress).toBe(false);
  });

  it("segnala l'indirizzo localhost, che dal PC del socio non funziona", () => {
    expect(buildInvite({ ...base, appUrl: "http://localhost:3100" }).localAddress).toBe(true);
  });
});

describe("indirizzo del programma", () => {
  it("riconosce gli indirizzi locali", () => {
    expect(isLocalUrl("http://127.0.0.1:3100")).toBe(true);
    expect(isLocalUrl("http://nome-pc.tail1234.ts.net")).toBe(false);
  });

  it("aggiunge http:// e toglie la barra finale", () => {
    expect(normalizeAppUrl("192.168.1.20:3100/")).toBe("http://192.168.1.20:3100");
    expect(normalizeAppUrl("https://pc.tail.ts.net")).toBe("https://pc.tail.ts.net");
    expect(normalizeAppUrl("  ")).toBeNull();
  });
});

describe("collegamenti per la posta", () => {
  it("codifica oggetto e testo nel mailto", () => {
    const url = mailtoUrl("a@b.it", "Ciao & benvenuto", "riga 1\nriga 2");
    expect(url).toBe("mailto:a%40b.it?subject=Ciao%20%26%20benvenuto&body=riga%201%0Ariga%202");
  });

  it("prepara la bozza di Gmail con destinatario", () => {
    const url = new URL(gmailUrl("a@b.it", "Oggetto", "Testo"));
    expect(url.searchParams.get("to")).toBe("a@b.it");
    expect(url.searchParams.get("su")).toBe("Oggetto");
    expect(url.searchParams.get("view")).toBe("cm");
  });
});
