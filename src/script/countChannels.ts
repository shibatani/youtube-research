import "dotenv/config";
import "../config/dayjs";
import { db } from "../db";
import { channel } from "../db/schema";
import { eq, sql } from "drizzle-orm";

const main = async () => {
  const active = await db.select({ count: sql<number>`count(*)` }).from(channel).where(eq(channel.isActive, true));
  const inactive = await db.select({ count: sql<number>`count(*)` }).from(channel).where(eq(channel.isActive, false));
  console.log(`アクティブ: ${active[0].count}件`);
  console.log(`非アクティブ: ${inactive[0].count}件`);
};

main().catch(console.error);
