import { defineConfig } from "drizzle-kit";
import path from "path";

const dbPath = process.env.SQLITE_DB_PATH || path.join(process.cwd(), "data", "liga.db");

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle/migrations",
  dialect: "turso",
  dbCredentials: {
    url: `file:${dbPath}`,
  },
});
