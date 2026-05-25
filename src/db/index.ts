import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import * as schema from "./schema";

const dbUrl = process.env.DATABASE_URL ?? "file:./data/mo.db";
const filePath = dbUrl.replace(/^file:/, "");

try {
  mkdirSync(dirname(filePath), { recursive: true });
} catch {
  // 目录已存在或没权限,后续 open 会报更明确的错
}

const globalForDb = globalThis as unknown as {
  sqlite: Database.Database | undefined;
};

const sqlite = globalForDb.sqlite ?? new Database(filePath);
if (process.env.NODE_ENV !== "production") globalForDb.sqlite = sqlite;

sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
