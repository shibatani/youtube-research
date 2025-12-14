import "dotenv/config";
import { type ChannelInsertInput } from "../db/schema";
import { channel, searchLog } from "../db/repository";
import { searchVideos, getChannels, duration, searchOrder } from "../infra/youtube";
import { buildChannelUrl } from "../lib/youtube";
import { notifySlack } from "../infra/slack";
import { isNotNullish } from "../lib/type-guard";
import { difference, sample } from "lodash";
import dayjs from "dayjs";

const SEARCH_KEYWORDS = [
  // 音声合成系
  "ゆっくり",
  "ゆっくり 解説",
  "ボイスロイド 解説",
  "ずんだもん",
  "ずんだもん 解説",
  // まとめ・反応系
  "2ch",
  "5ch",
  "海外 反応",
  "コメント欄 反応",
  "反応集",
  // 日本賞賛・感動系
  "日本 海外の反応",
  "日本 感動",
  "日本 賞賛",
  "スカッと",
  "感動",
  // ホラー・怪談系
  "都市伝説",
  "作業用 怪談",
  // 知識・解説系
  "雑学 解説",
  "歴史ミステリー",
  "世界の闇",
  // 作業用・ながら聴き系
  "作業用 解説",
  "ラジオ風 解説",
  "ながら聴き 解説",
];

const buildSuccessMessage = (
  keyword: string,
  channels: { name: string; channelId: string }[],
): string =>
  [
    `🔍 キーワード: ${keyword}`,
    `✅ ${channels.length}件のチャンネルを登録しました`,
    ...channels.map(({ name, channelId }) => `• ${name}\n  ${buildChannelUrl(channelId)}`),
  ].join("\n");

const buildNoResultMessage = (keyword: string): string =>
  `🔍 キーワード: ${keyword}\n📭 新規チャンネルは見つかりませんでした`;

// ============================
// 検索条件（可変）
// ============================
const videoDuration = duration.medium;
const order = searchOrder.viewCount;
const publishedAfter = dayjs().startOf("week");

// ============================
// フィルター条件（可変）
// ============================
const MIN_SUBSCRIBERS = 100;
const MIN_VIDEOS = 5;
const MIN_TOTAL_VIEWS = 10000;
const MIN_AVG_VIEWS_PER_VIDEO = 1000;

const main = async () => {
  const keyword = sample(SEARCH_KEYWORDS)!;
  console.log(`🔍 検索キーワード: ${keyword}`);

  const { items: searchResults, totalResults } = await searchVideos({
    query: keyword,
    videoDuration,
    order,
    publishedAfter,
  });
  console.log(`検索結果: ${searchResults.length}件 (総ヒット数: ${totalResults}件)`);

  const channelIds = [
    ...new Set(
      searchResults.map(({ snippet }) => snippet?.channelId).filter((id) => isNotNullish(id)),
    ),
  ];

  const existingChannels = await channel.getByChannelIds(channelIds);
  const newChannelIds = difference(
    channelIds,
    existingChannels.map(({ channelId }) => channelId),
  );
  console.log(`新規チャンネル数: ${newChannelIds.length}件`);

  if (newChannelIds.length === 0) {
    const message = buildNoResultMessage(keyword);
    console.log(message);
    await searchLog.insert({
      hitVideoCount: searchResults.length,
      hitTotalVideoCount: totalResults,
      uniqueChannelCount: channelIds.length,
      newChannelCount: newChannelIds.length,
      keyword,
      videoDuration,
      order,
      publishedAfter: publishedAfter.toISOString(),
    });
    await notifySlack(`[search] ${message}`);
    return;
  }

  await searchLog.insert({
    hitVideoCount: searchResults.length,
    hitTotalVideoCount: totalResults,
    uniqueChannelCount: channelIds.length,
    newChannelCount: newChannelIds.length,
    keyword,
    videoDuration,
    order,
    publishedAfter: publishedAfter.toISOString(),
  });

  const channelDataList = await getChannels({ channelIds: newChannelIds });

  const filteredChannels = channelDataList.filter(({ statistics }) => {
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
  console.log(
    `フィルタ後: ${filteredChannels.length}件（除外: ${channelDataList.length - filteredChannels.length}件）`,
  );

  if (filteredChannels.length === 0) {
    const message = buildNoResultMessage(keyword);
    console.log(message);
    await notifySlack(`[search] ${message}`);
    return;
  }

  const newChannels: ChannelInsertInput[] = filteredChannels.map(({ id, snippet }) => ({
    channelId: id!,
    name: snippet?.title ?? "不明",
    thumbnailUrl: snippet?.thumbnails?.default?.url ?? null,
  }));

  await channel.bulkInsert(newChannels);

  const message = buildSuccessMessage(keyword, newChannels);
  console.log(message);
  await notifySlack(`[search] ${message}`);
};

main().catch(async (error) => {
  console.error(error);
  const errorMessage = error instanceof Error ? error.message : String(error);
  await notifySlack(`[search] エラー発生\n\`\`\`${errorMessage}\`\`\``);
});
