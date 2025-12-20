import "dotenv/config";
import "../../config/dayjs";
import dayjs from "dayjs";
import { channel } from "../../db/repository";
import { openai } from "../../infra/openai";
import { notifySlack } from "../../infra/slack";

const main = async () => {
  const allChannels = await channel.getAll();
  console.log(`学習データ: ${allChannels.length}件`);

  const jsonl = allChannels
    .map(({ name, description, isStealth }) =>
      JSON.stringify({
        messages: [
          {
            role: "user",
            content: `チャンネル名: ${name}\n説明: ${description}`,
          },
          {
            role: "assistant",
            content: isStealth ? "stealth" : "not_stealth",
          },
        ],
      }),
    )
    .join("\n");

  const file = await openai.files.create({
    file: new File([jsonl], "training.jsonl", { type: "application/jsonl" }),
    purpose: "fine-tune",
  });

  console.log(`ファイルアップロード完了: ${file.id}`);

  const job = await openai.fineTuning.jobs.create({
    training_file: file.id,
    model: "gpt-4o-mini-2024-07-18",
    suffix: dayjs().format("YYYYMMDD"),
  });

  console.log(`Fine-tuning ジョブ開始: ${job.id}`);

  // 5. Slack 通知
  await notifySlack(
    `🚀 [train] 学習開始\n` +
      `ジョブID: \`${job.id}\`\n` +
      `学習データ: ${allChannels.length}件\n` +
      `完了後、Dashboard で新モデルIDを確認し FINETUNE_MODEL_ID に設定してください`,
  );
};

main().catch(async (error) => {
  console.error(error);
  const errorMessage = error instanceof Error ? error.message : String(error);
  await notifySlack(`❌ [train] エラー発生\n\`\`\`${errorMessage}\`\`\``);
  process.exit(1);
});
