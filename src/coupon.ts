export interface Coupon {
  code: string;
  discountRate: number; // 0〜100 (%)
}

const coupons: Map<string, Coupon> = new Map();
const usedCoupons: Map<number, Set<string>> = new Map(); // userId -> 使用済みクーポンコード

/**
 * 新しいクーポンを登録する。
 * @param code - クーポンコード
 * @param discountRate - 割引率（0〜100 の整数、単位は %）
 * @returns 登録されたクーポンオブジェクト
 * @throws `discountRate` が 0〜100 の範囲外の場合
 */
export function registerCoupon(code: string, discountRate: number): Coupon {
  if (isNaN(discountRate) || discountRate < 0 || discountRate > 100) {
    throw new Error("discountRate は 0〜100 の範囲で指定してください");
  }
  if (coupons.has(code)) {
    throw new Error(`クーポンコード "${code}" は既に登録されています`);
  }
  const coupon: Coupon = { code, discountRate };
  coupons.set(code, coupon);
  return coupon;
}

/**
 * クーポンコードに対応するクーポンを取得する。
 * @param code - 検索するクーポンコード
 * @returns クーポンオブジェクト、存在しない場合は `undefined`
 */
export function getCoupon(code: string): Coupon | undefined {
  return coupons.get(code);
}

/**
 * 指定ユーザーが対象クーポンを既に使用済みかどうかを確認する。
 * @param userId - 確認するユーザーID
 * @param code - 確認するクーポンコード
 * @returns 使用済みの場合 `true`、未使用の場合 `false`
 */
export function hasUsedCoupon(userId: number, code: string): boolean {
  return usedCoupons.get(userId)?.has(code) ?? false;
}

/**
 * 指定ユーザーのクーポンを使用済みとしてマークする。
 * @param userId - 対象のユーザーID
 * @param code - 使用済みにするクーポンコード
 */
export function markCouponUsed(userId: number, code: string): void {
  if (!usedCoupons.has(userId)) {
    usedCoupons.set(userId, new Set());
  }
  usedCoupons.get(userId)!.add(code);
}
