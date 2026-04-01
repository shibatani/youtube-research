import "dotenv/config";
import { sample } from "lodash";
import { searchVideos, getVideos, getChannels, duration, searchOrder } from "../../infra/youtube";
import { fukuokaScoutVideo, fukuokaScoutSearchLog } from "../../db/repository";
import { type FukuokaScoutVideoInsertInput } from "../../db/schema";
import { isNotNullish } from "../../lib/type-guard";
import { FUKUOKA_SCOUT_KEYWORDS, MIN_VIEW_COUNT } from "./const";
import { getSpreadRate, getVideoBaseSpreadRate, getSpreadRatio } from "./calculator";
import { generatePage } from "./page";

const main = async () => {
  // キーワードをランダム選択
  const keyword = sample(FUKUOKA_SCOUT_KEYWORDS)!;
  console.log(`🔍 キーワード: ${keyword}`);

  // videoDuration をランダム選択（medium or long）
  const videoDuration = sample([duration.medium, duration.long])!;
  console.log(`📏 動画長さ: ${videoDuration}`);

  // YouTube Search API で検索（全期間、再生数順）
  const { items: searchResults, totalResults } = await searchVideos({
    query: keyword,
    videoDuration,
    order: searchOrder.viewCount,
    publishedAfter: null,
  });
  console.log(`検索結果: ${searchResults.length}件 (総ヒット数: ${totalResults}件)`);

  // 動画IDを抽出
  const videoIds = searchResults.map(({ id }) => id?.videoId).filter(isNotNullish);

  if (videoIds.length === 0) {
    console.log("動画IDが取得できませんでした");
    await fukuokaScoutSearchLog.insert({
      keyword,
      videoDuration,
      hitCount: 0,
      newCount: 0,
    });
    return;
  }

  // videos.list で再生数を取得
  const videos = await getVideos({ videoIds });
  console.log(`動画詳細取得: ${videos.length}件`);

  // 再生5万回以上でフィルタ
  const filteredVideos = videos.filter(({ statistics }) => {
    const viewCount = parseInt(statistics?.viewCount ?? "0", 10);
    return viewCount >= MIN_VIEW_COUNT;
  });
  console.log(
    `フィルタ後（${MIN_VIEW_COUNT.toLocaleString()}再生以上）: ${filteredVideos.length}件`,
  );

  if (filteredVideos.length === 0) {
    await fukuokaScoutSearchLog.insert({
      keyword,
      videoDuration,
      hitCount: searchResults.length,
      newCount: 0,
    });
    console.log("条件を満たす動画がありませんでした");
    return;
  }

  // 重複チェック
  const filteredVideoIds = filteredVideos.map(({ id }) => id).filter(isNotNullish);
  const existingVideos = await fukuokaScoutVideo.getByVideoIds(filteredVideoIds);
  const existingVideoIds = new Set(existingVideos.map(({ videoId }) => videoId));
  const newVideos = filteredVideos.filter(({ id }) => id && !existingVideoIds.has(id));
  console.log(`新規動画: ${newVideos.length}件（既存: ${existingVideos.length}件）`);

  if (newVideos.length === 0) {
    await fukuokaScoutSearchLog.insert({
      keyword,
      videoDuration,
      hitCount: searchResults.length,
      newCount: 0,
    });
    console.log("新規動画はありませんでした");
    return;
  }

  // channels.list で登録者数を取得
  const channelIds = [
    ...new Set(newVideos.map(({ snippet }) => snippet?.channelId).filter(isNotNullish)),
  ];
  const channels = await getChannels({ channelIds });
  const channelMap = new Map(channels.map((ch) => [ch.id!, ch]));
  console.log(`チャンネル情報取得: ${channels.length}件`);

  // 指標計算 & DB保存データ作成
  const insertData: FukuokaScoutVideoInsertInput[] = newVideos
    .map((video) => {
      const channel = channelMap.get(video.snippet?.channelId ?? "");
      if (!channel) return null;

      const viewCount = parseInt(video.statistics?.viewCount ?? "0", 10);
      const subscriberCount = parseInt(channel.statistics?.subscriberCount ?? "0", 10);
      const spreadRate = getSpreadRate(viewCount, subscriberCount);
      const baseSpreadRate = getVideoBaseSpreadRate(subscriberCount);
      const spreadRatio = getSpreadRatio(spreadRate, baseSpreadRate);

      return {
        videoId: video.id!,
        channelId: video.snippet?.channelId ?? "",
        title: video.snippet?.title ?? "",
        channelName: video.snippet?.channelTitle ?? "",
        viewCount,
        subscriberCount,
        spreadRate,
        baseSpreadRate,
        spreadRatio,
        keyword,
        publishedAt: video.snippet?.publishedAt ?? null,
      };
    })
    .filter(isNotNullish);

  // DB保存
  await fukuokaScoutVideo.bulkInsert(insertData);
  console.log(`✅ DB保存完了: ${insertData.length}件`);

  // 検索ログ保存
  await fukuokaScoutSearchLog.insert({
    keyword,
    videoDuration,
    hitCount: searchResults.length,
    newCount: insertData.length,
  });

  // GitHub Pages用HTML生成
  await generatePage();
  console.log("✅ HTML生成完了");
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
