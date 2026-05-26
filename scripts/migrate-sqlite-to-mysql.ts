/**
 * SQLite -> MySQL 一次性全量迁移脚本
 *
 * 使用方法:
 *   1. 准备好 MySQL 实例和空库 (CREATE DATABASE mo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci)
 *   2. 在 .env 里设置 DATABASE_URL (mysql://...) 和 LEGACY_SQLITE_PATH (旧 sqlite 文件路径)
 *   3. 在新 MySQL 上跑过 drizzle 迁移 (npm run db:push 或 drizzle/0000_*.sql),表已建好
 *   4. 运行: npm run db:migrate-from-sqlite -- --commit
 *      不带 --commit 时为 dry-run,只打印将要插入的行数,不写入。
 *
 * 注意:
 *   - 此脚本只在生产数据是只读的瞬间(已停服)运行。否则读到一半数据可能变化。
 *   - 重复运行安全:每张表先 SELECT COUNT,如果目标已有同 id 则跳过 (ON DUPLICATE KEY UPDATE 风险大,这里用 INSERT IGNORE)
 *   - 跑前做一份 SQLite 文件备份:cp data/mo.db data/mo.db.bak.YYYYMMDD
 */
import "dotenv/config";
import Database from "better-sqlite3";
import mysql from "mysql2/promise";
import path from "node:path";

const SQLITE_PATH = process.env.LEGACY_SQLITE_PATH ?? "./data/mo.db";
const MYSQL_URL = process.env.DATABASE_URL;
const COMMIT = process.argv.includes("--commit");
const BATCH = 500;

if (!MYSQL_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sqlite = new Database(path.resolve(SQLITE_PATH), { readonly: true });
sqlite.pragma("journal_mode = WAL");

const mysqlPool = mysql.createPool({
  uri: MYSQL_URL,
  connectionLimit: 4,
  waitForConnections: true,
  dateStrings: false,
  timezone: "+08:00",
  multipleStatements: false,
});

/* ----------------------- 类型转换工具 ----------------------- */

const toBool = (v: number | null | undefined): boolean | null => {
  if (v === null || v === undefined) return null;
  return v !== 0;
};

/** SQLite 存 unix 秒 (integer mode: timestamp),转成 JS Date 给 mysql2 */
const toDate = (v: number | null | undefined): Date | null => {
  if (v === null || v === undefined) return null;
  // SQLite 里有些 unixepoch() 默认值看起来像秒;
  // 兜底:如果数值 > 10^12 说明已经是毫秒,直接 new Date
  return new Date(v > 1e12 ? v : v * 1000);
};

/* ----------------------- 表迁移定义 ----------------------- */

type ColSpec = {
  src: string;
  dst: string;
  /** 默认是直接复制。指定 transform 时做类型转换 */
  transform?: (v: unknown) => unknown;
};

type TableSpec = {
  name: string;
  /** 目标表名 (反引号会自动加) */
  table: string;
  cols: ColSpec[];
  /** 自定义读取语句。默认 SELECT * FROM "src" */
  selectFrom?: string;
};

const COL = (name: string, transform?: ColSpec["transform"]): ColSpec => ({
  src: name,
  dst: name,
  transform,
});

const BOOL = (name: string): ColSpec => COL(name, (v) => toBool(v as number));
const DATE = (name: string): ColSpec => COL(name, (v) => toDate(v as number));

/**
 * 顺序非常重要:按外键依赖逐级迁移。
 *   user → customer → player_invite → order → customer_balance_txn
 *   user → session / account / verification (verification 没有外键)
 */
const TABLES: TableSpec[] = [
  {
    name: "user",
    table: "user",
    cols: [
      COL("id"),
      COL("name"),
      COL("email"),
      BOOL("email_verified"),
      COL("image"),
      DATE("created_at"),
      DATE("updated_at"),
      COL("username"),
      COL("display_username"),
      COL("role"),
      BOOL("active"),
      COL("player_gender"),
      COL("default_rate_cents"),
      BOOL("must_change_pwd"),
      COL("wechat_qr_path"),
      COL("alipay_qr_path"),
      COL("qr_security_code_hash"),
    ],
  },
  {
    name: "customer",
    table: "customer",
    cols: [
      COL("id"),
      COL("member_no"),
      COL("name"),
      COL("wechat"),
      COL("note"),
      COL("balance_cents"),
      DATE("created_at"),
    ],
  },
  {
    name: "player_invite",
    table: "player_invite",
    cols: [
      COL("id"),
      COL("invite_token"),
      COL("created_by_id"),
      COL("player_gender"),
      COL("default_rate_cents"),
      DATE("expires_at"),
      COL("max_uses"),
      COL("use_count"),
      DATE("used_at"),
      COL("used_by_id"),
      DATE("created_at"),
    ],
  },
  {
    name: "order",
    table: "order",
    cols: [
      COL("id"),
      COL("dispatcher_id"),
      COL("player_id"),
      COL("customer_id"),
      DATE("start_at"),
      DATE("end_at"),
      COL("duration_min"),
      COL("hourly_rate_cents"),
      COL("commission_per_hour_cents"),
      COL("original_cents"),
      COL("discount_cents"),
      COL("payable_cents"),
      COL("prepay_used_cents"),
      COL("commission_cents"),
      COL("player_earn_cents"),
      COL("order_status"),
      DATE("completed_at"),
      DATE("canceled_at"),
      COL("cancel_fault"),
      COL("cancel_note"),
      COL("player_compensation_cents"),
      COL("settle_status"),
      DATE("settled_at"),
      COL("paid_method"),
      COL("note"),
      DATE("created_at"),
    ],
  },
  {
    name: "customer_balance_txn",
    table: "customer_balance_txn",
    cols: [
      COL("id"),
      COL("customer_id"),
      COL("order_id"),
      COL("type"),
      COL("amount_cents"),
      COL("note"),
      COL("created_by_id"),
      DATE("created_at"),
    ],
  },
  {
    name: "session",
    table: "session",
    cols: [
      COL("id"),
      DATE("expires_at"),
      COL("token"),
      DATE("created_at"),
      DATE("updated_at"),
      COL("ip_address"),
      COL("user_agent"),
      COL("user_id"),
    ],
  },
  {
    name: "account",
    table: "account",
    cols: [
      COL("id"),
      COL("account_id"),
      COL("provider_id"),
      COL("user_id"),
      COL("access_token"),
      COL("refresh_token"),
      COL("id_token"),
      DATE("access_token_expires_at"),
      DATE("refresh_token_expires_at"),
      COL("scope"),
      COL("password"),
      DATE("created_at"),
      DATE("updated_at"),
    ],
  },
  {
    name: "verification",
    table: "verification",
    cols: [
      COL("id"),
      COL("identifier"),
      COL("value"),
      DATE("expires_at"),
      DATE("created_at"),
      DATE("updated_at"),
    ],
  },
];

/* ----------------------- 主流程 ----------------------- */

async function migrateOne(spec: TableSpec) {
  const t0 = Date.now();
  const srcRows = sqlite
    .prepare(`SELECT * FROM "${spec.selectFrom ?? spec.name}"`)
    .all() as Record<string, unknown>[];

  if (srcRows.length === 0) {
    console.log(`  [${spec.name}] 空表,跳过`);
    return { inserted: 0, skipped: 0, total: 0 };
  }

  // 目标表已存在的 id (用于断点续传/重复运行幂等)
  const [existingRowsRaw] = await mysqlPool.query(
    `SELECT id FROM \`${spec.table}\``
  );
  const existing = new Set(
    (existingRowsRaw as { id: string }[]).map((r) => r.id)
  );

  const cols = spec.cols.map((c) => c.dst);
  const placeholders = `(${cols.map(() => "?").join(",")})`;
  const colList = cols.map((c) => `\`${c}\``).join(",");

  let inserted = 0;
  let skipped = 0;
  for (let i = 0; i < srcRows.length; i += BATCH) {
    const slice = srcRows.slice(i, i + BATCH);
    const valuesSql: string[] = [];
    const params: unknown[] = [];
    for (const row of slice) {
      if (typeof row.id === "string" && existing.has(row.id)) {
        skipped++;
        continue;
      }
      valuesSql.push(placeholders);
      for (const c of spec.cols) {
        const raw = row[c.src];
        params.push(c.transform ? c.transform(raw) : raw);
      }
    }
    if (valuesSql.length === 0) continue;
    if (!COMMIT) {
      inserted += valuesSql.length;
      continue;
    }
    const sql = `INSERT INTO \`${spec.table}\` (${colList}) VALUES ${valuesSql.join(",")}`;
    await mysqlPool.query(sql, params);
    inserted += valuesSql.length;
  }

  const dt = ((Date.now() - t0) / 1000).toFixed(2);
  console.log(
    `  [${spec.name}] total=${srcRows.length} inserted=${inserted} skipped=${skipped} (${dt}s)`
  );
  return { inserted, skipped, total: srcRows.length };
}

async function main() {
  console.log(`SQLite: ${path.resolve(SQLITE_PATH)}`);
  console.log(`MySQL : ${MYSQL_URL!.replace(/:[^:@]+@/, ":***@")}`);
  console.log(`Mode  : ${COMMIT ? "COMMIT (写入)" : "DRY-RUN (--commit 才会写入)"}\n`);

  const summary: Record<string, { total: number; inserted: number; skipped: number }> = {};
  for (const spec of TABLES) {
    summary[spec.name] = await migrateOne(spec);
  }

  console.log("\n========== 汇总 ==========");
  let totalRows = 0;
  let totalIns = 0;
  for (const [name, s] of Object.entries(summary)) {
    totalRows += s.total;
    totalIns += s.inserted;
    console.log(
      `  ${name.padEnd(22)} total=${s.total} inserted=${s.inserted} skipped=${s.skipped}`
    );
  }
  console.log(`  ${"TOTAL".padEnd(22)} rows=${totalRows} inserted=${totalIns}`);

  if (!COMMIT) {
    console.log("\nDRY-RUN 完成。确认无误后加 --commit 再跑一次。");
  } else {
    console.log("\n迁移完成。建议接下来:");
    console.log("  1. 在 MySQL 上执行计数对账 SQL,与本日志比对");
    console.log("  2. 启动新代码,跑一遍核心业务流程做烟雾测试");
  }
}

main()
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error("\n迁移失败:", err);
    process.exit(1);
  })
  .finally(async () => {
    sqlite.close();
    await mysqlPool.end();
  });
