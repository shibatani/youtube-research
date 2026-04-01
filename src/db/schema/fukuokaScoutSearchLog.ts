import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import dayjs from "dayjs";
import { v4 as uuid } from "uuid";
import { dayjsTimestamp } from "./customTypes";

/**
 * fukuoka-scout の検索ログ（キーワード差し替え判断用）
 */
export const fukuokaScoutSearchLog = sqliteTable("fukuoka_scout_search_log", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uuid()),
  keyword: text("keyword").notNull(),
  videoDuration: text("video_duration").notNull(),
  hitCount: integer("hit_count").notNull(),
  newCount: integer("new_count").notNull(),
  createdAt: dayjsTimestamp("created_at")
    .notNull()
    .$defaultFn(() => dayjs()),
});

export type FukuokaScoutSearchLog = typeof fukuokaScoutSearchLog.$inferSelect;
export type FukuokaScoutSearchLogInsertInput = typeof fukuokaScoutSearchLog.$inferInsert;
