import { getCurrentPartner } from "@/lib/session";
import { getAttachment } from "@/modules/expenses/service";

// Apre (o con ?scarica=1 scarica) la ricevuta di una spesa. Solo per i soci collegati.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const partner = await getCurrentPartner();
  if (!partner || partner.mustChangePassword)
    return new Response("Accesso richiesto", { status: 401 });
  const { id } = await params;
  const attachment = await getAttachment(id);
  if (!attachment) return new Response("Allegato non trovato", { status: 404 });
  const download = new URL(request.url).searchParams.has("scarica");
  const ascii = attachment.fileName.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return new Response(attachment.data, {
    headers: {
      "Content-Type": attachment.contentType,
      "Content-Length": String(attachment.data.byteLength),
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(attachment.fileName)}`,
      "Cache-Control": "private, no-store",
      // Il tipo è quello riconosciuto dal contenuto al caricamento (solo PDF o immagini): il
      // browser non deve provare a indovinarne un altro.
      "X-Content-Type-Options": "nosniff",
    },
  });
}
