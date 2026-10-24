import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Vuota durante `prisma generate` (es. postinstall prima di creare .env): serve solo per migrate.
    url: process.env.DATABASE_URL ?? "",
  },
});
