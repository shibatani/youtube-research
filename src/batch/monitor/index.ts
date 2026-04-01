import "dotenv/config";
import "../../config/dayjs";
import dayjs from "dayjs";
import { sumBy } from "lodash";
import pMap from "p-map";
import {
  type DailyChannelSubscriberCountInsertInput,
  type DailyChannelMonthlyVideoCountInsertInput,
  type DailyChannelMonthlyViewCountInsertInput,
} from "../../db/schema";
import { channel, subscriberCount, videoCount, viewCount } from "../../db/repository";
import { getChannels, getChannelVideos, getVideos } from "../../infra/youtube";
import { clearSheet, updateSheet } from "../../infra/sheets";
import { notifySlack } from "../../infra/slack";
import { keyByMap, groupByMap } from "../../lib/map";
import { dateObjectToDateString } from "../../lib/date-string";
import { isNotNull, isNotNullish } from "../../lib/type-guard";
import { buildChannelUrl } from "../../lib/youtube";
import { getBaseSpreadRate } from "./calculator";

/** 秒を「MM:SS」形式に変換 */
const formatDuration = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const today = dateObjectToDateString(dayjs());
const yesterday = dateObjectToDateString(dayjs().subtract(1, "day"));
const oneMonthAgo = dayjs().subtract(1, "month");

/** Shorts判定の閾値（秒） - 3分以下をShortsとみなす */
const SHORTS_MAX_DURATION_SECONDS = 180;

/** チャンネル監視に必要なデータを一括取得 */
const loadChannelMonitorData = async () => {
  const activeChannels = await channel.getActive();
  console.log(`対象チャンネル数: ${activeChannels.length}件`);

  const activeChannelIds = activeChannels.map(({ channelId }) => channelId);

  const channels = await getChannels({ channelIds: activeChannelIds });
  console.log(`チャンネル情報取得: ${channels.length}件`);

  const playlistItemsResults = await pMap(
    activeChannelIds,
    (channelId) => getChannelVideos({ channelId }),
    { concurrency: 10 },
  );

  const playlistItems = playlistItemsResults.flat().filter((item) => {
    const publishedAt = item.contentDetails?.videoPublishedAt;
    if (!publishedAt) return false;
    return dayjs(publishedAt).isAfter(oneMonthAgo);
  });
  console.log(`直近1ヶ月の動画数: ${playlistItems.length}件`);

  const videoIds = playlistItems
    .map(({ contentDetails }) => contentDetails?.videoId)
    .filter(isNotNullish);

  const videos = await getVideos({ videoIds });
  console.log(`動画詳細取得: ${videos.length}件`);

  const nonShortsVideos = videos.filter(({ contentDetails }) => {
    const seconds = dayjs.duration(contentDetails?.duration ?? "PT0S").asSeconds();
    return seconds > SHORTS_MAX_DURATION_SECONDS;
  });
  const nonShortsVideosMap = keyByMap(
    nonShortsVideos.filter(({ id }) => isNotNullish(id)),
    ({ id }) => id!,
  );
  const nonShortsPlaylistItems = playlistItems.filter(
    ({ contentDetails }) =>
      isNotNullish(contentDetails?.videoId) && nonShortsVideosMap.has(contentDetails.videoId),
  );
  console.log(
    `Shorts除外: ${videos.length - nonShortsVideos.length}件 → 通常動画: ${nonShortsVideos.length}件`,
  );

  console.log("DB履歴データ取得中...");
  const dbChannelIds = activeChannels.map(({ id }) => id);

  const [subscribers, videoCounts, viewCounts] = await Promise.all([
    subscriberCount.getByChannelIdsAndDate(dbChannelIds, yesterday),
    videoCount.getByChannelIdsAndDate(dbChannelIds, yesterday),
    viewCount.getByChannelIdsAndDate(dbChannelIds, yesterday),
  ]);

  return {
    activeChannels,
    playlistItems,
    channelsMap: keyByMap(channels, ({ id }) => id!),
    videosMap: keyByMap(nonShortsVideos, ({ id }) => id!),
    channelIdToAllPlaylistItemsMap: groupByMap(playlistItems, ({ snippet }) => snippet?.channelId!),
    channelIdToPlaylistItemsMap: groupByMap(
      nonShortsPlaylistItems,
      ({ snippet }) => snippet?.channelId!,
    ),
    channelIdToSubscriberMap: keyByMap(subscribers, ({ channelId }) => channelId),
    channelIdToVideoCountMap: keyByMap(videoCounts, ({ channelId }) => channelId),
    channelIdToViewCountMap: keyByMap(viewCounts, ({ channelId }) => channelId),
  };
};

/** チャンネル監視データからDB・スプシ用パラメータを生成 */
const buildChannelMonitorParams = (data: Awaited<ReturnType<typeof loadChannelMonitorData>>) => {
  const {
    activeChannels,
    channelsMap,
    videosMap,
    channelIdToPlaylistItemsMap,
    channelIdToSubscriberMap,
    channelIdToVideoCountMap,
    channelIdToViewCountMap,
  } = data;

  const channelMetrics = activeChannels.flatMap((activeChannel) => {
    const channelData = channelsMap.get(activeChannel.channelId);
    if (!channelData) {
      console.warn(`チャンネルデータなし: ${activeChannel.channelId}`);
      return [];
    }

    const subscriberCount = parseInt(channelData.statistics?.subscriberCount ?? "0", 10);
    const channelPublishedAt = channelData.snippet?.publishedAt ?? null;

    // 直近1ヶ月の動画投稿本数
    const videos = channelIdToPlaylistItemsMap.get(activeChannel.channelId) ?? [];
    const videoCount = videos.length;

    // 動画詳細から統計情報取得
    const videoDetails = videos
      .map(({ contentDetails }) => videosMap.get(contentDetails?.videoId!))
      .filter((videoDetail) => isNotNullish(videoDetail));

    // 直近1ヶ月の再生数合計
    const monthlyViewCount = sumBy(videoDetails, ({ statistics }) =>
      parseInt(statistics?.viewCount ?? "0", 10),
    );

    // 平均動画長さ（秒）
    const avgDurationSeconds =
      videoDetails.length > 0
        ? sumBy(videoDetails, ({ contentDetails }) =>
            dayjs.duration(contentDetails?.duration ?? "PT0S").asSeconds(),
          ) / videoDetails.length
        : 0;

    // 平均再生数
    const avgViewCount = videoCount > 0 ? monthlyViewCount / videoCount : 0;

    // 拡散率
    const spreadRate = subscriberCount > 0 ? monthlyViewCount / subscriberCount : 0;

    // 基準拡散率・拡散比率
    const baseSpreadRate = getBaseSpreadRate(subscriberCount);
    const spreadRatio = (spreadRate / baseSpreadRate) * 100;

    // 前日比計算
    const yesterdayVideoCount = channelIdToVideoCountMap.get(activeChannel.id);
    const yesterdayViewCount = channelIdToViewCountMap.get(activeChannel.id);
    const yesterdaySubscriberCount = channelIdToSubscriberMap.get(activeChannel.id);

    const yesterdayAvgViewCount =
      yesterdayVideoCount && yesterdayViewCount && yesterdayVideoCount.count > 0
        ? yesterdayViewCount.count / yesterdayVideoCount.count
        : null;

    const yesterdaySpreadRate =
      yesterdayViewCount && yesterdaySubscriberCount && yesterdaySubscriberCount.count > 0
        ? yesterdayViewCount.count / yesterdaySubscriberCount.count
        : null;

    const avgViewCountDiff =
      isNotNull(yesterdayAvgViewCount) && yesterdayAvgViewCount > 0
        ? ((avgViewCount - yesterdayAvgViewCount) / yesterdayAvgViewCount) * 100
        : null;
    const spreadRateDiff =
      isNotNull(yesterdaySpreadRate) && yesterdaySpreadRate > 0
        ? ((spreadRate - yesterdaySpreadRate) / yesterdaySpreadRate) * 100
        : null;

    const subscriberGrowthRate =
      yesterdaySubscriberCount && yesterdaySubscriberCount.count > 0
        ? ((subscriberCount - yesterdaySubscriberCount.count) / yesterdaySubscriberCount.count) *
          100
        : null;

    // 月収予想（円）
    const estimatedMonthlyRevenue = videoCount * avgViewCount * 0.3;

    return [
      {
        channel: activeChannel,
        subscriberCount,
        videoCount,
        monthlyViewCount,
        avgDurationSeconds,
        avgViewCount,
        spreadRate,
        baseSpreadRate,
        spreadRatio,
        avgViewCountDiff,
        spreadRateDiff,
        subscriberGrowthRate,
        estimatedMonthlyRevenue,
        channelPublishedAt,
      },
    ];
  });

  // DB INSERT用データ
  const subscriberInserts: DailyChannelSubscriberCountInsertInput[] = channelMetrics.map(
    ({ channel, subscriberCount }) => ({
      channelId: channel.id,
      businessDate: today,
      count: subscriberCount,
    }),
  );

  const videoCountInserts: DailyChannelMonthlyVideoCountInsertInput[] = channelMetrics.map(
    ({ channel, videoCount }) => ({
      channelId: channel.id,
      businessDate: today,
      count: videoCount,
    }),
  );

  const viewCountInserts: DailyChannelMonthlyViewCountInsertInput[] = channelMetrics.map(
    ({ channel, monthlyViewCount }) => ({
      channelId: channel.id,
      businessDate: today,
      count: monthlyViewCount,
    }),
  );

  // スプシ用データ
  const sheetRows: (string | number)[][] = [
    [
      "チャンネルアイコン",
      "チャンネル名",
      "チャンネルリンク",
      "チャンネル作成日",
      "DB登録日",
      "登録者数",
      "登録者前日比増加率(%)",
      "直近1ヶ月投稿本数",
      "平均動画長さ",
      "平均再生数",
      "平均再生数前日比(%)",
      "拡散率",
      "基準拡散率",
      "拡散比率(%)",
      "拡散率前日比(%)",
      "月収予想(円)",
    ],
    ...channelMetrics.map((metrics) => [
      `=IMAGE("${metrics.channel.thumbnailUrl ?? ""}")`,
      metrics.channel.name,
      buildChannelUrl(metrics.channel.channelId),
      metrics.channelPublishedAt ? dateObjectToDateString(dayjs(metrics.channelPublishedAt)) : "-",
      dateObjectToDateString(metrics.channel.createdAt),
      metrics.subscriberCount,
      isNotNull(metrics.subscriberGrowthRate)
        ? Math.round(metrics.subscriberGrowthRate * 1000) / 1000
        : "-",
      metrics.videoCount,
      formatDuration(metrics.avgDurationSeconds),
      Math.round(metrics.avgViewCount),
      isNotNull(metrics.avgViewCountDiff) ? Math.round(metrics.avgViewCountDiff) : "-",
      Math.round(metrics.spreadRate * 100) / 100,
      Math.round(metrics.baseSpreadRate * 100) / 100,
      Math.round(metrics.spreadRatio * 100) / 100,
      isNotNull(metrics.spreadRateDiff) ? Math.round(metrics.spreadRateDiff * 100) / 100 : "-",
      Math.round(metrics.estimatedMonthlyRevenue),
    ]),
  ];

  return { subscriberInserts, videoCountInserts, viewCountInserts, sheetRows };
};

const main = async () => {
  console.log(`📅 日次監視開始: ${today}`);

  // NOTE: 本来はmonitor実行ログテーブルで管理すべきだが、
  // 暫定的に積み上げデータの存在有無で重複実行を判定する
  const existingData = await subscriberCount.getOneByDate(today);
  if (existingData) {
    console.log(`⏭️ ${today}のデータは既に存在するためスキップします`);
    await notifySlack(`[monitor] ${today}のデータは既に存在するためスキップしました`);
    return;
  }

  const monitorData = await loadChannelMonitorData();

  // 直近1ヶ月投稿0件のチャンネルを非アクティブ化（Shorts含む全投稿で判定）
  const inactiveChannels = monitorData.activeChannels.filter(
    ({ channelId }) => !monitorData.channelIdToAllPlaylistItemsMap.has(channelId),
  );
  if (inactiveChannels.length > 0) {
    await channel.bulkUpdateActiveStatus({
      ids: inactiveChannels.map(({ id }) => id),
      isActive: false,
    });
    const nameList = inactiveChannels.map(({ name }) => `• ${name}`).join("\n");
    console.log(`直近1ヶ月投稿0件のため非アクティブ化: ${inactiveChannels.length}件`);
    await notifySlack(
      `[monitor] 直近1ヶ月投稿0件のため非アクティブ化: ${inactiveChannels.length}件\n${nameList}`,
    );

    // 非アクティブ化したチャンネルを監視対象から除外
    const inactiveIds = new Set(inactiveChannels.map(({ id }) => id));
    monitorData.activeChannels = monitorData.activeChannels.filter(
      ({ id }) => !inactiveIds.has(id),
    );
  }

  console.log("指標計算中...");
  const { subscriberInserts, videoCountInserts, viewCountInserts, sheetRows } =
    buildChannelMonitorParams(monitorData);

  console.log("DBに保存中...");
  await Promise.all([
    subscriberCount.bulkInsert(subscriberInserts),
    videoCount.bulkInsert(videoCountInserts),
    viewCount.bulkInsert(viewCountInserts),
  ]);
  console.log(`✅DB保存完了: ${subscriberInserts.length}件`);

  console.log("スプレッドシートに出力中...");
  const sheetName = "シート1";
  await clearSheet({ range: `${sheetName}!A:Z` });
  await updateSheet({
    range: `${sheetName}!A1`,
    values: sheetRows,
  });
  console.log(`✅スプシ出力完了: ${sheetRows.length}行`);

  await notifySlack(
    `[monitor] ✅日次監視完了\n• 対象チャンネル: ${monitorData.activeChannels.length}件`,
  );
};

main().catch(async (error) => {
  console.error(error);
  const errorMessage = error instanceof Error ? error.message : String(error);
  await notifySlack(`[monitor] エラー発生\n\`\`\`${errorMessage}\`\`\``);
});
