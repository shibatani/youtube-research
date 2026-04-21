import "dotenv/config";
import { google } from "googleapis";
import { chunk } from "lodash";
import pMap from "p-map";
import * as XLSX from "xlsx";
import * as path from "path";

const youtube = google.youtube({
  version: "v3",
  auth: process.env.YOUTUBE_API_KEY,
});

const RIVAL_CHANNELS: { handle: string; name: string; channelId?: string }[] = [
  { handle: "okinawa-timez", name: "沖縄まる見えタイムズ" },
  { handle: "hokkaido_tankentai", name: "北海道まるごと探検隊" },
  { handle: "Kyusyu-Chiri", name: "九州地理なるほど探検隊", channelId: "UCJX8obb7qolUqeAlxzshXFw" },
  { handle: "ちばゆるジオさんぽ", name: "ちばゆるジオさんぽ" },
  { handle: "愛知地理ゆっくり解説", name: "愛知地理ゆっくり解説" },
  { handle: "saitama_chiri", name: "埼玉地理" },
];

const resolveChannelId = async (handle: string): Promise<string | null> => {
  try {
    const res = await (youtube.channels.list as any)({
      part: ["id", "snippet"],
      forHandle: handle,
    });
    return res.data?.items?.[0]?.id ?? null;
  } catch (e) {
    console.warn(`チャンネル解決失敗: ${handle}`, e instanceof Error ? e.message : e);
    return null;
  }
};

const getAllChannelVideos = async (channelId: string) => {
  const playlistId = channelId.replace(/^UC/, "UU");
  const allItems: { videoId: string; title: string; publishedAt: string; thumbnailUrl: string }[] =
    [];
  let pageToken: string | undefined;

  do {
    const res = await youtube.playlistItems.list({
      part: ["snippet", "contentDetails"],
      playlistId,
      maxResults: 50,
      pageToken,
    });
    for (const item of res.data.items ?? []) {
      const videoId = item.contentDetails?.videoId;
      const title = item.snippet?.title;
      const publishedAt = item.snippet?.publishedAt;
      const thumbnailUrl =
        item.snippet?.thumbnails?.high?.url ?? item.snippet?.thumbnails?.default?.url ?? "";
      if (videoId && title && title !== "Private video" && title !== "Deleted video") {
        allItems.push({ videoId, title, publishedAt: publishedAt ?? "", thumbnailUrl });
      }
    }
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);

  return allItems;
};

const getViewCounts = async (videoIds: string[]): Promise<Map<string, number>> => {
  const batches = chunk(videoIds, 50);
  const map = new Map<string, number>();
  const results = await pMap(
    batches,
    (batch) => youtube.videos.list({ part: ["statistics"], id: batch }),
    { concurrency: 5 },
  );
  for (const { data } of results) {
    for (const item of data.items ?? []) {
      if (item.id) {
        map.set(item.id, parseInt(item.statistics?.viewCount ?? "0", 10));
      }
    }
  }
  return map;
};

const main = async () => {
  const rows: Record<string, unknown>[] = [];

  for (const ch of RIVAL_CHANNELS) {
    console.log(`\n📺 ${ch.name} (${ch.handle})`);

    const channelId = ch.channelId ?? (await resolveChannelId(ch.handle));
    if (!channelId) {
      console.warn(`  ⚠️ スキップ`);
      continue;
    }
    console.log(`  ID: ${channelId}`);

    const videos = await getAllChannelVideos(channelId);
    console.log(`  動画数: ${videos.length}`);
    if (videos.length === 0) continue;

    const viewCounts = await getViewCounts(videos.map((v) => v.videoId));

    for (const v of videos) {
      rows.push({
        チャンネル: ch.name,
        タイトル: v.title,
        再生回数: viewCounts.get(v.videoId) ?? 0,
        投稿日: v.publishedAt.slice(0, 10),
        サムネURL: v.thumbnailUrl,
        動画URL: `https://www.youtube.com/watch?v=${v.videoId}`,
        自分事化: "",
        射程: "",
        覚醒度: "",
        合計: "",
        メモ: "",
      });
    }
  }

  // 再生回数降順でソート
  rows.sort((a, b) => (b["再生回数"] as number) - (a["再生回数"] as number));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);

  // 列幅設定
  ws["!cols"] = [
    { wch: 25 }, // チャンネル
    { wch: 50 }, // タイトル
    { wch: 12 }, // 再生回数
    { wch: 12 }, // 投稿日
    { wch: 50 }, // サムネURL
    { wch: 45 }, // 動画URL
    { wch: 8 }, // 自分事化
    { wch: 8 }, // 射程
    { wch: 8 }, // 覚醒度
    { wch: 8 }, // 合計
    { wch: 30 }, // メモ
  ];

  XLSX.utils.book_append_sheet(wb, ws, "ライバル分析");

  const outPath = path.resolve("rival-analysis.xlsx");
  XLSX.writeFile(wb, outPath);

  console.log(`\n✅ 完了: ${rows.length}件`);
  console.log(`📄 出力: ${outPath}`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
