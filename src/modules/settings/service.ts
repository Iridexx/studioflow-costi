import { prisma } from "@/lib/db";

const PILOT_STUDIOS = "pilotStudios";

// Numero di studi pilota, per calcolare il costo per studio nel riepilogo (0 = non mostrato).
export async function getPilotStudios(): Promise<number> {
  const row = await prisma.setting.findUnique({ where: { key: PILOT_STUDIOS } });
  const n = Number(row?.value ?? 0);
  return Number.isInteger(n) && n > 0 ? n : 0;
}

export async function setPilotStudios(value: number) {
  await prisma.setting.upsert({
    where: { key: PILOT_STUDIOS },
    create: { key: PILOT_STUDIOS, value: String(value) },
    update: { value: String(value) },
  });
}
