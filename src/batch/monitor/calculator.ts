// 基準となる2点
const SPREAD_RATE_POINT1 = { subscribers: 5000, rate: 7.5 };
const SPREAD_RATE_POINT2 = { subscribers: 100000, rate: 1.75 };

// べき乗関数の係数を計算
const b =
  Math.log(SPREAD_RATE_POINT1.rate / SPREAD_RATE_POINT2.rate) /
  Math.log(SPREAD_RATE_POINT1.subscribers / SPREAD_RATE_POINT2.subscribers);
const a = SPREAD_RATE_POINT1.rate / Math.pow(SPREAD_RATE_POINT1.subscribers, b);

/**
 * 登録者数に応じた基準拡散率を計算
 */
export const getBaseSpreadRate = (subscribers: number): number => {
  const x = Math.max(subscribers, 100);
  const rate = a * Math.pow(x, b);
  return Math.max(rate, 1.0);
};
