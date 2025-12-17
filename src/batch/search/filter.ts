import { type Channel as YouTubeChannel } from "../../infra/youtube";
import { EXCLUDE_KEYWORDS } from "./const";

// ============================
// フィルター条件
// ============================
const MIN_SUBSCRIBERS = 100;
const MIN_VIDEOS = 5;
const MIN_TOTAL_VIEWS = 10000;
const MIN_AVG_VIEWS_PER_VIDEO = 1000;

const containsExcludeKeyword = (text: string | null | undefined): boolean =>
  EXCLUDE_KEYWORDS.some((keyword) => text?.includes(keyword) ?? false);

export const filterChannels = (channels: YouTubeChannel[]): YouTubeChannel[] =>
  channels.filter(({ snippet, statistics }) => {
    if (containsExcludeKeyword(snippet?.title) || containsExcludeKeyword(snippet?.description)) {
      return false;
    }

    const subscriberCount = Number(statistics?.subscriberCount ?? 0);
    const videoCount = Number(statistics?.videoCount ?? 0);
    const viewCount = Number(statistics?.viewCount ?? 0);
    const avgViewsPerVideo = videoCount > 0 ? viewCount / videoCount : 0;

    return (
      subscriberCount >= MIN_SUBSCRIBERS &&
      videoCount >= MIN_VIDEOS &&
      viewCount >= MIN_TOTAL_VIEWS &&
      avgViewsPerVideo >= MIN_AVG_VIEWS_PER_VIDEO
    );
  });
