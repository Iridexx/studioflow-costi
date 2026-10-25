"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Riepilogo" },
  { href: "/spese", label: "Spese" },
  { href: "/ore", label: "Ore" },
  { href: "/soci", label: "Soci e versamenti" },
  { href: "/accordo", label: "Accordo" },
  { href: "/impostazioni", label: "Impostazioni" },
];

// waiting: spese che aspettano l'approvazione o una risposta del socio collegato.
// waitingTime: ore che aspettano la conferma del socio collegato.
export function Nav({ waiting = 0, waitingTime = 0 }: { waiting?: number; waitingTime?: number }) {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto">
      {items.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              "whitespace-nowrap rounded-md px-3 py-2 text-sm " +
              (active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100")
            }
          >
            {item.label}
            {item.href === "/ore" && waitingTime > 0 && (
              <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-xs font-semibold text-white">
                {waitingTime}
              </span>
            )}
            {item.href === "/spese" && waiting > 0 && (
              <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-xs font-semibold text-white">
                {waiting}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
