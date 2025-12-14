import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import dayjs from "dayjs";
import { v4 as uuid } from "uuid";
import { dayjsTimestamp } from "./customTypes";

/**
 * 監視対象のYouTubeチャンネルの基本情報
 */
export const channel = sqliteTable("channel", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uuid()),
  channelId: text("channel_id").notNull().unique(), // YouTube channel ID (UC...)
  name: text("name").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: dayjsTimestamp("created_at")
    .notNull()
    .$defaultFn(() => dayjs()),
  updatedAt: dayjsTimestamp("updated_at")
    .notNull()
    .$defaultFn(() => dayjs())
    .$onUpdateFn(() => dayjs()),
});

// 型エクスポート
export type Channel = typeof channel.$inferSelect;
export type ChannelInsertInput = typeof channel.$inferInsert;
