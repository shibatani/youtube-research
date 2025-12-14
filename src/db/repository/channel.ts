import { db } from "../index";
import { channel, type Channel, type ChannelInsertInput } from "../schema";
import { eq, inArray } from "drizzle-orm";

/**
 * isActive: true のチャンネル一覧を取得
 */
export const getActive = async (): Promise<Channel[]> => {
  return db.select().from(channel).where(eq(channel.isActive, true));
};

/**
 * 全チャンネル一覧を取得
 */
export const getAll = async (): Promise<Channel[]> => {
  return db.select().from(channel);
};

/**
 * YouTube channelId で存在するチャンネルを取得
 */
export const getByChannelIds = async (
  channelIds: string[]
): Promise<Channel[]> => {
  if (channelIds.length === 0) return [];
  return db
    .select()
    .from(channel)
    .where(inArray(channel.channelId, channelIds));
};

/**
 * チャンネルを一括登録
 */
export const bulkInsert = async (data: ChannelInsertInput[]): Promise<void> => {
  if (data.length === 0) return;
  await db.insert(channel).values(data);
};

/**
 * チャンネルの isActive を更新
 */
export const updateActiveStatus = async (
  id: string,
  isActive: boolean
): Promise<void> => {
  await db
    .update(channel)
    .set({ isActive })
    .where(eq(channel.id, id));
};

