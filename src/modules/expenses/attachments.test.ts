import { describe, expect, it } from "vitest";
import {
  MAX_ATTACHMENT_BYTES,
  attachmentCountProblem,
  attachmentRequired,
  cleanFileName,
  detectAttachmentType,
  fileProblem,
  formatFileSize,
} from "./attachments";

const bytes = (...b: number[]) => new Uint8Array([...b, 0, 0, 0, 0, 0, 0, 0, 0]);
const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));

describe("detectAttachmentType", () => {
  it("riconosce PDF e immagini dal contenuto", () => {
    expect(detectAttachmentType(bytes(...ascii("%PDF-1.7")))).toBe("application/pdf");
    expect(detectAttachmentType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
    expect(detectAttachmentType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe(
      "image/png",
    );
    expect(detectAttachmentType(bytes(...ascii("RIFF"), 1, 2, 3, 4, ...ascii("WEBP")))).toBe(
      "image/webp",
    );
  });

  it("rifiuta file di altro tipo anche se si chiamano .pdf", () => {
    expect(detectAttachmentType(bytes(...ascii("PK")))).toBeNull(); // zip/docx
    expect(detectAttachmentType(bytes(...ascii("<html>")))).toBeNull();
    expect(detectAttachmentType(bytes(...ascii("RIFF"), 1, 2, 3, 4, ...ascii("WAVE")))).toBeNull();
    expect(detectAttachmentType(new Uint8Array())).toBeNull();
  });
});

describe("fileProblem", () => {
  it("accetta PDF e foto entro 10 MB", () => {
    expect(fileProblem({ name: "r.pdf", size: 1000, type: "application/pdf" })).toBeNull();
    expect(
      fileProblem({ name: "f.jpg", size: MAX_ATTACHMENT_BYTES, type: "image/jpeg" }),
    ).toBeNull();
  });

  it("segnala file vuoti, troppo grandi o di altro tipo", () => {
    expect(fileProblem({ name: "r.pdf", size: 0, type: "application/pdf" })).toMatch(/vuoto/);
    expect(
      fileProblem({ name: "f.jpg", size: MAX_ATTACHMENT_BYTES + 1, type: "image/jpeg" }),
    ).toMatch(/10 MB/);
    expect(fileProblem({ name: "f.heic", size: 10, type: "image/heic" })).toMatch(/non è un PDF/);
  });
});

describe("allegato obbligatorio", () => {
  it("per le spese nuove dipende dall'impostazione", () => {
    expect(attachmentRequired(true, { isNew: true, attachmentsBefore: 0 })).toBe(true);
    expect(attachmentRequired(false, { isNew: true, attachmentsBefore: 0 })).toBe(false);
  });

  it("le spese vecchie senza allegato restano modificabili senza", () => {
    expect(attachmentRequired(true, { isNew: false, attachmentsBefore: 0 })).toBe(false);
    expect(attachmentRequired(true, { isNew: false, attachmentsBefore: 2 })).toBe(true);
  });

  it("controlla quanti allegati restano", () => {
    expect(attachmentCountProblem(0, true)).toMatch(/Allega la ricevuta/);
    expect(attachmentCountProblem(0, false)).toBeNull();
    expect(attachmentCountProblem(1, true)).toBeNull();
    expect(attachmentCountProblem(6, false)).toMatch(/Al massimo 5/);
  });
});

describe("cleanFileName", () => {
  it("toglie percorsi e caratteri pericolosi", () => {
    expect(cleanFileName("C:\\Users\\x\\ricevuta.pdf", "application/pdf")).toBe("ricevuta.pdf");
    expect(cleanFileName('a"b<c>.jpg', "image/jpeg")).toBe("abc.jpg");
    expect(cleanFileName("", "image/png")).toBe("allegato.png");
  });
});

it("formatFileSize", () => {
  expect(formatFileSize(500)).toBe("500 byte");
  expect(formatFileSize(2048)).toBe("2 KB");
  expect(formatFileSize(3.5 * 1024 * 1024)).toBe("3,5 MB");
});
