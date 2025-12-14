export enum TimeFormatTypeEnum {
  Decimal = "decimal",
  Sexagesimal = "sexagesimal",
}

const formatSexagesimal = (duration: plugin.Duration) => {
  const hours = Math.floor(duration.asMinutes() / 60);
  const roundedMinutes = Math.round(duration.asMinutes() % 60);
  return `${String(hours).padStart(2, "0")}:${String(roundedMinutes).padStart(2, "0")}`;
};

const formatDecimal = (duration: plugin.Duration) => {
  const hoursDecimal = duration.asMinutes() / 60;
  return hoursDecimal.toFixed(2);
};

// NOTE: dayjs の duration は 24 時間以上の時間を扱えないため、自前でフォーマットする
export const formatDuration = ({
  duration,
  formatType = TimeFormatTypeEnum.Sexagesimal,
}: {
  duration: plugin.Duration;
  formatType?: string;
}) => {
  switch (formatType) {
    case TimeFormatTypeEnum.Sexagesimal:
      return formatSexagesimal(duration);
    case TimeFormatTypeEnum.Decimal:
      return formatDecimal(duration);
    default:
      throw new Error(`Unsupported format type: ${formatType}`);
  }
};

export const DEFAULT_WORK_DURATION = "00:00:00";
