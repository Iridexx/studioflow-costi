// Elementi di base delle pagine.

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
    </div>
  );
}

export function Card({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`min-w-0 overflow-x-auto rounded-lg border border-slate-200 bg-white p-4 sm:p-5 ${className}`}
    >
      {title && <h2 className="mb-4 text-base font-semibold text-slate-900">{title}</h2>}
      {children}
    </section>
  );
}

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900 tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export const inputClass =
  "mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-sm text-slate-500">{children}</p>;
}

export const tableClass = "w-full text-sm";
export const thClass = "border-b border-slate-200 px-2 py-2 text-left font-medium text-slate-500";
export const tdClass = "border-b border-slate-100 px-2 py-2 align-top";

export function ConfirmDelete() {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-700">
      <input type="checkbox" name="conferma" required /> Sì, voglio eliminarla definitivamente
    </label>
  );
}

// Avviso arancione in cima alla pagina: qualcosa da controllare o da decidere.
export function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">{children}</div>
  );
}
