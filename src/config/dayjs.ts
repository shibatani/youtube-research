import "dayjs/locale/ja";

import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import duration from "dayjs/plugin/duration";
import isBetween from "dayjs/plugin/isBetween";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import quarterOfYear from "dayjs/plugin/quarterOfYear";
import timezone from "dayjs/plugin/timezone";
import updateLocale from "dayjs/plugin/updateLocale";
import utc from "dayjs/plugin/utc";

dayjs.extend(isBetween);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);
dayjs.extend(customParseFormat);
dayjs.extend(quarterOfYear);
dayjs.extend(updateLocale);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(duration);

dayjs.locale("ja");

dayjs.updateLocale("ja", {
  weekStart: 1,
});
