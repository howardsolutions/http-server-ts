import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";
import path from "node:path";
import { existsSync } from "node:fs";

// Load environment variables explicitly from .env.local (preferred) or .env at project root
(() => {
  const candidateFiles = [".env.local", ".env"]; // first existing file wins
  for (const file of candidateFiles) {
    const fullPath = path.resolve(process.cwd(), file);
    if (existsSync(fullPath)) {
      dotenv.config({ path: fullPath });
      break;
    }
  }
})();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is not defined. Create a .env (or .env.local) at the project root with DATABASE_URL=..."
  );
}

export default defineConfig({
  schema: "schema.ts",
  out: "src/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});