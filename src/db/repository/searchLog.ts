import { db } from "../index";
import { searchLog, type SearchLog, type SearchLogInsertInput } from "../schema";
import { gte } from "drizzle-orm";
import type { Dayjs } from "dayjs";

/**
 * 検索ログを登録
 */
export const insert = async (data: SearchLogInsertInput): Promise<void> => {
  await db.insert(searchLog).values(data);
};

/**
 * 指定日時以降のログを取得
 */
export const getAfter = async (after: Dayjs): Promise<SearchLog[]> => {
  return db.select().from(searchLog).where(gte(searchLog.createdAt, after));
};
