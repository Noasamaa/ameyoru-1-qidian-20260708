CREATE TABLE `customer_balance_txn_player` (
	`id` varchar(64) NOT NULL,
	`txn_id` varchar(64) NOT NULL,
	`player_id` varchar(64) NOT NULL,
	CONSTRAINT `customer_balance_txn_player_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `customer_balance_txn` MODIFY COLUMN `type` enum('DEPOSIT','ORDER_DEBIT','ORDER_REFUND','MANUAL_DEDUCT') NOT NULL;--> statement-breakpoint
ALTER TABLE `customer_balance_txn_player` ADD CONSTRAINT `customer_balance_txn_player_txn_id_customer_balance_txn_id_fk` FOREIGN KEY (`txn_id`) REFERENCES `customer_balance_txn`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customer_balance_txn_player` ADD CONSTRAINT `customer_balance_txn_player_player_id_user_id_fk` FOREIGN KEY (`player_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `cbtp_txn_idx` ON `customer_balance_txn_player` (`txn_id`);--> statement-breakpoint
CREATE INDEX `cbtp_player_idx` ON `customer_balance_txn_player` (`player_id`);