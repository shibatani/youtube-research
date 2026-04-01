import { db } from "../index";
import {
  fukuokaScoutVideo,
  type FukuokaScoutVideo,
  type FukuokaScoutVideoInsertInput,
} from "../schema";
import { inArray, desc } from "drizzle-orm";

/**
 * 検出済み動画のvideo_idを一括取得（重複チェック用）
 */
export const getByVideoIds = async (videoIds: string[]): Promise<FukuokaScoutVideo[]> => {
  if (videoIds.length === 0) return [];
  return db.select().from(fukuokaScoutVideo).where(inArray(fukuokaScoutVideo.videoId, videoIds));
};

/**
 * 動画を一括登録
 */
export const bulkInsert = async (data: FukuokaScoutVideoInsertInput[]): Promise<void> => {
  if (data.length === 0) return;
  await db.insert(fukuokaScoutVideo).values(data);
};

/**
 * 全動画を再生数順で取得（GitHub Pages用）
 */
export const getAllOrderByViewCount = async (): Promise<FukuokaScoutVideo[]> => {
  return db.select().from(fukuokaScoutVideo).orderBy(desc(fukuokaScoutVideo.viewCount));
};
