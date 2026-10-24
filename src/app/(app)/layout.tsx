import { Nav } from "@/components/nav";
import { requirePartner } from "@/lib/session";
import { signOut } from "../(auth)/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const partner = await requirePartner();
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <p className="font-semibold text-slate-900">StudioFlow Costi</p>
          <div className="order-3 w-full sm:order-2 sm:w-auto sm:flex-1">
            <Nav />
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
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
