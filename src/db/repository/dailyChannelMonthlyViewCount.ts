import { db } from "../index";
import {
  dailyChannelMonthlyViewCount,
  type DailyChannelMonthlyViewCount,
  type DailyChannelMonthlyViewCountInsertInput,
} from "../schema";
import type { DateString } from "../../lib/date-string";
import { eq, and, inArray } from "drizzle-orm";

/**
 * 月間再生数を一括登録
 */
export const bulkInsert = async (
  data: DailyChannelMonthlyViewCountInsertInput[],
): Promise<void> => {
  if (data.length === 0) return;
  await db.insert(dailyChannelMonthlyViewCount).values(data);
};

/**
 * 特定日のデータを取得
 */
export const getByDate = async (
  businessDate: DateString,
): Promise<DailyChannelMonthlyViewCount[]> => {
  return db
    .select()
    .from(dailyChannelMonthlyViewCount)
    .where(eq(dailyChannelMonthlyViewCount.businessDate, businessDate));
};

/**
 * 複数チャンネルの特定日のデータを取得
 */
export const getByChannelIdsAndDate = async (
  channelIds: string[],
  businessDate: DateString,
): Promise<DailyChannelMonthlyViewCount[]> => {
  if (channelIds.length === 0) return [];
  return db
    .select()
    .from(dailyChannelMonthlyViewCount)
    .where(
      and(
        inArray(dailyChannelMonthlyViewCount.channelId, channelIds),
        eq(dailyChannelMonthlyViewCount.businessDate, businessDate),
      ),
    );
};
