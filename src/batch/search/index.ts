import "dotenv/config";
import { type ChannelInsertInput } from "../../db/schema";
import { channel, searchLog } from "../../db/repository";
import { searchVideos, getChannels, duration, searchOrder } from "../../infra/youtube";
import { notifySlack } from "../../infra/slack";
import { isNotNullish } from "../../lib/type-guard";
import { difference, sample } from "lodash";
import dayjs from "dayjs";
import { SEARCH_KEYWORDS } from "./const";
import { filterByStats, filterByStealth, type JudgeResult } from "./filter";
import { buildChannelUrl } from "../../lib/youtube";

const saveSearchLog = async (params: {
  hitVideoCount: number;
  hitTotalVideoCount: number;
  uniqueChannelCount: number;
  newChannelCount: number;
  keyword: string;
}) =>
  await searchLog.insert({
    ...params,
    videoDuration,
    order,
    publishedAfter: publishedAfter.toISOString(),
  });

const buildResultMessage = ({
  keyword,
  passed = [],
  rejected = [],
}: {
  keyword: string;
  passed?: JudgeResult[];
  rejected?: JudgeResult[];
}): string => {
  if (passed.length === 0 && rejected.length === 0) {
    return `[search] 🔍 キーワード: ${keyword}\n📭 新規チャンネルは見つかりませんでした`;
  }

  const passedList =
    passed.length > 0
      ? passed
          .map(
            ({ channel, confidence }) =>
              `📺 ${channel.snippet?.title} → stealth (${confidence}%)\n   ${buildChannelUrl(channel.id!)}`,
          )
          .join("\n")
      : "なし";

  const rejectedSection =
    rejected.length > 0
      ? `\n\n除外:\n${rejected
          .map(
            ({ channel, confidence }) =>
              `❌ ${channel.snippet?.title} → not_stealth (${confidence}%)\n   ${buildChannelUrl(channel.id!)}`,
          )
          .join("\n")}`
      : "";

  return `[search] キーワード「${keyword}」: ${passed.length}件登録\n\n${passedList}${rejectedSection}`;
};

// ============================
// 検索条件
// ============================
const videoDuration = duration.medium;
const order = searchOrder.viewCount;
const publishedAfter = dayjs().subtract(6, "month");

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
    const message = buildResultMessage({ keyword });
    console.log(message);
    await saveSearchLog(logParams);
    await notifySlack(message);
    return;
  }

  await saveSearchLog(logParams);

  const channelDataList = await getChannels({ channelIds: newChannelIds });
  const filteredChannels = filterByStats({ channels: channelDataList });
  console.log(
    `フィルタ後: ${filteredChannels.length}件（除外: ${channelDataList.length - filteredChannels.length}件）`,
  );

  if (filteredChannels.length === 0) {
    const message = buildResultMessage({ keyword });
    console.log(message);
    await notifySlack(message);
    return;
  }

  const { passed, rejected } = await filterByStealth(filteredChannels);
  console.log(
    `Stealth判定: ${passed.length}/${filteredChannels.length}件 通過（除外: ${rejected.length}件）`,
  );

  if (passed.length === 0) {
    const message = buildResultMessage({ keyword, rejected });
    console.log(message);
    await notifySlack(message);
    return;
  }

  const newChannels: ChannelInsertInput[] = passed.map(({ channel: ch }) => ({
    channelId: ch.id!,
    name: ch.snippet?.title ?? "不明",
    thumbnailUrl: ch.snippet?.thumbnails?.default?.url ?? null,
    description: ch.snippet?.description ?? "",
  }));
  await channel.bulkInsert(newChannels);

  const message = buildResultMessage({ keyword, passed, rejected });
  console.log(message);
  await notifySlack(message);
};

main().catch(async (error) => {
  console.error(error);
  const errorMessage = error instanceof Error ? error.message : String(error);
  await notifySlack(`[search] エラー発生\n\`\`\`${errorMessage}\`\`\``);
});
