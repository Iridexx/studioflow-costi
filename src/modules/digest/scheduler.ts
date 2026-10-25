import { runDigestIfDue } from "@/modules/digest/service";

// Un controllo al minuto finché il programma è acceso; uno solo anche se il modulo viene
// ricaricato (sviluppo).
const globalForDigest = globalThis as unknown as { digestTimer?: ReturnType<typeof setInterval> };

async function tick() {
  try {
    await runDigestIfDue();
  } catch (error) {
    console.error("Riepilogo giornaliero:", error);
  }
}

if (!globalForDigest.digestTimer) {
  globalForDigest.digestTimer = setInterval(tick, 60 * 1000);
  void tick();
}
