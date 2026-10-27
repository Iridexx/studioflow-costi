import type { NextConfig } from "next";
import { allowedActionOrigins, allowedHosts } from "./src/lib/network-access";

const nextConfig: NextConfig = {
  // Cartella della build: scripts/aggiorna.ps1 prepara la nuova versione in .next-a o .next-b
  // mentre quella in funzione continua a girare dall'altra.
  distDir: process.env.STUDIOFLOW_DIST_DIR || ".next",
  // Apertura dagli altri dispositivi della rete Tailscale e dagli host in COSTI_ALLOWED_HOSTS.
  allowedDevOrigins: allowedHosts(),
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  experimental: {
    serverActions: {
      // Dietro `tailscale serve` l'host inoltrato può differire dall'origine del browser.
      allowedOrigins: allowedActionOrigins(),
      // Spazio per gli allegati delle spese: fino a 5 file da 10 MB, più i campi del modulo.
      bodySizeLimit: "52mb",
    },
  },
};

export default nextConfig;
