-- 日次積み上げテーブルに (channel_id, business_date) のユニーク制約を追加
CREATE UNIQUE INDEX `daily_channel_subscriber_count_channel_date_idx` ON `daily_channel_subscriber_count` (`channel_id`,`business_date`);
CREATE UNIQUE INDEX `daily_channel_monthly_video_count_channel_date_idx` ON `daily_channel_monthly_video_count` (`channel_id`,`business_date`);
CREATE UNIQUE INDEX `daily_channel_monthly_view_count_channel_date_idx` ON `daily_channel_monthly_view_count` (`channel_id`,`business_date`);
