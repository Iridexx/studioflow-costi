// Quando spedire il riepilogo giornaliero, senza database. Gli orari sono quelli italiani.

export const DEFAULT_DIGEST_TIME = "23:55";

// "23:55" -> minuti dalla mezzanotte; null se non è un orario valido.
export function parseTime(value: string): number | null {
  const match = /^(\d{1,2})[:.](\d{2})$/.exec(value.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
}

export function formatTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

// Giorno (AAAA-MM-GG) e minuti dalla mezzanotte in Italia.
export function romeClock(now: Date): { day: string; minutes: number } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Rome",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return {
    day: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

export function previousDay(day: string): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

// Quale giorno chiudere adesso, o null. Di norma oggi, passato l'orario scelto. Se il PC era spento
// all'ora dell'invio, all'accensione si recupera subito il giorno perso (ieri), e stasera si
// spedisce comunque quello di oggi.
export function dueDay(
  clock: { day: string; minutes: number },
  sendAt: number,
  lastSentDay: string | null,
): string | null {
  const yesterday = previousDay(clock.day);
  const last = lastSentDay ?? yesterday;
  if (last < yesterday) return yesterday;
  if (last < clock.day && clock.minutes >= sendAt) return clock.day;
  return null;
}
