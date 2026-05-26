import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    "DATABASE_URL is not set. Example: mysql://user:pass@127.0.0.1:3306/mo?charset=utf8mb4"
  );
}

const globalForDb = globalThis as unknown as {
  mysqlPool: mysql.Pool | undefined;
};

const pool =
  globalForDb.mysqlPool ??
  mysql.createPool({
    uri: url,
    connectionLimit: 10,
    waitForConnections: true,
    // 业务里全部用 JS Date,这里关闭 driver 端 Date<->string 转换,
    // 让 mysql2 始终返回 Date 对象,Drizzle 才能正确路由 datetime mode: "date"
    dateStrings: false,
    timezone: "+08:00",
  });

if (process.env.NODE_ENV !== "production") globalForDb.mysqlPool = pool;

export const db = drizzle(pool, { schema, mode: "default" });
