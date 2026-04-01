import "dotenv/config";
import "../config/dayjs";
import fs from "fs";
import path from "path";
import dayjs from "dayjs";
import { db } from "../db";
import { channel } from "../db/schema";
import { eq } from "drizzle-orm";
import { dateObjectToDateString } from "../lib/date-string";

// ============================
// 設定
// ============================
const OUTPUT_DIR = "./output";

const main = async () => {
  const inactiveChannels = await db.select().from(channel).where(eq(channel.isActive, false));

  // CSVヘッダー
  const headers = ["チャンネル名", "チャンネルID", "説明文", "作成日時"];

  // CSVデータ行（説明文の改行・カンマ・ダブルクォートをエスケープ）
  const escapeForCsv = (str: string): string => `"${str.replace(/"/g, '""').replace(/\n/g, " ")}"`;

  const rows = inactiveChannels.map((ch) => [
    escapeForCsv(ch.name),
    ch.channelId,
    escapeForCsv(ch.description || " "), // 空の場合はスペースを入れて行の高さを確保
    ch.createdAt,
  ]);

  // CSV文字列を生成
  const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

  // 出力ディレクトリを作成
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // ファイル出力
  const fileName = `inactive_channels_${dateObjectToDateString(dayjs())}.csv`;
  const filePath = path.join(OUTPUT_DIR, fileName);
  fs.writeFileSync(filePath, csvContent, "utf-8");

  console.log(`CSV出力完了: ${filePath} (${inactiveChannels.length}件)`);
};

main().catch(console.error);
