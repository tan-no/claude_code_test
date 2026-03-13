/**
 * coupon.ts のユニットテスト
 *
 * 各テストは jest.resetModules() でモジュールをリセットし、
 * モジュールレベルの Map がテスト間で干渉しないようにしている。
 *
 * [BUG P2] マークのテストは現在 FAIL する（既知の不具合）。
 */

import type * as CouponModule from "../src/coupon";

let registerCoupon: typeof CouponModule.registerCoupon;
let getCoupon: typeof CouponModule.getCoupon;
let hasUsedCoupon: typeof CouponModule.hasUsedCoupon;
let markCouponUsed: typeof CouponModule.markCouponUsed;

beforeEach(() => {
  jest.resetModules();
  const mod = require("../src/coupon") as typeof CouponModule;
  registerCoupon = mod.registerCoupon;
  getCoupon = mod.getCoupon;
  hasUsedCoupon = mod.hasUsedCoupon;
  markCouponUsed = mod.markCouponUsed;
});

// ─── registerCoupon ──────────────────────────────────────────────
describe("registerCoupon", () => {
  test("正常: クーポンを登録して返す", () => {
    const coupon = registerCoupon("SAVE10", 10);
    expect(coupon.code).toBe("SAVE10");
    expect(coupon.discountRate).toBe(10);
  });

  test("境界値: discountRate=0（割引なし）は登録できる", () => {
    const coupon = registerCoupon("ZERO", 0);
    expect(coupon.discountRate).toBe(0);
  });

  test("境界値: discountRate=100（全額無料）は登録できる", () => {
    const coupon = registerCoupon("FULL", 100);
    expect(coupon.discountRate).toBe(100);
  });

  test("異常: discountRate=-1 はエラー", () => {
    expect(() => registerCoupon("NEG", -1)).toThrow();
  });

  test("異常: discountRate=101 はエラー", () => {
    expect(() => registerCoupon("OVER", 101)).toThrow();
  });

  test("異常: discountRate=NaN はエラー", () => {
    // NaN < 0 は false、NaN > 100 も false なので現状はすり抜ける可能性がある
    // 期待値: エラーを投げるべき
    expect(() => registerCoupon("NAN", NaN)).toThrow();
  });

  // [BUG P2] 同一コードで再登録すると既存クーポンを無言で上書きする
  test("[BUG P2] 同一コードで再登録するとエラーになること", () => {
    registerCoupon("DUP", 10);
    // 現状: 上書きされて成功してしまう → このテストは FAIL する
    expect(() => registerCoupon("DUP", 50)).toThrow();
  });
});

// ─── getCoupon ───────────────────────────────────────────────────
describe("getCoupon", () => {
  test("正常: 登録済みコードでクーポンを取得できる", () => {
    registerCoupon("GET10", 10);
    const coupon = getCoupon("GET10");
    expect(coupon).toBeDefined();
    expect(coupon?.discountRate).toBe(10);
  });

  test("未登録コードは undefined を返す", () => {
    expect(getCoupon("NONE")).toBeUndefined();
  });

  test("空文字は undefined を返す", () => {
    expect(getCoupon("")).toBeUndefined();
  });
});

// ─── hasUsedCoupon ───────────────────────────────────────────────
describe("hasUsedCoupon", () => {
  test("未使用は false を返す", () => {
    expect(hasUsedCoupon(1, "CODE")).toBe(false);
  });

  test("markCouponUsed 後は true を返す", () => {
    markCouponUsed(1, "CODE");
    expect(hasUsedCoupon(1, "CODE")).toBe(true);
  });

  test("別ユーザーは影響を受けない", () => {
    markCouponUsed(1, "CODE");
    expect(hasUsedCoupon(2, "CODE")).toBe(false);
  });

  test("同一ユーザーでも別コードは false", () => {
    markCouponUsed(1, "CODE_A");
    expect(hasUsedCoupon(1, "CODE_B")).toBe(false);
  });
});

// ─── markCouponUsed ──────────────────────────────────────────────
describe("markCouponUsed", () => {
  test("同一コードを複数回 mark しても例外にならない", () => {
    expect(() => {
      markCouponUsed(1, "CODE");
      markCouponUsed(1, "CODE");
    }).not.toThrow();
    expect(hasUsedCoupon(1, "CODE")).toBe(true);
  });

  test("複数コードを独立して管理できる", () => {
    markCouponUsed(1, "A");
    markCouponUsed(1, "B");
    expect(hasUsedCoupon(1, "A")).toBe(true);
    expect(hasUsedCoupon(1, "B")).toBe(true);
    expect(hasUsedCoupon(1, "C")).toBe(false);
  });
});
