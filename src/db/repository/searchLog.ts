import { db } from "../index";
import { searchLog, type SearchLogInsertInput } from "../schema";

/**
 * 検索ログを登録
 */
export const insert = async (data: SearchLogInsertInput): Promise<void> => {
  await db.insert(searchLog).values(data);
};
