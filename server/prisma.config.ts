import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

export default defineConfig({
  datasource: {
    // App runtime uses DATABASE_URL (pooled in prod for serverless).
    url: process.env.DATABASE_URL!,
    // Migrations need a direct connection — pgbouncer pooling on Neon
    // doesn't support the protocol features Prisma migrate uses. Falls
    // back to DATABASE_URL locally where the two are the same.
    directUrl: process.env.DIRECT_URL ?? process.env.DATABASE_URL!,
  },

  schema: path.join(__dirname, "prisma", "schema.prisma"),

  migrations: {
    seed: "npx tsx prisma/seed.ts",
  },
});
