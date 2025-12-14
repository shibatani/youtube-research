import "dotenv/config";
import { type ChannelInsertInput } from "../../db/schema";
import { channel, searchLog } from "../../db/repository";
import { searchVideos, getChannels, duration, searchOrder } from "../../infra/youtube";
import { buildChannelUrl } from "../../lib/youtube";
import { notifySlack } from "../../infra/slack";
import { isNotNullish } from "../../lib/type-guard";
import { difference, sample } from "lodash";
import dayjs from "dayjs";
import { SEARCH_KEYWORDS } from "./const";

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

/** 検索ログを保存 */
const saveSearchLog = async (params: {
  hitVideoCount: number;
  hitTotalVideoCount: number;
  uniqueChannelCount: number;
  newChannelCount: number;
  keyword: string;
}) =>
  searchLog.insert({
    ...params,
    videoDuration,
    order,
    publishedAfter: publishedAfter.toISOString(),
  });

// ============================
// 検索条件
// ============================
const videoDuration = duration.medium;
const order = searchOrder.viewCount;
const publishedAfter = dayjs().startOf("week");

// ============================
// フィルター条件
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

  const logParams = {
    hitVideoCount: searchResults.length,
    hitTotalVideoCount: totalResults,
    uniqueChannelCount: channelIds.length,
    newChannelCount: newChannelIds.length,
    keyword,
  };

  if (newChannelIds.length === 0) {
    const message = buildNoResultMessage(keyword);
    console.log(message);
    await saveSearchLog(logParams);
    await notifySlack(`[search] ${message}`);
    return;
  }

  await saveSearchLog(logParams);

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
