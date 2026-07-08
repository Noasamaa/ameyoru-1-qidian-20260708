-- 0004_lonely_dazzler.sql
--
-- INTERIM HAND-AUTHORED STOPGAP (no drizzle-kit available in this environment).
-- See drizzle/MIGRATIONS_README.md for full context.
--
-- Purpose: bring the versioned `.sql` migration history in line with src/db/schema.ts
-- and the live MySQL schema (captured in drizzle/meta/0003_snapshot.json). The gift
-- payment columns, user.deposit_paid, and the two gift_record indexes below currently
-- exist in the live DB ONLY via manual ALTERs / the 0003 snapshot — they were never
-- emitted into any `.sql` file. 0002_gift_records.sql created `gift_record` without them
-- and 0003_long_sharon_ventura.sql is a `SELECT 1;` no-op.
--
-- APPLY ONCE. On a DB that already has these columns/indexes (the live DB), SKIP this
-- migration entirely. MySQL 8 `ALTER TABLE ... ADD COLUMN` / `CREATE INDEX` do NOT
-- reliably support `IF NOT EXISTS`, so this file relies on idempotency-by-convention:
-- run it exactly once, only against a fresh DB built from 0000..0003.
--
-- Column types/null/default/enum below are copied verbatim from src/db/schema.ts and
-- verified against drizzle/meta/0003_snapshot.json so drizzle-kit will see ZERO drift.

-- gift_record: gift payment / settlement columns -----------------------------------

-- submitter_id is NOT NULL with NO default. On a fresh DB gift_record is empty so this
-- is safe. If you ever apply this to a table that already holds rows, BACKFILL first
-- (e.g. `UPDATE gift_record SET submitter_id = operator_id WHERE submitter_id = '';`)
-- because MySQL would otherwise stamp existing rows with '' for a NOT NULL varchar.
ALTER TABLE `gift_record` ADD `submitter_id` varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE `gift_record` ADD `settle_status` enum('UNSETTLED','SETTLED') NOT NULL DEFAULT 'UNSETTLED';--> statement-breakpoint
ALTER TABLE `gift_record` ADD `settled_at` datetime(3);--> statement-breakpoint
ALTER TABLE `gift_record` ADD `paid_method` enum('WECHAT','ALIPAY');--> statement-breakpoint

-- user: deposit_paid flag ----------------------------------------------------------
ALTER TABLE `user` ADD `deposit_paid` boolean NOT NULL DEFAULT false;--> statement-breakpoint

-- gift_record: indexes added after the new columns ---------------------------------
CREATE INDEX `gift_record_settle_idx` ON `gift_record` (`settle_status`,`created_at`);--> statement-breakpoint
CREATE INDEX `gift_record_sender_idx` ON `gift_record` (`sender_nickname`);--> statement-breakpoint

-- order: composite index for the leaderboard/stats filter+range (M8) ---------------
-- Dominant query filters by order_status and ranges over start_at; this index covers it.
CREATE INDEX `order_status_start_idx` ON `order` (`order_status`,`start_at`);--> statement-breakpoint

-- customer_balance_txn_player: defense-in-depth uniqueness (LOW) --------------------
-- One (txn, player) pair should never repeat. Safe on a fresh DB. If applied to a
-- populated table, de-dup first or this ALTER will fail on existing duplicates.
ALTER TABLE `customer_balance_txn_player` ADD CONSTRAINT `cbtp_txn_player_unique` UNIQUE(`txn_id`,`player_id`);
