// All'avvio del server: il controllo del riepilogo email giornaliero (solo lato Node.js).
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NODE_ENV !== "test") {
    await import("./modules/digest/scheduler");
  }
}
