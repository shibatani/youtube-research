import { sqliteTable, integer, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import dayjs from "dayjs";
import { v4 as uuid } from "uuid";
import { channel } from "./channel";
import { dateString, dayjsTimestamp } from "./customTypes";

/**
 * 直近1ヶ月の動画投稿本数を日次で記録
 */
export const dailyChannelMonthlyVideoCount = sqliteTable(
  "daily_channel_monthly_video_count",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uuid()),
    channelId: text("channel_id")
      .notNull()
      .references(() => channel.id),
    businessDate: dateString("business_date").notNull(),
    count: integer("count").notNull(),
    createdAt: dayjsTimestamp("created_at")
      .notNull()
      .$defaultFn(() => dayjs()),
  },
  (table) => [
    uniqueIndex("daily_channel_monthly_video_count_channel_date_idx").on(
      table.channelId,
      table.businessDate
    ),
  ]
);

// 型エクスポート
export type DailyChannelMonthlyVideoCount =
  typeof dailyChannelMonthlyVideoCount.$inferSelect;
export type DailyChannelMonthlyVideoCountInsertInput =
  typeof dailyChannelMonthlyVideoCount.$inferInsert;
