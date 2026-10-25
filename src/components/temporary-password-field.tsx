"use client";

import { useRef } from "react";
import { inputClass } from "@/components/ui";

// Senza lettere e cifre che si confondono (l/1, O/0), da dettare o ricopiare senza errori.
const ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomPassword(length = 12): string {
  const values = crypto.getRandomValues(new Uint32Array(length));
  return Array.from(values, (v) => ALPHABET[v % ALPHABET.length]).join("");
}

// Password provvisoria scritta (o generata) dall'amministratore: visibile, perché va mandata al
// socio.
export function TemporaryPasswordField({ label, hint }: { label: string; hint: string }) {
  // Campo non controllato: così lo svuota anche il reset del modulo dopo il salvataggio.
  const input = useRef<HTMLInputElement>(null);
  return (
    <label className="block text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      <span className="mt-1 flex gap-2">
        <input
          name="password"
          type="text"
          autoComplete="off"
          spellCheck={false}
          ref={input}
          className={`${inputClass} mt-0 font-mono`}
        />
        <button
          type="button"
          onClick={() => {
            if (input.current) input.current.value = randomPassword();
          }}
          className="shrink-0 rounded-md border border-slate-300 px-3 text-sm hover:bg-slate-50"
        >
          Genera
        </button>
      </span>
      <span className="mt-1 block text-xs text-slate-500">{hint}</span>
    </label>
  );
}
