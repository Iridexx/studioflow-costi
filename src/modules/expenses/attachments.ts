// Regole per gli allegati delle spese (ricevute, fatture, giustificativi). Nessun accesso al
// database: le usano sia il server sia il modulo nel browser.

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const MAX_ATTACHMENTS = 5;
// Tipi accettati dal campo file. Con questo elenco l'iPhone converte da solo le foto HEIC in JPEG.
export const ATTACHMENT_ACCEPT = "application/pdf,image/jpeg,image/png,image/webp";
export const ATTACHMENT_HINT = "PDF o foto (JPG, PNG, WebP), fino a 10 MB ciascuno, al massimo 5.";

export type AttachmentType = "application/pdf" | "image/jpeg" | "image/png" | "image/webp";

// Il tipo vero si riconosce dai primi byte del file, non dal nome né da quello dichiarato dal
// browser: così un file rinominato in .pdf non passa.
export function detectAttachmentType(bytes: Uint8Array): AttachmentType | null {
  const starts = (...sig: number[]) => sig.every((b, i) => bytes[i] === b);
  if (starts(0x25, 0x50, 0x44, 0x46, 0x2d)) return "application/pdf"; // %PDF-
  if (starts(0xff, 0xd8, 0xff)) return "image/jpeg";
  if (starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  if (
    starts(0x52, 0x49, 0x46, 0x46) && // RIFF
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50 // WEBP
  )
    return "image/webp";
  return null;
}

export function isImage(contentType: string) {
  return contentType.startsWith("image/");
}

// Nome del file ripulito: niente percorsi, caratteri di controllo o nomi lunghissimi.
export function cleanFileName(name: string, contentType: AttachmentType): string {
  const base = (name.split(/[\\/]/).pop() ?? "")
    .replace(/[\u0000-\u001f\u007f"<>|:*?]/g, "")
    .trim()
    .slice(-120);
  if (base && base !== "." && base !== "..") return base;
  const ext = {
    "application/pdf": "pdf",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  return `allegato.${ext[contentType]}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} byte`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

// Problema di un file scelto nel modulo, controllato prima dell'invio (nel browser) e di nuovo sul
// server. Il tipo qui è quello dichiarato; il server guarda anche il contenuto.
export function fileProblem(file: { name: string; size: number; type: string }): string | null {
  if (file.size === 0) return `"${file.name}" è vuoto.`;
  if (file.size > MAX_ATTACHMENT_BYTES)
    return `"${file.name}" pesa ${formatFileSize(file.size)}: il massimo è 10 MB. Prova a ridurre la foto o a scansionare il PDF a risoluzione più bassa.`;
  if (file.type && !ATTACHMENT_ACCEPT.split(",").includes(file.type))
    return `"${file.name}" non è un PDF né una foto JPG, PNG o WebP.`;
  return null;
}

// Quanti allegati resteranno alla spesa dopo il salvataggio, e se va bene così.
export function attachmentCountProblem(count: number, required: boolean): string | null {
  if (count > MAX_ATTACHMENTS) return `Al massimo ${MAX_ATTACHMENTS} allegati per spesa.`;
  if (count === 0 && required)
    return "Allega la ricevuta o un altro giustificativo (PDF o foto): senza allegato la spesa non si può registrare.";
  return null;
}

// L'allegato è obbligatorio (se l'impostazione è attiva) per le spese nuove e per quelle che ne
// hanno già uno; le spese registrate prima, senza allegato, restano valide e si possono modificare.
export function attachmentRequired(
  setting: boolean,
  existing: { isNew: boolean; attachmentsBefore: number },
): boolean {
  return setting && (existing.isNew || existing.attachmentsBefore > 0);
}
