CREATE TABLE `channel` (
	`id` text PRIMARY KEY NOT NULL,
	`channel_id` text NOT NULL,
	`name` text NOT NULL,
	`thumbnail_url` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `channel_channel_id_unique` ON `channel` (`channel_id`);--> statement-breakpoint
CREATE TABLE `daily_channel_monthly_video_count` (
	`id` text PRIMARY KEY NOT NULL,
	`channel_id` text NOT NULL,
	`business_date` text NOT NULL,
	`count` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`channel_id`) REFERENCES `channel`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `daily_channel_monthly_view_count` (
	`id` text PRIMARY KEY NOT NULL,
	`channel_id` text NOT NULL,
	`business_date` text NOT NULL,
	`count` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`channel_id`) REFERENCES `channel`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `daily_channel_subscriber_count` (
	`id` text PRIMARY KEY NOT NULL,
	`channel_id` text NOT NULL,
	`business_date` text NOT NULL,
	`count` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`channel_id`) REFERENCES `channel`(`id`) ON UPDATE no action ON DELETE no action
);
