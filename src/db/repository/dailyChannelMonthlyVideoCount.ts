import { db } from "../index";
import {
  dailyChannelMonthlyVideoCount,
  type DailyChannelMonthlyVideoCount,
  type DailyChannelMonthlyVideoCountInsertInput,
} from "../schema";
import type { DateString } from "../../lib/date-string";
import { eq, and, inArray } from "drizzle-orm";

/**
 * 月間動画数を一括登録
 */
export const bulkInsert = async (
  data: DailyChannelMonthlyVideoCountInsertInput[]
): Promise<void> => {
  if (data.length === 0) return;
  await db.insert(dailyChannelMonthlyVideoCount).values(data);
};

/**
 * 特定日のデータを取得
 */
export const getByDate = async (
  businessDate: DateString
): Promise<DailyChannelMonthlyVideoCount[]> => {
  return db
    .select()
    .from(dailyChannelMonthlyVideoCount)
    .where(eq(dailyChannelMonthlyVideoCount.businessDate, businessDate));
};

/**
 * 複数チャンネルの特定日のデータを取得
 */
export const getByChannelIdsAndDate = async (
  channelIds: string[],
  businessDate: DateString
): Promise<DailyChannelMonthlyVideoCount[]> => {
  if (channelIds.length === 0) return [];
  return db
    .select()
    .from(dailyChannelMonthlyVideoCount)
    .where(
      and(
        inArray(dailyChannelMonthlyVideoCount.channelId, channelIds),
        eq(dailyChannelMonthlyVideoCount.businessDate, businessDate)
      )
    );
};
