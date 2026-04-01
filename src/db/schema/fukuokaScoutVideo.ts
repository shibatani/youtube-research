import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import dayjs from "dayjs";
import { v4 as uuid } from "uuid";
import { dayjsTimestamp } from "./customTypes";

/**
 * fukuoka-scout で検出した動画
 */
export const fukuokaScoutVideo = sqliteTable("fukuoka_scout_video", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uuid()),
  videoId: text("video_id").notNull().unique(),
  channelId: text("channel_id").notNull(),
  title: text("title").notNull(),
  channelName: text("channel_name").notNull(),
  viewCount: integer("view_count").notNull(),
  subscriberCount: integer("subscriber_count").notNull(),
  spreadRate: real("spread_rate").notNull(),
  baseSpreadRate: real("base_spread_rate").notNull(),
  spreadRatio: real("spread_ratio").notNull(),
  keyword: text("keyword").notNull(),
  publishedAt: text("published_at"),
  createdAt: dayjsTimestamp("created_at")
    .notNull()
    .$defaultFn(() => dayjs()),
});

export type FukuokaScoutVideo = typeof fukuokaScoutVideo.$inferSelect;
export type FukuokaScoutVideoInsertInput = typeof fukuokaScoutVideo.$inferInsert;
