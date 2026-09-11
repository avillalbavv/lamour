CREATE TABLE `customer_audit` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`event_type` text NOT NULL,
	`reference_id` text NOT NULL,
	`metadata` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `customer_audit_account_date` ON `customer_audit` (`account_id`,`created_at`);--> statement-breakpoint
ALTER TABLE `orders` ADD `account_id` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `age_confirmed` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `terms_version` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `privacy_version` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `consent_at` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX `orders_account_date` ON `orders` (`account_id`,`created_at`);