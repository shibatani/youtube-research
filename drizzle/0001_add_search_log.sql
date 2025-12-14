CREATE TABLE `search_log` (
	`id` text PRIMARY KEY NOT NULL,
	`hit_video_count` integer NOT NULL,
	`hit_total_video_count` integer NOT NULL,
	`unique_channel_count` integer NOT NULL,
	`new_channel_count` integer NOT NULL,
	`keyword` text NOT NULL,
	`video_duration` text,
	`order` text,
	`published_after` text,
	`created_at` integer NOT NULL
);
