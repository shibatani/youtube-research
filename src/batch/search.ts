import "dotenv/config";
import { type ChannelInsertInput } from "../db/schema";
import { channel } from "../db/repository";
import { searchVideos, getChannels } from "../infra/youtube";
import { buildChannelUrl } from "../lib/youtube";
import { notifySlack } from "../infra/slack";
import { isNotNullish } from "../lib/type-guard";
import { difference, sample } from "lodash";

/** 固定キーワードリスト */
const SEARCH_KEYWORDS = [
  // 音声合成系
  "ゆっくり解説",
  "ボイスロイド 解説",
  "ずんだもん 解説",
  "AI 音声 解説",
  // まとめ・反応系
  "2chまとめ",
  "5chまとめ",
  "海外の反応",
  "海外掲示板",
  "コメント欄の反応",
  "反応集",
  // 日本賞賛・感動系
  "日本 海外の反応",
  "日本 感動",
  "日本 賞賛",
  "スカッとする話",
  "感動する話",
  "いい話",
  // ホラー・怪談系
  "怪談朗読",
  "都市伝説",
  "未解決事件",
  "作業用怪談",
  // 知識・解説系
  "雑学 解説",
  "歴史ミステリー",
  "世界の闇",
  // 作業用・ながら聴き系
  "作業用 解説",
  "ラジオ風 解説",
  "ながら聴き 解説",
  // AI系
  "AI 解説",
  "ChatGPT 解説",
];

/** 登録完了メッセージを生成 */
const buildSuccessMessage = (channels: { name: string; channelId: string }[]): string =>
  [
    `✅ ${channels.length}件のチャンネルを登録しました`,
    ...channels.map(({ name, channelId }) => `• ${name}\n  ${buildChannelUrl(channelId)}`),
  ].join("\n");

const main = async () => {
  const keyword = sample(SEARCH_KEYWORDS)!;
  console.log(`🔍 検索キーワード: ${keyword}`);

  // 1. YouTube search.list でキーワード検索
  const searchResults = await searchVideos({
    query: keyword,
  });
  console.log(`検索結果: ${searchResults.length}件`);

  // 2. 結果からチャンネルID抽出（重複除去）
  const channelIds = [
    ...new Set(
      searchResults.map(({ snippet }) => snippet?.channelId).filter((id) => isNotNullish(id)),
    ),
  ];

  // 3. 既にDBにあるチャンネルは除外
  const existingChannels = await channel.getByChannelIds(channelIds);
  const newChannelIds = difference(
    channelIds,
    existingChannels.map(({ channelId }) => channelId),
  );
  console.log(`新規チャンネル数: ${newChannelIds.length}件`);

  if (newChannelIds.length === 0) {
    console.log("✅ 新規チャンネルなし。探索を終了します。");
    return;
  }

  // 4. チャンネル情報取得（channels.list）
  const channelDataList = await getChannels({ channelIds: newChannelIds });

  // 5. DBに保存（channelテーブルにINSERT）
  const newChannels: ChannelInsertInput[] = channelDataList.map(({ id, snippet }) => ({
    channelId: id!,
    name: snippet?.title ?? "不明",
    thumbnailUrl: snippet?.thumbnails?.default?.url ?? null,
  }));

  if (newChannels.length > 0) {
    await channel.bulkInsert(newChannels);

    const message = buildSuccessMessage(newChannels);
    console.log(message);
    await notifySlack(`[search] ${message}`);
  }
};

main().catch(async (error) => {
  console.error(error);
  const errorMessage = error instanceof Error ? error.message : String(error);
  await notifySlack(`[search] エラー発生\n\`\`\`${errorMessage}\`\`\``);
});
