"use client";

import { useEffect, useRef, useState } from "react";
import { inputClass } from "@/components/ui";
import {
  ATTACHMENT_ACCEPT,
  MAX_ATTACHMENTS,
  fileProblem,
  formatFileSize,
} from "@/modules/expenses/attachments";

const MISSING =
  "Allega la ricevuta o un altro giustificativo (PDF o foto): senza allegato la spesa non si può registrare.";

// Campo per scegliere ricevute e giustificativi. Controlla tipo e dimensione già nel browser, così
// un file troppo grande viene segnalato subito invece di fallire durante l'invio.
export function AttachmentInput({
  required,
  existing = 0,
}: {
  required: boolean;
  existing?: number;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<{ name: string; size: number }[]>([]);
  const [problem, setProblem] = useState<string | null>(null);

  // Dopo un salvataggio riuscito il modulo si svuota: anche l'elenco dei file scelti.
  useEffect(() => {
    const form = input.current?.form;
    if (!form) return;
    const onReset = () => {
      setFiles([]);
      setProblem(null);
      input.current?.setCustomValidity("");
    };
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, []);

  function check() {
    const el = input.current;
    if (!el) return;
    const chosen = Array.from(el.files ?? []);
    const message =
      chosen.map(fileProblem).find(Boolean) ??
      (existing + chosen.length > MAX_ATTACHMENTS
        ? `Al massimo ${MAX_ATTACHMENTS} allegati per spesa.`
        : null);
    el.setCustomValidity(message ?? "");
    setProblem(message);
    setFiles(chosen.map((f) => ({ name: f.name, size: f.size })));
  }

  return (
    <div>
      <input
        ref={input}
        type="file"
        name="attachments"
        multiple
        accept={ATTACHMENT_ACCEPT}
        required={required}
        onChange={check}
        onInvalid={(e) => {
          if (!e.currentTarget.files?.length) e.currentTarget.setCustomValidity(MISSING);
        }}
        className={`${inputClass} file:mr-3 file:rounded file:border-0 file:bg-slate-100 file:px-3 file:py-1 file:text-sm`}
      />
      {files.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs text-slate-600">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`}>
              📎 {f.name} · {formatFileSize(f.size)}
            </li>
          ))}
        </ul>
      )}
      {problem && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {problem}
        </p>
      )}
    </div>
  );
}
