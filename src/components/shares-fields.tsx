"use client";

import { useState } from "react";
import { inputClass } from "@/components/ui";
import { formatPercent, parsePercent } from "@/lib/format";
import { FULL_SHARE, redistribute, sharesTotal } from "@/modules/partners/shares";

type Other = { id: string; name: string; share: number; active: boolean };

const toInput = (basisPoints: number) => String(basisPoints / 100).replace(".", ",");

// Quota del socio più quelle degli altri, ricalcolate da sole perché il totale resti 100%. Con
// un solo altro socio la sua quota è automatica; con più soci si può decidere quanto togliere a
// ciascuno.
export function SharesFields({ defaultShare, others }: { defaultShare: number; others: Other[] }) {
  const [share, setShare] = useState(toInput(defaultShare));
  const [otherValues, setOtherValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      redistribute(
        others.map((o) => ({ id: o.id, share: o.share })),
        FULL_SHARE - defaultShare,
      ).map((s) => [s.id, toInput(s.share)]),
    ),
  );

  function changeShare(value: string) {
    setShare(value);
    const parsed = parsePercent(value);
    if (parsed === null) return;
    const next = redistribute(
      others.map((o) => ({ id: o.id, share: o.share })),
      FULL_SHARE - parsed,
    );
    setOtherValues(Object.fromEntries(next.map((s) => [s.id, toInput(s.share)])));
  }

  const values = [share, ...others.map((o) => otherValues[o.id] ?? "0")].map(parsePercent);
  const valid = values.every((v) => v !== null);
  const total = valid ? sharesTotal(values as number[]) : null;
  const single = others.length === 1;

  return (
    <div className="space-y-3 sm:col-span-2">
      <label className="block text-sm">
        <span className="font-medium text-slate-700">Quota per le spese %</span>
        <input
          name="share"
          inputMode="decimal"
          value={share}
          onChange={(e) => changeShare(e.target.value)}
          className={`${inputClass} max-w-40`}
        />
        <span className="mt-1 block text-xs text-slate-500">
          Serve solo per le spese divise «Secondo le quote dei soci»; per l&apos;accordo la Parte B
          100%, la Parte A 0% (art. 4.6). La somma fa sempre 100%: la differenza si toglie agli
          altri soci.
        </span>
      </label>
      {others.length > 0 && (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
          <p className="mb-2 font-medium text-slate-700">
            {single ? "Quota dell'altro socio" : "Quote degli altri soci (puoi cambiarle)"}
          </p>
          <ul className="space-y-2">
            {others.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center gap-2">
                <span className="min-w-40">
                  {o.name}
                  {!o.active && <span className="text-xs text-slate-500"> (non attivo)</span>}
                </span>
                <span className="text-xs text-slate-500">ora {formatPercent(o.share)} →</span>
                <input
                  name={`share_${o.id}`}
                  inputMode="decimal"
                  readOnly={single}
                  value={otherValues[o.id] ?? "0"}
                  onChange={(e) => setOtherValues({ ...otherValues, [o.id]: e.target.value })}
                  aria-label={`Nuova quota di ${o.name}`}
                  className={`w-24 rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-500 focus:outline-none ${single ? "bg-slate-100" : "bg-white"}`}
                />
                <span>%</span>
              </li>
            ))}
          </ul>
          <p
            className={`mt-2 font-medium ${total === FULL_SHARE ? "text-emerald-700" : "text-red-700"}`}
          >
            Totale: {total === null ? "—" : formatPercent(total)}
            {total !== null && total !== FULL_SHARE && " (deve fare 100%)"}
          </p>
        </div>
      )}
    </div>
  );
}
