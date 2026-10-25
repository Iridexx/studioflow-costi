"use client";

import { useState } from "react";
import { inputClass } from "@/components/ui";

const NEW = "__nuovo__";

// Menu degli argomenti con in fondo "Nuovo argomento…": quello scritto entra nel menu da solo.
export function TopicSelect({ topics, defaultValue }: { topics: string[]; defaultValue?: string }) {
  const [choice, setChoice] = useState(defaultValue ?? (topics.length ? topics[0] : NEW));
  return (
    <>
      <select
        name="topicChoice"
        value={choice}
        onChange={(e) => setChoice(e.target.value)}
        className={inputClass}
      >
        {topics.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
        <option value={NEW}>+ Nuovo argomento…</option>
      </select>
      {choice === NEW && (
        <input
          name="topicNew"
          required
          autoFocus={topics.length > 0}
          placeholder="Scrivi il nuovo argomento"
          aria-label="Nuovo argomento"
          className={inputClass}
        />
      )}
    </>
  );
}
