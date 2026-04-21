import "dotenv/config";
import { google } from "googleapis";
import { chunk } from "lodash";
import pMap from "p-map";
import * as fs from "fs";
import * as path from "path";

const RIVAL_SPREADSHEET_ID = "1cJ5Enyy-yiyx3YKM1uwVUZz5LKqsnRvaaaAHUayIs-8";
const SHEET_NAME = "ライバル分析";
const MY_CHANNEL_HANDLE = "fukuoka-idobatakaigi";
const PENDING_PATH = path.resolve("rival-pending.json");

const RIVAL_CHANNELS: { handle: string; name: string; channelId?: string }[] = [
  { handle: "okinawa-timez", name: "沖縄まる見えタイムズ" },
  { handle: "hokkaido_tankentai", name: "北海道まるごと探検隊" },
  { handle: "Kyusyu-Chiri", name: "九州地理なるほど探検隊", channelId: "UCJX8obb7qolUqeAlxzshXFw" },
  { handle: "ちばゆるジオさんぽ", name: "ちばゆるジオさんぽ" },
  { handle: "愛知地理ゆっくり解説", name: "愛知地理ゆっくり解説" },
  { handle: "saitama_chiri", name: "埼玉地理" },
];

const youtube = google.youtube({
  version: "v3",
  auth: process.env.YOUTUBE_API_KEY,
});

type RivalVideo = {
  videoId: string;
  channelName: string;
  title: string;
  publishedAt: string;
  thumbnailUrl: string;
  viewCount: number;
};

type ExistingEntry = {
  jibungotoka: number;
  shatei: number;
  kakuseido: number;
  memo: string;
};

type PendingFile = {
  generatedAt: string;
  myChannelTitles: string[];
  allRivalVideos: RivalVideo[];
  existingEvaluations: Record<string, ExistingEntry>;
  newEvaluations: Record<
    string,
    { alreadyCovered: boolean; jibungotoka: number; shatei: number; kakuseido: number }
  >;
};

const getSheetsClient = () => {
  const credentialsPath = path.join(process.cwd(), "credentials.json");
  let credentials: { client_email: string; private_key: string };
  if (fs.existsSync(credentialsPath)) {
    credentials = JSON.parse(fs.readFileSync(credentialsPath, "utf-8"));
  } else {
    credentials = {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "",
      private_key: (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    };
  }
  const auth = new google.auth.JWT(credentials.client_email, undefined, credentials.private_key, [
    "https://www.googleapis.com/auth/spreadsheets.readonly",
  ]);
  return google.sheets({ version: "v4", auth });
};

const resolveChannelId = async (handle: string): Promise<string | null> => {
  try {
    const res = await (youtube.channels.list as any)({
      part: ["id"],
      forHandle: handle,
    });
    return res.data?.items?.[0]?.id ?? null;
  } catch (e) {
    console.warn(`チャンネル解決失敗: ${handle}`, e instanceof Error ? e.message : e);
    return null;
  }
};

const getAllChannelVideos = async (
  channelId: string,
): Promise<{ videoId: string; title: string; publishedAt: string; thumbnailUrl: string }[]> => {
  const playlistId = channelId.replace(/^UC/, "UU");
  const items: { videoId: string; title: string; publishedAt: string; thumbnailUrl: string }[] = [];
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
        items.push({ videoId, title, publishedAt: publishedAt ?? "", thumbnailUrl });
      }
    }
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);
  return items;
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

const readExistingEvaluations = async (
  sheets: ReturnType<typeof getSheetsClient>,
): Promise<Record<string, ExistingEntry>> => {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: RIVAL_SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:K`,
  });
  const rows = res.data.values ?? [];
  const map: Record<string, ExistingEntry> = {};
  // 列順: 0=チャンネル 1=タイトル 2=再生回数 3=自分事化 4=射程 5=覚醒度 6=合計 7=投稿日 8=サムネ 9=URL 10=メモ
  for (const row of rows.slice(1)) {
    const url = row[9];
    if (!url) continue;
    const j = parseInt(String(row[3] ?? ""), 10);
    const s = parseInt(String(row[4] ?? ""), 10);
    const k = parseInt(String(row[5] ?? ""), 10);
    if (!j || !s || !k) continue;
    map[String(url)] = {
      jibungotoka: j,
      shatei: s,
      kakuseido: k,
      memo: String(row[10] ?? ""),
    };
  }
  return map;
};

const main = async () => {
  console.log("📺 自チャンネル動画取得...");
  const myChannelId = await resolveChannelId(MY_CHANNEL_HANDLE);
  if (!myChannelId) throw new Error(`自チャンネル解決失敗: ${MY_CHANNEL_HANDLE}`);
  const myVideos = await getAllChannelVideos(myChannelId);
  console.log(`  動画数: ${myVideos.length}`);

  console.log("\n📺 ライバルチャンネル動画取得...");
  const rivalRaw: Omit<RivalVideo, "viewCount">[] = [];
  for (const ch of RIVAL_CHANNELS) {
    const channelId = ch.channelId ?? (await resolveChannelId(ch.handle));
    if (!channelId) {
      console.warn(`  ⚠️ スキップ: ${ch.name}`);
      continue;
    }
    const videos = await getAllChannelVideos(channelId);
    console.log(`  ${ch.name}: ${videos.length}件`);
    for (const v of videos) rivalRaw.push({ ...v, channelName: ch.name });
  }

  console.log(`\n📊 再生回数取得... (${rivalRaw.length}件)`);
  const viewCounts = await getViewCounts(rivalRaw.map((v) => v.videoId));
  const allRivalVideos: RivalVideo[] = rivalRaw.map((v) => ({
    ...v,
    viewCount: viewCounts.get(v.videoId) ?? 0,
  }));

  console.log("\n📖 既存評価読み込み...");
  const sheets = getSheetsClient();
  const existingEvaluations = await readExistingEvaluations(sheets);
  console.log(`  キャッシュ: ${Object.keys(existingEvaluations).length}件`);

  const pendingVideos = allRivalVideos.filter(
    (v) => !existingEvaluations[`https://www.youtube.com/watch?v=${v.videoId}`],
  );
  console.log(`\n🆕 新規評価対象: ${pendingVideos.length}件`);

  const output: PendingFile = {
    generatedAt: new Date().toISOString(),
    myChannelTitles: myVideos.map((v) => v.title),
    allRivalVideos,
    existingEvaluations,
    newEvaluations: {},
  };

  fs.writeFileSync(PENDING_PATH, JSON.stringify(output, null, 2));
  console.log(`\n✅ 出力: ${PENDING_PATH}`);
  console.log(
    `   次: 新規${pendingVideos.length}件を評価して newEvaluations に埋め、yarn rival:apply`,
  );
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
