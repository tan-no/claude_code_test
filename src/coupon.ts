export interface Coupon {
  code: string;
  discountRate: number; // 0〜100 (%)
}

const coupons: Map<string, Coupon> = new Map();
const usedCoupons: Map<number, Set<string>> = new Map(); // userId -> 使用済みクーポンコード

export function registerCoupon(code: string, discountRate: number): Coupon {
  if (discountRate < 0 || discountRate > 100) {
    throw new Error("discountRate は 0〜100 の範囲で指定してください");
  }
  const coupon: Coupon = { code, discountRate };
  coupons.set(code, coupon);
  return coupon;
}

export function getCoupon(code: string): Coupon | undefined {
  return coupons.get(code);
}

export function hasUsedCoupon(userId: number, code: string): boolean {
  return usedCoupons.get(userId)?.has(code) ?? false;
}

export function markCouponUsed(userId: number, code: string): void {
  if (!usedCoupons.has(userId)) {
    usedCoupons.set(userId, new Set());
  }
  usedCoupons.get(userId)!.add(code);
}
