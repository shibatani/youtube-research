import "dotenv/config";
import { google } from "googleapis";
import * as fs from "fs";
import * as path from "path";

const RIVAL_SPREADSHEET_ID = "1cJ5Enyy-yiyx3YKM1uwVUZz5LKqsnRvaaaAHUayIs-8";
const SHEET_NAME = "ライバル分析";
const PENDING_PATH = path.resolve("rival-pending.json");

const HEADER = [
  "チャンネル",
  "タイトル",
  "再生回数",
  "自分事化",
  "射程",
  "覚醒度",
  "合計",
  "投稿日",
  "サムネURL",
  "動画URL",
  "メモ",
];

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

type NewEvaluation = {
  alreadyCovered: boolean;
  jibungotoka: number;
  shatei: number;
  kakuseido: number;
};

type PendingFile = {
  generatedAt: string;
  myChannelTitles: string[];
  allRivalVideos: RivalVideo[];
  existingEvaluations: Record<string, ExistingEntry>;
  newEvaluations: Record<string, NewEvaluation>;
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
    "https://www.googleapis.com/auth/spreadsheets",
  ]);
  return google.sheets({ version: "v4", auth });
};

const main = async () => {
  if (!fs.existsSync(PENDING_PATH)) {
    console.error(`❌ ${PENDING_PATH} が存在しません。先に yarn rival:fetch を実行`);
    process.exit(1);
  }

  const pending: PendingFile = JSON.parse(fs.readFileSync(PENDING_PATH, "utf-8"));
  console.log(`📖 ${PENDING_PATH} 読み込み`);
  console.log(`  allRivalVideos: ${pending.allRivalVideos.length}`);
  console.log(`  existingEvaluations: ${Object.keys(pending.existingEvaluations).length}`);
  console.log(`  newEvaluations: ${Object.keys(pending.newEvaluations).length}`);

  // 新規評価対象のうち未評価がないか検査
  const pendingUnfilled = pending.allRivalVideos.filter((v) => {
    const url = `https://www.youtube.com/watch?v=${v.videoId}`;
    return !pending.existingEvaluations[url] && !pending.newEvaluations[v.videoId];
  });
  if (pendingUnfilled.length > 0) {
    console.warn(`\n⚠️ 未評価: ${pendingUnfilled.length}件`);
    for (const v of pendingUnfilled.slice(0, 5)) {
      console.warn(`  - ${v.videoId}: ${v.title}`);
    }
    if (pendingUnfilled.length > 5) console.warn(`  ... 他 ${pendingUnfilled.length - 5}件`);
    console.warn(`  (スキップして継続。必要ならキャンセルして newEvaluations を埋め直す)`);
  }

  console.log("\n📝 行構築...");
  const rows: (string | number)[][] = [];
  let skipCoveredCount = 0;
  for (const v of pending.allRivalVideos) {
    const url = `https://www.youtube.com/watch?v=${v.videoId}`;
    const cached = pending.existingEvaluations[url];
    const fresh = pending.newEvaluations[v.videoId];

    let j: number, s: number, k: number, memo: string;
    if (cached) {
      j = cached.jibungotoka;
      s = cached.shatei;
      k = cached.kakuseido;
      memo = cached.memo;
    } else if (fresh) {
      if (fresh.alreadyCovered) {
        skipCoveredCount++;
        continue;
      }
      j = fresh.jibungotoka;
      s = fresh.shatei;
      k = fresh.kakuseido;
      memo = "";
    } else {
      continue; // 未評価の動画は除外
    }

    rows.push([
      v.channelName,
      v.title,
      v.viewCount,
      j,
      s,
      k,
      j + s + k,
      v.publishedAt.slice(0, 10),
      v.thumbnailUrl,
      url,
      memo,
    ]);
  }

  // 合計スコア降順 → 再生回数降順
  rows.sort((a, b) => {
    const totalDiff = (b[6] as number) - (a[6] as number);
    if (totalDiff !== 0) return totalDiff;
    return (b[2] as number) - (a[2] as number);
  });

  console.log(`  書き込み対象: ${rows.length}件 (既カバーでスキップ: ${skipCoveredCount}件)`);

  console.log("\n✏️ スプシ書き込み...");
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.clear({
    spreadsheetId: RIVAL_SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:Z`,
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId: RIVAL_SPREADSHEET_ID,
    range: `${SHEET_NAME}!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [HEADER, ...rows],
    },
  });

  console.log(`\n✅ 完了: ${rows.length}件をスプシに反映`);
  console.log(
    `   https://docs.google.com/spreadsheets/d/${RIVAL_SPREADSHEET_ID}/edit?gid=570691507`,
  );
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
