import { db } from "../index";
import {
  dailyChannelSubscriberCount,
  type DailyChannelSubscriberCount,
  type DailyChannelSubscriberCountInsertInput,
} from "../schema";
import type { DateString } from "../../lib/date-string";
import { eq, and, inArray } from "drizzle-orm";

/**
 * 登録者数を一括登録
 */
export const bulkInsert = async (data: DailyChannelSubscriberCountInsertInput[]): Promise<void> => {
  if (data.length === 0) return;
  await db.insert(dailyChannelSubscriberCount).values(data);
};

/**
 * 特定日のデータを取得
 */
export const getByDate = async (
  businessDate: DateString,
): Promise<DailyChannelSubscriberCount[]> => {
  return db
    .select()
    .from(dailyChannelSubscriberCount)
    .where(eq(dailyChannelSubscriberCount.businessDate, businessDate));
};

/**
 * 特定日のデータを1件取得（存在確認用）
 */
export const getOneByDate = async (
  businessDate: DateString,
): Promise<DailyChannelSubscriberCount | null> => {
  const result = await db
    .select()
    .from(dailyChannelSubscriberCount)
    .where(eq(dailyChannelSubscriberCount.businessDate, businessDate))
    .limit(1);
  return result[0] ?? null;
};

/**
 * 複数チャンネルの特定日のデータを取得
 */
export const getByChannelIdsAndDate = async (
  channelIds: string[],
  businessDate: DateString,
): Promise<DailyChannelSubscriberCount[]> => {
  if (channelIds.length === 0) return [];
  return db
    .select()
    .from(dailyChannelSubscriberCount)
    .where(
      and(
        inArray(dailyChannelSubscriberCount.channelId, channelIds),
        eq(dailyChannelSubscriberCount.businessDate, businessDate),
      ),
    );
};
