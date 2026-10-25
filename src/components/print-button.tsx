"use client";

export function PrintButton({ label = "Stampa" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 print:hidden"
    >
      {label}
    </button>
  );
}
