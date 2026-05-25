import Database from "better-sqlite3";

const db = new Database("data/mo.db");

function hasColumn(table: string, column: string) {
  return db
    .prepare(`pragma table_info("${table}")`)
    .all()
    .some((row) => (row as { name: string }).name === column);
}

if (!hasColumn("customer", "balance_cents")) {
  db.exec(
    'alter table "customer" add column "balance_cents" integer not null default 0'
  );
}

if (!hasColumn("order", "prepay_used_cents")) {
  db.exec(
    'alter table "order" add column "prepay_used_cents" integer not null default 0'
  );
}

db.exec(`
create table if not exists "customer_balance_txn" (
  "id" text primary key not null,
  "customer_id" text not null references "customer"("id"),
  "order_id" text references "order"("id"),
  "type" text not null,
  "amount_cents" integer not null,
  "note" text,
  "created_by_id" text not null references "user"("id"),
  "created_at" integer not null default (unixepoch())
);
create index if not exists "customer_balance_txn_customer_idx"
  on "customer_balance_txn" ("customer_id", "created_at");
create index if not exists "customer_balance_txn_order_idx"
  on "customer_balance_txn" ("order_id");
`);

console.log("customer prepay migration applied");
