import Database from "better-sqlite3";

const db = new Database("data/mo.db");

function hasColumn(table: string, column: string) {
  return db
    .prepare(`pragma table_info("${table}")`)
    .all()
    .some((row) => (row as { name: string }).name === column);
}

if (!hasColumn("user", "qr_security_code_hash")) {
  db.exec('alter table "user" add column "qr_security_code_hash" text');
}

console.log("qr security migration applied");
