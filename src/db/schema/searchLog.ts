import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import dayjs from "dayjs";
import { v4 as uuid } from "uuid";
import { dayjsTimestamp } from "./customTypes";

/**
 * YouTube検索のログ（検索条件と結果を記録）
 */
export const searchLog = sqliteTable("search_log", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uuid()),
  hitVideoCount: integer("hit_video_count").notNull(),
  hitTotalVideoCount: integer("hit_total_video_count").notNull(),
  uniqueChannelCount: integer("unique_channel_count").notNull(),
  newChannelCount: integer("new_channel_count").notNull(),
  keyword: text("keyword").notNull(),
  videoDuration: text("video_duration"),
  order: text("order"),
  publishedAfter: text("published_after"),
  createdAt: dayjsTimestamp("created_at")
    .notNull()
    .$defaultFn(() => dayjs()),
});

// 型エクスポート
export type SearchLog = typeof searchLog.$inferSelect;
export type SearchLogInsertInput = typeof searchLog.$inferInsert;
