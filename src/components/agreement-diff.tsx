import type { ChangeGroup } from "@/modules/agreement/diff";

const addedClass = "rounded bg-emerald-100 px-0.5 text-emerald-900";
const removedClass = "rounded bg-red-100 px-0.5 text-red-800 line-through";

// Solo i paragrafi cambiati, sotto il titolo dell'articolo: in verde ciò che è stato aggiunto,
// in rosso barrato ciò che è stato tolto.
export function AgreementDiff({ groups }: { groups: ChangeGroup[] }) {
  if (groups.length === 0)
    return <p className="text-sm text-slate-500">Nessuna differenza nel testo.</p>;
  return (
    <div className="space-y-5 text-sm leading-relaxed text-slate-800">
      {groups.map((group, index) => (
        <section key={index}>
          <h3 className="mb-2 font-semibold text-slate-900">{group.section ?? "Inizio"}</h3>
          <ul className="space-y-2">
            {group.changes.map((change, i) => (
              <li key={i} className="rounded-md border border-slate-200 p-3">
                {change.kind === "added" && (
                  <>
                    <span className="mr-2 text-xs font-semibold text-emerald-700">AGGIUNTO</span>
                    <span className={addedClass}>{change.text}</span>
                  </>
                )}
                {change.kind === "removed" && (
                  <>
                    <span className="mr-2 text-xs font-semibold text-red-700">TOLTO</span>
                    <span className={removedClass}>{change.text}</span>
                  </>
                )}
                {change.kind === "changed" && (
                  <>
                    <span className="mr-2 text-xs font-semibold text-amber-700">MODIFICATO</span>
                    {change.parts.map((part, k) =>
                      part.kind === "same" ? (
                        <span key={k}>{part.text}</span>
                      ) : part.kind === "added" ? (
                        <ins key={k} className={`${addedClass} no-underline`}>
                          {part.text}
                        </ins>
                      ) : (
                        <del key={k} className={removedClass}>
                          {part.text}
                        </del>
                      ),
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
