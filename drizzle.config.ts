import type { Config } from "drizzle-kit";
import "dotenv/config";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    "DATABASE_URL is not set. Example: mysql://user:pass@127.0.0.1:3306/mo?charset=utf8mb4"
  );
}

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: { url },
} satisfies Config;
