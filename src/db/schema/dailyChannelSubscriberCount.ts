import { sqliteTable, integer, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import dayjs from "dayjs";
import { v4 as uuid } from "uuid";
import { channel } from "./channel";
import { dateString, dayjsTimestamp } from "./customTypes";

/**
 * チャンネルの登録者数を日次で記録
 */
export const dailyChannelSubscriberCount = sqliteTable(
  "daily_channel_subscriber_count",
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
    uniqueIndex("daily_channel_subscriber_count_channel_date_idx").on(
      table.channelId,
      table.businessDate
    ),
  ]
);

// 型エクスポート
export type DailyChannelSubscriberCount =
  typeof dailyChannelSubscriberCount.$inferSelect;
export type DailyChannelSubscriberCountInsertInput =
  typeof dailyChannelSubscriberCount.$inferInsert;
