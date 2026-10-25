import { TopicSelect } from "@/components/topic-select";
import { Field, inputClass } from "@/components/ui";
import { dayInput, hoursInput } from "@/lib/format";

export function TimeFields({
  partners,
  topics,
  defaults,
  currentPartnerId,
}: {
  partners: { id: string; name: string }[];
  topics: string[];
  currentPartnerId: string;
  defaults?: {
    date: Date;
    partnerId: string;
    minutes: number;
    topic: string;
    notes: string | null;
  };
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Field label="Chi">
        <select
          name="partnerId"
          defaultValue={defaults?.partnerId ?? currentPartnerId}
          className={inputClass}
        >
          {partners.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Data">
        <input
          name="date"
          type="date"
          required
          defaultValue={dayInput(defaults?.date ?? new Date())}
          className={inputClass}
        />
      </Field>
      <Field label="Ore" hint="es. 2, 1,5 oppure 1:30">
        <input
          name="hours"
          inputMode="decimal"
          required
          defaultValue={defaults ? hoursInput(defaults.minutes) : ""}
          className={inputClass}
        />
      </Field>
      <Field label="Argomento" hint="Uno nuovo si aggiunge al menu; si modificano in Impostazioni">
        <TopicSelect topics={topics} defaultValue={defaults?.topic} />
      </Field>
      <div className="sm:col-span-2 lg:col-span-4">
        <Field label="Note">
          <input name="notes" defaultValue={defaults?.notes ?? ""} className={inputClass} />
        </Field>
      </div>
    </div>
  );
}
