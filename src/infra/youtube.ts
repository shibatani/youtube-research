import { google, youtube_v3 } from "googleapis";
import { chunk } from "lodash";
import pMap from "p-map";
import dayjs, { Dayjs } from "dayjs";
import Parser from "rss-parser";

const youtube = google.youtube({
  version: "v3",
  auth: process.env.YOUTUBE_API_KEY,
});

/** YouTube API の1リクエストあたり最大取得件数 */
const MAX_RESULTS = 50;

// ライブラリの公式型を re-export
export type Video = youtube_v3.Schema$Video;
export type Channel = youtube_v3.Schema$Channel;
export type SearchResult = youtube_v3.Schema$SearchResult;
export type VideoSnippet = youtube_v3.Schema$VideoSnippet;
export type VideoStatistics = youtube_v3.Schema$VideoStatistics;
export type VideoContentDetails = youtube_v3.Schema$VideoContentDetails;
export type ChannelSnippet = youtube_v3.Schema$ChannelSnippet;
export type ChannelStatistics = youtube_v3.Schema$ChannelStatistics;
export type SearchResultSnippet = youtube_v3.Schema$SearchResultSnippet;
export type ResourceId = youtube_v3.Schema$ResourceId;
export type PlaylistItem = youtube_v3.Schema$PlaylistItem;

/** 動画の長さフィルタ（Shorts除外などに使用） */
export const duration = {
  short: "short",
  medium: "medium",
  long: "long",
} as const;
export type Duration = (typeof duration)[keyof typeof duration];

/** 検索結果の並び順 */
export const searchOrder = {
  relevance: "relevance",
  date: "date",
  viewCount: "viewCount",
  rating: "rating",
} as const;
export type SearchOrder = (typeof searchOrder)[keyof typeof searchOrder];

/** 複数の動画IDから情報を一括取得（1バッチ50件で1クォータ消費） */
export const getVideos = async ({ videoIds }: { videoIds: string[] }): Promise<Video[]> => {
  const batches = chunk(videoIds, MAX_RESULTS);
  const results = await pMap(
    batches,
    (batch) =>
      youtube.videos.list({ part: ["snippet", "statistics", "contentDetails"], id: batch }),
    { concurrency: 10 },
  );
  return results.flatMap(({ data }) => data.items ?? []);
};

/** 複数のチャンネルIDから情報を一括取得（1バッチ50件で1クォータ消費） */
export const getChannels = async ({ channelIds }: { channelIds: string[] }): Promise<Channel[]> => {
  const batches = chunk(channelIds, MAX_RESULTS);
  const results = await pMap(
    batches,
    (batch) => youtube.channels.list({ part: ["snippet", "statistics"], id: batch }),
    { concurrency: 10 },
  );
  return results.flatMap(({ data }) => data.items ?? []);
};

/** 検索結果の返り値 */
export type SearchVideosResult = {
  items: SearchResult[];
  totalResults: number;
};

/**
 * キーワードで動画を検索（100クォータ消費）
 * @param query - 検索キーワード
 * @param maxResults - 最大取得件数（デフォルト: 50）
 * @param videoDuration - 動画の長さフィルタ（short=4分未満, medium=4〜20分, long=20分以上）
 * @param order - 並び順（relevance, date, viewCount, rating）
 * @param publishedAfter - この日時以降に公開された動画（デフォルト: 今週の開始）
 */
export const searchVideos = async ({
  query,
  maxResults = MAX_RESULTS,
  videoDuration = duration.medium,
  order = searchOrder.viewCount,
  publishedAfter = dayjs().startOf("week"),
}: {
  query: string;
  maxResults?: number;
  videoDuration?: Duration;
  order?: SearchOrder;
  publishedAfter?: Dayjs;
}): Promise<SearchVideosResult> => {
  const result = await youtube.search.list({
    part: ["snippet"],
    q: query,
    type: ["video"],
    maxResults,
    order,
    videoDuration,
    publishedAfter: publishedAfter?.toISOString(),
  });
  return {
    items: result.data.items ?? [],
    totalResults: result.data.pageInfo?.totalResults ?? 0,
  };
};

/** チャンネルIDからアップロードプレイリストIDを導出（UC... → UU...） */
const getUploadsPlaylistId = ({ channelId }: { channelId: string }): string =>
  channelId.replace(/^UC/, "UU");

/** チャンネルの動画一覧を取得（1クォータ消費） */
export const getChannelVideos = async ({
  channelId,
  maxResults = MAX_RESULTS,
}: {
  channelId: string;
  maxResults?: number;
}): Promise<PlaylistItem[]> => {
  const result = await youtube.playlistItems.list({
    part: ["snippet", "contentDetails"],
    playlistId: getUploadsPlaylistId({ channelId }),
    maxResults,
  });
  return result.data.items ?? [];
};
