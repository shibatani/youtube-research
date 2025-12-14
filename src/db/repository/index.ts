import * as channelRepo from "./channel";
import * as subscriberCountRepo from "./dailyChannelSubscriberCount";
import * as videoCountRepo from "./dailyChannelMonthlyVideoCount";
import * as viewCountRepo from "./dailyChannelMonthlyViewCount";
import * as searchLogRepo from "./searchLog";

export const channel = channelRepo;
export const subscriberCount = subscriberCountRepo;
export const videoCount = videoCountRepo;
export const viewCount = viewCountRepo;
export const searchLog = searchLogRepo;
