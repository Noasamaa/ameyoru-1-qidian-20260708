import Database from "better-sqlite3";

const db = new Database("data/mo.db");

function indexExists(name: string) {
  return !!db
    .prepare("select name from sqlite_master where type = 'index' and name = ?")
    .get(name);
}

function tableExists(name: string) {
  return !!db
    .prepare("select name from sqlite_master where type = 'table' and name = ?")
    .get(name);
}

if (indexExists("customer_name_unique")) {
  db.exec('drop index "customer_name_unique"');
}

db.exec(`
create index if not exists "customer_name_idx" on "customer" ("name");
create index if not exists "customer_wechat_idx" on "customer" ("wechat");
`);

if (!tableExists("player_invite")) {
  db.exec(`
  create table "player_invite" (
    "id" text primary key not null,
    "invite_token" text not null unique,
    "created_by_id" text not null references "user"("id"),
    "player_gender" text,
    "default_rate_cents" integer,
    "expires_at" integer not null,
    "used_at" integer,
    "used_by_id" text references "user"("id"),
    "created_at" integer not null default (unixepoch())
  );
  create index if not exists "player_invite_token_idx"
    on "player_invite" ("invite_token");
  create index if not exists "player_invite_created_by_idx"
    on "player_invite" ("created_by_id", "created_at");
  `);
}

console.log("partner customer invite migration applied");
