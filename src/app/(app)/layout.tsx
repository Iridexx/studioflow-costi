import { Nav } from "@/components/nav";
import Link from "next/link";
import { requirePartner } from "@/lib/session";
import { countExpensesWaitingFor } from "@/modules/expenses/service";
import { signOut } from "../(auth)/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const partner = await requirePartner();
  const waiting = await countExpensesWaitingFor(partner.id);
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <p className="font-semibold text-slate-900">StudioFlow Costi</p>
          <div className="order-3 w-full sm:order-2 sm:w-auto sm:flex-1">
            <Nav waiting={waiting} />
          </div>
          <div className="order-2 ml-auto flex items-center gap-3 text-sm text-slate-500 sm:order-3">
            <span>{partner.name}</span>
            <form action={signOut}>
              <button type="submit" className="rounded-md px-2 py-1 hover:bg-slate-100">
                Esci
              </button>
            </form>
          </div>
        </div>
      </header>
      {waiting > 0 && (
        <div className="border-b border-amber-200 bg-amber-50">
          <p className="mx-auto max-w-6xl px-4 py-2 text-sm text-amber-900">
            {waiting === 1
              ? "Una spesa aspetta la tua approvazione o una tua risposta."
              : `${waiting} spese aspettano la tua approvazione o una tua risposta.`}{" "}
            <Link href="/spese" className="font-medium underline">
              Vai alle spese
            </Link>
          </p>
        </div>
      )}
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
