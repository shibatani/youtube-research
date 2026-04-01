/**
 * 動画単体ベースの拡散率パワー関数
 *
 * youtube-research の 2,456チャンネル（アクティブ&登録者500以上）の実データから、
 * 規模別の「1動画あたりの拡散率」の中央値を算出し、最小二乗法でフィッティング。
 * R² = 0.9849
 *
 * rate = 59.99 × subscribers ^ (-0.4738)
 */
const A = 59.99;
const B = -0.4738;

/**
 * 登録者数に応じた動画単体ベースの基準拡散率を計算
 */
export const getVideoBaseSpreadRate = (subscribers: number): number => {
  const x = Math.max(subscribers, 100);
  return Math.max(A * Math.pow(x, B), 0.01);
};

/**
 * 拡散率を計算（再生数 ÷ 登録者数）
 */
export const getSpreadRate = (viewCount: number, subscriberCount: number): number => {
  if (subscriberCount === 0) return 0;
  return viewCount / subscriberCount;
};

/**
 * 拡散比率(%)を計算（拡散率 ÷ ベース拡散率 × 100）
 */
export const getSpreadRatio = (spreadRate: number, baseSpreadRate: number): number => {
  if (baseSpreadRate === 0) return 0;
  return (spreadRate / baseSpreadRate) * 100;
};
