import "dotenv/config";
import "../config/dayjs";
import { channel } from "../db/repository";
import { notifySlack } from "../infra/slack";

// ============================
// 設定: 無効化したいYouTubeチャンネルID (UC...) を指定
// ============================
const TARGET_CHANNEL_IDS: string[] = [
  // "UCxxxxxxxxxxxxxxxxxxxxxxxx", // チャンネル名
];

const main = async () => {
  // 対象チャンネルの情報を取得（存在するもののみ）
  const targetChannels = await channel.getByChannelIds(TARGET_CHANNEL_IDS);

  if (targetChannels.length === 0) {
    console.log("指定されたIDに該当するチャンネルが見つかりませんでした");
    return;
  }

  // 存在するチャンネルのDB IDで一括更新
  await channel.bulkUpdateActiveStatus({
    ids: targetChannels.map(({ id }) => id),
    isActive: false,
  });

  const nameList = targetChannels.map(({ name }) => `• ${name}`).join("\n");
  console.log(`無効化したチャンネル一覧:\n${nameList}`);
  const message = `[deactivateChannels] チャンネル無効化完了\n• 対象: ${targetChannels.length}件\n${nameList}`;

  console.log(message);
  await notifySlack(message);
};

main().catch(console.error);
