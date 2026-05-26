CREATE TABLE `account` (
	`id` varchar(64) NOT NULL,
	`account_id` varchar(255) NOT NULL,
	`provider_id` varchar(64) NOT NULL,
	`user_id` varchar(64) NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` datetime(3),
	`refresh_token_expires_at` datetime(3),
	`scope` varchar(255),
	`password` varchar(255),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `account_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customer` (
	`id` varchar(64) NOT NULL,
	`member_no` varchar(16) NOT NULL,
	`name` varchar(64) NOT NULL,
	`wechat` varchar(64),
	`note` text,
	`balance_cents` int NOT NULL DEFAULT 0,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `customer_id` PRIMARY KEY(`id`),
	CONSTRAINT `customer_member_no_unique` UNIQUE(`member_no`)
);
--> statement-breakpoint
CREATE TABLE `customer_balance_txn` (
	`id` varchar(64) NOT NULL,
	`customer_id` varchar(64) NOT NULL,
	`order_id` varchar(64),
	`type` enum('DEPOSIT','ORDER_DEBIT','ORDER_REFUND') NOT NULL,
	`amount_cents` int NOT NULL,
	`note` text,
	`created_by_id` varchar(64) NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `customer_balance_txn_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order` (
	`id` varchar(64) NOT NULL,
	`dispatcher_id` varchar(64) NOT NULL,
	`player_id` varchar(64) NOT NULL,
	`customer_id` varchar(64) NOT NULL,
	`start_at` datetime(3) NOT NULL,
	`end_at` datetime(3) NOT NULL,
	`duration_min` int NOT NULL,
	`hourly_rate_cents` int NOT NULL,
	`commission_per_hour_cents` int NOT NULL,
	`original_cents` int NOT NULL,
	`discount_cents` int NOT NULL DEFAULT 0,
	`payable_cents` int NOT NULL,
	`prepay_used_cents` int NOT NULL DEFAULT 0,
	`commission_cents` int NOT NULL,
	`player_earn_cents` int NOT NULL,
	`order_status` enum('IN_PROGRESS','COMPLETED','CANCELED') NOT NULL DEFAULT 'IN_PROGRESS',
	`completed_at` datetime(3),
	`canceled_at` datetime(3),
	`cancel_fault` enum('PLAYER','CUSTOMER','SHOP','OTHER'),
	`cancel_note` text,
	`player_compensation_cents` int NOT NULL DEFAULT 0,
	`settle_status` enum('UNSETTLED','SETTLED') NOT NULL DEFAULT 'UNSETTLED',
	`settled_at` datetime(3),
	`paid_method` enum('WECHAT','ALIPAY'),
	`note` text,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `order_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `player_invite` (
	`id` varchar(64) NOT NULL,
	`invite_token` varchar(128) NOT NULL,
	`created_by_id` varchar(64) NOT NULL,
	`player_gender` enum('MALE','FEMALE'),
	`default_rate_cents` int,
	`expires_at` datetime(3) NOT NULL,
	`max_uses` int NOT NULL DEFAULT 1,
	`use_count` int NOT NULL DEFAULT 0,
	`used_at` datetime(3),
	`used_by_id` varchar(64),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `player_invite_id` PRIMARY KEY(`id`),
	CONSTRAINT `player_invite_invite_token_unique` UNIQUE(`invite_token`)
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` varchar(64) NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	`token` varchar(255) NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`ip_address` varchar(64),
	`user_agent` text,
	`user_id` varchar(64) NOT NULL,
	CONSTRAINT `session_id` PRIMARY KEY(`id`),
	CONSTRAINT `session_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` varchar(64) NOT NULL,
	`name` varchar(191) NOT NULL,
	`email` varchar(191) NOT NULL,
	`email_verified` boolean NOT NULL DEFAULT true,
	`image` text,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`username` varchar(64),
	`display_username` varchar(64),
	`role` enum('BOSS','STAFF','PLAYER') NOT NULL DEFAULT 'PLAYER',
	`active` boolean NOT NULL DEFAULT true,
	`player_gender` enum('MALE','FEMALE'),
	`default_rate_cents` int,
	`must_change_pwd` boolean NOT NULL DEFAULT true,
	`wechat_qr_path` varchar(500),
	`alipay_qr_path` varchar(500),
	`qr_security_code_hash` varchar(255),
	CONSTRAINT `user_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_email_unique` UNIQUE(`email`),
	CONSTRAINT `user_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE TABLE `verification` (
	`id` varchar(64) NOT NULL,
	`identifier` varchar(255) NOT NULL,
	`value` text NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	`created_at` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `verification_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `account` ADD CONSTRAINT `account_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customer_balance_txn` ADD CONSTRAINT `customer_balance_txn_customer_id_customer_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customer`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customer_balance_txn` ADD CONSTRAINT `customer_balance_txn_order_id_order_id_fk` FOREIGN KEY (`order_id`) REFERENCES `order`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customer_balance_txn` ADD CONSTRAINT `customer_balance_txn_created_by_id_user_id_fk` FOREIGN KEY (`created_by_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order` ADD CONSTRAINT `order_dispatcher_id_user_id_fk` FOREIGN KEY (`dispatcher_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order` ADD CONSTRAINT `order_player_id_user_id_fk` FOREIGN KEY (`player_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order` ADD CONSTRAINT `order_customer_id_customer_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customer`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `player_invite` ADD CONSTRAINT `player_invite_created_by_id_user_id_fk` FOREIGN KEY (`created_by_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `player_invite` ADD CONSTRAINT `player_invite_used_by_id_user_id_fk` FOREIGN KEY (`used_by_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `session` ADD CONSTRAINT `session_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `customer_name_idx` ON `customer` (`name`);--> statement-breakpoint
CREATE INDEX `customer_wechat_idx` ON `customer` (`wechat`);--> statement-breakpoint
CREATE INDEX `customer_balance_txn_customer_idx` ON `customer_balance_txn` (`customer_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `customer_balance_txn_order_idx` ON `customer_balance_txn` (`order_id`);--> statement-breakpoint
CREATE INDEX `order_player_idx` ON `order` (`player_id`,`start_at`);--> statement-breakpoint
CREATE INDEX `order_dispatcher_idx` ON `order` (`dispatcher_id`);--> statement-breakpoint
CREATE INDEX `order_status_idx` ON `order` (`order_status`,`settle_status`);--> statement-breakpoint
CREATE INDEX `order_customer_idx` ON `order` (`customer_id`);--> statement-breakpoint
CREATE INDEX `order_start_at_idx` ON `order` (`start_at`);--> statement-breakpoint
CREATE INDEX `player_invite_token_idx` ON `player_invite` (`invite_token`);--> statement-breakpoint
CREATE INDEX `player_invite_created_by_idx` ON `player_invite` (`created_by_id`,`created_at`);