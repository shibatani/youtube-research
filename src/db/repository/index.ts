import * as channelRepo from "./channel";
import * as subscriberCountRepo from "./dailyChannelSubscriberCount";
import * as videoCountRepo from "./dailyChannelMonthlyVideoCount";
import * as viewCountRepo from "./dailyChannelMonthlyViewCount";

export const channel = channelRepo;
export const subscriberCount = subscriberCountRepo;
export const videoCount = videoCountRepo;
export const viewCount = viewCountRepo;
