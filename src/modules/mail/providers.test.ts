import { describe, expect, it } from "vitest";
import { explainMailError, findProvider, guessProvider, resolveServer } from "./providers";

describe("servizi di posta", () => {
  it("riconosce Gmail dall'indirizzo", () => {
    expect(guessProvider("Marco@Gmail.com")).toBe("gmail");
    expect(guessProvider("studio@pec.it")).toBe("other");
  });

  it("usa server e porta del servizio scelto", () => {
    expect(resolveServer("gmail", "", 0)).toEqual({ host: "smtp.gmail.com", port: 465 });
    expect(resolveServer("other", "mail.studio.it", 587)).toEqual({
      host: "mail.studio.it",
      port: 587,
    });
    expect(findProvider("aruba")?.host).toBe("smtps.aruba.it");
  });

  it("spiega gli errori più comuni", () => {
    expect(explainMailError({ code: "EAUTH" })).toContain("password per le app");
    expect(explainMailError({ code: "ETIMEDOUT" })).toContain("connessione");
  });
});
