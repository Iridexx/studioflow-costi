import { describe, expect, it } from "vitest";
import { passwordGate } from "./password-gate";

describe("passwordGate", () => {
  it("lascia passare chi ha già una password sua", () => {
    expect(passwordGate("/", "GET", false)).toBe("pass");
    expect(passwordGate("/spese", "POST", false)).toBe("pass");
  });

  it("porta al cambio password da ogni pagina, anche da un link diretto", () => {
    for (const path of ["/", "/spese", "/spese/abc", "/ore", "/soci", "/accordo", "/impostazioni"])
      expect(passwordGate(path, "GET", true)).toBe("redirect");
  });

  it("rifiuta azioni e download con la password provvisoria", () => {
    expect(passwordGate("/spese", "POST", true)).toBe("forbid");
    expect(passwordGate("/", "POST", true)).toBe("forbid");
    expect(passwordGate("/esporta", "GET", true)).toBe("redirect");
    expect(passwordGate("/allegati/abc", "GET", true)).toBe("redirect");
  });

  it("lascia aperti il cambio password, l'uscita e l'accesso", () => {
    expect(passwordGate("/cambia-password", "GET", true)).toBe("pass");
    expect(passwordGate("/cambia-password", "POST", true)).toBe("pass");
    expect(passwordGate("/accedi", "GET", true)).toBe("pass");
  });

  it("non si fa ingannare da percorsi che iniziano allo stesso modo", () => {
    expect(passwordGate("/cambia-password-falsa", "GET", true)).toBe("redirect");
    expect(passwordGate("/accedi-altro", "POST", true)).toBe("forbid");
  });
});
