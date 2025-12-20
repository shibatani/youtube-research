import { type Channel as YouTubeChannel } from "../../infra/youtube";
import { openai } from "../../infra/openai";
import { notifySlack } from "../../infra/slack";
import { EXCLUDE_KEYWORDS } from "./const";

// ============================
// フィルター条件
// ============================
const MIN_SUBSCRIBERS = 100;
const MIN_VIDEOS = 5;
const MIN_TOTAL_VIEWS = 10000;
const MIN_AVG_VIEWS_PER_VIDEO = 1000;

const containsExcludeKeyword = ({ text }: { text: string | null | undefined }): boolean =>
  EXCLUDE_KEYWORDS.some((keyword) => text?.includes(keyword) ?? false);

export const filterByStats = ({ channels }: { channels: YouTubeChannel[] }): YouTubeChannel[] =>
  channels.filter(({ snippet, statistics }) => {
    if (
      containsExcludeKeyword({ text: snippet?.title }) ||
      containsExcludeKeyword({ text: snippet?.description })
    ) {
      return false;
    }

    const subscriberCount = Number(statistics?.subscriberCount ?? 0);
    const videoCount = Number(statistics?.videoCount ?? 0);
    const viewCount = Number(statistics?.viewCount ?? 0);
    const avgViewsPerVideo = videoCount > 0 ? viewCount / videoCount : 0;

    return (
      subscriberCount >= MIN_SUBSCRIBERS &&
      videoCount >= MIN_VIDEOS &&
      viewCount >= MIN_TOTAL_VIEWS &&
      avgViewsPerVideo >= MIN_AVG_VIEWS_PER_VIDEO
    );
  });

export type JudgeResult = {
  channel: YouTubeChannel;
  isStealth: boolean;
  confidence: number;
};

export const judgeByStealth = async (channels: YouTubeChannel[]): Promise<JudgeResult[]> => {
  const modelId = process.env.FINETUNE_MODEL_ID;

  if (!modelId) {
    console.log("FINETUNE_MODEL_ID未設定: フィルタをスキップ");
    return channels.map((channel) => ({
      channel,
      isStealth: true,
      confidence: 100,
    }));
  }

  return Promise.all(
    channels.map(async (channel) => {
      try {
        const response = await openai.chat.completions.create({
          model: modelId,
          messages: [
            {
              role: "user",
              content: `チャンネル名: ${channel.snippet?.title}\n説明: ${channel.snippet?.description}`,
            },
          ],
          max_tokens: 10,
          logprobs: true,
        });

        const content = response.choices[0]?.message?.content?.trim() ?? "";
        const isStealth = content === "stealth";
        const logprob = response.choices[0]?.logprobs?.content?.[0]?.logprob ?? 0;
        const confidence = Math.round(Math.exp(logprob) * 100);

        return { channel, isStealth, confidence };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`判定エラー: ${channel.snippet?.title}`, error);
        await notifySlack(
          `⚠️ [search] Stealth判定エラー\nチャンネル: ${channel.snippet?.title}\n\`\`\`${errorMessage}\`\`\``,
        );
        return { channel, isStealth: true, confidence: 0 };
      }
    }),
  );
};
