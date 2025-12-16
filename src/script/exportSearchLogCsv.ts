import "dotenv/config";
import "../config/dayjs";
import fs from "fs";
import path from "path";
import dayjs from "dayjs";
import { searchLog } from "../db/repository";
import { dateObjectToDateString } from "../lib/date-string";

// ============================
// 設定
// ============================
const DAYS_AGO = 7;
const OUTPUT_DIR = "./output"; // 出力先ディレクトリ

const main = async () => {
  const after = dayjs().subtract(DAYS_AGO, "day");
  const logs = await searchLog.getAfter(after);

  // CSVヘッダー（日本語）
  const headers = [
    "動画取得数",
    "総動画ヒット数",
    "ユニークチャンネル数",
    "新規チャンネル数",
    "検索ワード",
    "動画長さ条件",
    "並び順条件",
    "公開日フィルタ条件",
    "作成日時",
  ];

  // CSVデータ行
  const rows = logs.map((log) => [
    log.hitVideoCount,
    log.hitTotalVideoCount,
    log.uniqueChannelCount,
    log.newChannelCount,
    `"${log.keyword}"`,
    log.videoDuration ?? "",
    log.order ?? "",
    log.publishedAfter ?? "",
    log.createdAt,
  ]);

  // CSV文字列を生成
  const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

  // 出力ディレクトリを作成
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // ファイル出力
  const fileName = `search_log_${DAYS_AGO}days_${dateObjectToDateString(dayjs())}.csv`;
  const filePath = path.join(OUTPUT_DIR, fileName);
  fs.writeFileSync(filePath, csvContent, "utf-8");

  console.log(`✅ CSV出力完了: ${filePath} (直近${DAYS_AGO}日間, ${logs.length}件)`);
};

main().catch(console.error);
