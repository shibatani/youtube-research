import { db } from "../index";
import { fukuokaScoutSearchLog, type FukuokaScoutSearchLogInsertInput } from "../schema";

/**
 * 検索ログを登録
 */
export const insert = async (data: FukuokaScoutSearchLogInsertInput): Promise<void> => {
  await db.insert(fukuokaScoutSearchLog).values(data);
};
