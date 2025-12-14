import dayjs from "dayjs";

export type DateString = string & { readonly _brand: unique symbol };

export const dateObjectToDateString = (day: dayjs.Dayjs, options?: { withoutHyphen?: boolean }) =>
  day.tz("Asia/Tokyo").format(options?.withoutHyphen ? "YYYYMMDD" : "YYYY-MM-DD") as DateString;

export const dateStringToDateObject = (dateString: DateString) =>
  dayjs.tz(dateString, "Asia/Tokyo");

const assertDateString: (date: unknown) => asserts date is DateString = (date) => {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Invalid DateString format: Expected YYYY-MM-DD");
  }

  const parts = date.split("-");
  if (parts.length !== 3) {
    throw new Error("Invalid DateString format: Incorrect number of parts");
  }

  const yearPart = parts[0];
  const monthPart = parts[1];
  const dayPart = parts[2];
  if (yearPart === undefined || monthPart === undefined || dayPart === undefined) {
    throw new Error("DateString parts cannot be undefined");
  }

  const year = Number.parseInt(yearPart, 10);
  const month = Number.parseInt(monthPart, 10) - 1;
  const day = Number.parseInt(dayPart, 10);
  const testDate = new Date(year, month, day);
  if (
    testDate.getFullYear() !== year ||
    testDate.getMonth() !== month ||
    testDate.getDate() !== day
  ) {
    throw new Error("Invalid DateString value: Date does not exist");
  }
};

export const getDateStringWithAssertion = (date: unknown): DateString => {
  assertDateString(date);

  return date;
};
