"use client";

import { useState } from "react";
import { gmailUrl, mailtoUrl, type Invite } from "@/modules/partners/invite";

// Copia negli appunti anche da http://IP, dove il browser non permette navigator.clipboard.
function copyText(value: string): boolean {
  const area = document.createElement("textarea");
  area.value = value;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  area.remove();
  return ok;
}

const buttonClass =
  "inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50";

// Email con le credenziali provvisorie, modificabile prima dell'invio.
export function InviteBox({ invite }: { invite: Invite }) {
  const [to, setTo] = useState(invite.to ?? "");
  const [body, setBody] = useState(invite.body);
  const [copied, setCopied] = useState<boolean | null>(null);

  async function copy() {
    const text = `Oggetto: ${invite.subject}\n\n${body}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(copyText(text));
    }
  }

  return (
    <div className="mt-4 space-y-3 rounded-md border border-sky-200 bg-sky-50 p-4 text-sm">
      <p className="font-medium text-sky-900">Manda al socio le credenziali</p>
      {invite.localAddress && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-amber-800">
          L&apos;indirizzo nel testo è &quot;localhost&quot;, che dal PC del socio non funziona:
          correggilo qui sotto (es. http://nome-pc:3100) o salvalo una volta per tutte in
          Impostazioni.
        </p>
      )}
      <label className="block">
        <span className="font-medium text-slate-700">Email del socio</span>
        <input
          type="email"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="nome@esempio.it"
          className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2"
        />
      </label>
      <label className="block">
        <span className="font-medium text-slate-700">Testo</span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={12}
          className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-xs"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <a href={mailtoUrl(to.trim() || null, invite.subject, body)} className={buttonClass}>
          Apri nel programma di posta
        </a>
        <a
          href={gmailUrl(to.trim() || null, invite.subject, body)}
          target="_blank"
          rel="noreferrer"
          className={buttonClass}
        >
          Apri in Gmail
        </a>
        <button type="button" onClick={copy} className={buttonClass}>
          Copia il messaggio
        </button>
      </div>
      {copied === true && <p className="text-emerald-700">Messaggio copiato.</p>}
      {copied === false && (
        <p className="text-red-700">Non riesco a copiare: seleziona il testo e copialo a mano.</p>
      )}
      <p className="text-xs text-slate-500">
        L&apos;email parte dalla tua casella, non dal programma. La password non viene salvata in
        chiaro: se chiudi questa pagina senza inviarla, ne imposti una nuova da Modifica.
      </p>
    </div>
  );
}
