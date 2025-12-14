import { customType } from "drizzle-orm/sqlite-core";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import type { DateString } from "../../lib/date-string";

/**
 * Dayjs型のtimestampカラム
 * DBにはinteger(Unix timestamp)で保存し、取得時はDayjsに変換
 */
export const dayjsTimestamp = customType<{ data: Dayjs; driverData: number }>({
  dataType() {
    return "integer";
  },
  fromDriver(value: number): Dayjs {
    return dayjs(value);
  },
  toDriver(value: Dayjs): number {
    return value.valueOf();
  },
});

/**
 * DateString ブランド型カラム (YYYY-MM-DD 形式)
 */
export const dateString = customType<{ data: DateString; driverData: string }>({
  dataType() {
    return "text";
  },
  fromDriver(value: string): DateString {
    return value as DateString;
  },
  toDriver(value: DateString): string {
    return value;
  },
});
