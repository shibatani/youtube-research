import "dotenv/config";
import "../config/dayjs";
import { channel } from "../db/repository";
import { notifySlack } from "../infra/slack";

// ============================
// 設定: 非ステルス認定したいYouTubeチャンネルID (UC...) を指定
// ============================
const TARGET_CHANNEL_IDS: string[] = [
  // "UCxxxxxxxxxxxxxxxxxxxxxxxx", // チャンネル名
];

const main = async () => {
  const targetChannels = await channel.getByChannelIds(TARGET_CHANNEL_IDS);

  if (targetChannels.length === 0) {
    console.log("指定されたIDに該当するチャンネルが見つかりませんでした");
    return;
  }

  await channel.bulkMarkAsNotStealth(targetChannels.map(({ id }) => id));

  const nameList = targetChannels.map(({ name }) => `• ${name}`).join("\n");
  console.log(`非ステルス認定したチャンネル一覧:\n${nameList}`);

  const message = `[markAsNotStealth] 非ステルス認定完了\n• 対象: ${targetChannels.length}件\n${nameList}`;
  console.log(message);
  await notifySlack(message);
};

main().catch(console.error);
