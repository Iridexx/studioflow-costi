export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <p className="text-xl font-semibold text-slate-900">StudioFlow Costi</p>
          <p className="text-sm text-slate-500">Costi di sviluppo · uso interno dei soci</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-6">{children}</div>
      </div>
    </main>
  );
}
