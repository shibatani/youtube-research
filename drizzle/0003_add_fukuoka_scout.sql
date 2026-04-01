CREATE TABLE `fukuoka_scout_video` (
	`id` text PRIMARY KEY NOT NULL,
	`video_id` text NOT NULL,
	`channel_id` text NOT NULL,
	`title` text NOT NULL,
	`channel_name` text NOT NULL,
	`view_count` integer NOT NULL,
	`subscriber_count` integer NOT NULL,
	`spread_rate` real NOT NULL,
	`base_spread_rate` real NOT NULL,
	`spread_ratio` real NOT NULL,
	`keyword` text NOT NULL,
	`published_at` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fukuoka_scout_video_video_id_unique` ON `fukuoka_scout_video` (`video_id`);
--> statement-breakpoint
CREATE TABLE `fukuoka_scout_search_log` (
	`id` text PRIMARY KEY NOT NULL,
	`keyword` text NOT NULL,
	`video_duration` text NOT NULL,
	`hit_count` integer NOT NULL,
	`new_count` integer NOT NULL,
	`created_at` integer NOT NULL
);
