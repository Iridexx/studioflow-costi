// Conti tra soci: chi deve dare cosa a chi e perché. Usati nella pagina Soci e nel Riepilogo.
import { formatEuro, formatPercent } from "@/lib/format";
import type { PartnerBalance, Settlement } from "@/modules/summary/calc";

type Shares = { A: number; B: number } | null;

// "Parte A · 70% del progetto": la quota di partecipazione dell'accordo (art. 3), non quella
// usata per dividere le spese.
export function roleLabel(role: "A" | "B" | null | undefined, shares: Shares): string {
  if (!role) return "non è parte dell'accordo";
  const what = role === "A" ? "sviluppo" : "commerciale e spese";
  return `Parte ${role} (${what})${shares ? ` · ${formatPercent(shares[role])} del progetto` : ""}`;
}

export function SettlementList({
  toSettle,
  spentCents,
  size = "large",
}: {
  toSettle: Settlement[];
  spentCents: number;
  size?: "large" | "small";
}) {
  if (toSettle.length === 0)
    return (
      <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
        {spentCents === 0
          ? "Nessuna spesa ancora nei conti: nessuno deve dare niente a nessuno."
          : "Siete in pari: nessuno deve dare niente all'altro."}
      </p>
    );
  return (
    <ul
      className={`space-y-1 rounded-md bg-sky-50 px-3 py-2 text-sky-900 ${size === "large" ? "text-base" : "text-sm"}`}
    >
      {toSettle.map((t) => (
        <li key={`${t.from.id}-${t.to.id}`}>
          <strong>{t.from.name}</strong> deve dare <strong>{formatEuro(t.cents)}</strong> a{" "}
          <strong>{t.to.name}</strong>
        </li>
      ))}
    </ul>
  );
}

// Il conto di ogni socio in una riga: quanto ha messo, quanto gli toccava, la differenza.
export function SettlementReasons({ balances }: { balances: PartnerBalance[] }) {
  const rows = balances.filter((b) => b.dueCents || b.paidCents || b.contributedCents);
  if (rows.length === 0) return null;
  return (
    <ul className="mt-3 space-y-1 text-sm text-slate-700">
      {rows.map((b) => {
        const advanced = b.paidCents + b.contributedCents;
        const parts = [
          b.paidCents && `${formatEuro(b.paidCents)} di tasca`,
          b.contributedCents && `${formatEuro(b.contributedCents)} in cassa comune`,
        ].filter(Boolean);
        return (
          <li key={b.partner.id}>
            <strong>{b.partner.name}</strong> ha messo {formatEuro(advanced)}
            {parts.length > 1 && ` (${parts.join(" + ")})`}, la sua parte delle spese è{" "}
            {formatEuro(b.dueCents)}:{" "}
            <span
              className={`font-medium ${b.balanceCents < 0 ? "text-red-700" : "text-emerald-700"}`}
            >
              {b.balanceCents === 0
                ? "in pari"
                : b.balanceCents > 0
                  ? `ha messo ${formatEuro(b.balanceCents)} in più`
                  : `deve ancora dare ${formatEuro(-b.balanceCents)}`}
            </span>
            .
          </li>
        );
      })}
    </ul>
  );
}
