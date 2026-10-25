import { describe, expect, it } from "vitest";
import { missingFields, parseAgreement, parseInline, type Parties } from "./render";

const parties: Parties = {
  A: {
    nome: "Mario Rossi",
    codiceFiscale: "RSSMRA80A01H501U",
    luogoNascita: "Roma",
    dataNascita: "01/01/1980",
    residenza: null,
  },
  B: null,
};

describe("parseInline", () => {
  it("sostituisce i dati presenti e segnala quelli mancanti", () => {
    expect(parseInline("{{A.nome}}, residente in {{A.residenza}}", parties)).toEqual([
      { kind: "text", text: "Mario Rossi, residente in " },
      { kind: "missing", text: "residenza Parte A" },
    ]);
    expect(parseInline("Parte B: {{B.nome}}", parties)).toEqual([
      { kind: "text", text: "Parte B: " },
      { kind: "missing", text: "nome e cognome Parte B" },
    ]);
  });

  it("tiene il grassetto anche intorno ai dati", () => {
    expect(parseInline("**Parte A**: {{A.nome}} al **70%**", parties)).toEqual([
      { kind: "bold", text: "Parte A" },
      { kind: "text", text: ": Mario Rossi al " },
      { kind: "bold", text: "70%" },
    ]);
  });
});

describe("parseAgreement", () => {
  it("riconosce titoli, paragrafi, elenchi e righe di separazione", () => {
    const text = [
      "# Titolo",
      "",
      "Prima riga",
      "seconda riga.",
      "",
      "- uno;",
      "- due.",
      "",
      "1. primo",
      "2. secondo",
      "---",
      "### Fine",
    ].join("\n");
    expect(parseAgreement(text, parties)).toEqual([
      { kind: "heading", level: 1, content: [{ kind: "text", text: "Titolo" }] },
      { kind: "paragraph", content: [{ kind: "text", text: "Prima riga seconda riga." }] },
      {
        kind: "list",
        ordered: false,
        items: [[{ kind: "text", text: "uno;" }], [{ kind: "text", text: "due." }]],
      },
      {
        kind: "list",
        ordered: true,
        items: [[{ kind: "text", text: "primo" }], [{ kind: "text", text: "secondo" }]],
      },
      { kind: "rule" },
      { kind: "heading", level: 3, content: [{ kind: "text", text: "Fine" }] },
    ]);
  });
});

describe("missingFields", () => {
  it("elenca i dati mancanti di ogni parte", () => {
    expect(missingFields(parties)).toEqual([
      { party: "A", labels: ["residenza"] },
      {
        party: "B",
        labels: [
          "nome e cognome",
          "luogo di nascita",
          "data di nascita",
          "codice fiscale",
          "residenza",
        ],
      },
    ]);
  });
});
