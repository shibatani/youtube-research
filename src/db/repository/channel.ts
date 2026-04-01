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
export const getByChannelIds = async (channelIds: string[]): Promise<Channel[]> => {
  if (channelIds.length === 0) return [];
  return db.select().from(channel).where(inArray(channel.channelId, channelIds));
};

/**
 * チャンネルを一括登録
 */
export const bulkInsert = async (data: ChannelInsertInput[]): Promise<void> => {
  if (data.length === 0) return;
  await db.insert(channel).values(data);
};

/**
 * 複数チャンネルの isActive を一括更新
 */
export const bulkUpdateActiveStatus = async ({
  ids,
  isActive,
}: {
  ids: string[];
  isActive: boolean;
}): Promise<void> => {
  if (ids.length === 0) return;
  await db.update(channel).set({ isActive }).where(inArray(channel.id, ids));
};

/**
 * 複数チャンネルを非ステルス認定（isActive: false, isStealth: false）
 */
export const bulkMarkAsNotStealth = async (ids: string[]): Promise<void> => {
  if (ids.length === 0) return;
  await db
    .update(channel)
    .set({ isActive: false, isStealth: false })
    .where(inArray(channel.id, ids));
};

/**
 * 複数チャンネルをステルス認定（isActive: false, isStealth: true）
 */
export const bulkMarkAsStealth = async (ids: string[]): Promise<void> => {
  if (ids.length === 0) return;
  await db.update(channel).set({ isActive: true, isStealth: true }).where(inArray(channel.id, ids));
};
