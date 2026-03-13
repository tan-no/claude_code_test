/**
 * cart.ts のユニットテスト
 *
 * cart.ts は coupon.ts に依存するため、両モジュールを同時にリセット・再ロードする。
 *
 * [BUG P1] マークのテストは現在 FAIL する（P1 優先度の不具合）。
 * [BUG P3] マークのテストは現在 FAIL する（P3 優先度の不具合）。
 */

import type * as CartModule from "../src/cart";
import type * as CouponModule from "../src/coupon";

let addToCart: typeof CartModule.addToCart;
let removeFromCart: typeof CartModule.removeFromCart;
let clearCart: typeof CartModule.clearCart;
let calcTotal: typeof CartModule.calcTotal;
let applyCoupon: typeof CartModule.applyCoupon;
let itemCount: typeof CartModule.itemCount;
let registerCoupon: typeof CouponModule.registerCoupon;

// coupon → cart の順でロードし、cart.ts 内部でも同じキャッシュが使われるようにする
beforeEach(() => {
  jest.resetModules();
  const couponMod = require("../src/coupon") as typeof CouponModule;
  const cartMod = require("../src/cart") as typeof CartModule;
  addToCart = cartMod.addToCart;
  removeFromCart = cartMod.removeFromCart;
  clearCart = cartMod.clearCart;
  calcTotal = cartMod.calcTotal;
  applyCoupon = cartMod.applyCoupon;
  itemCount = cartMod.itemCount;
  registerCoupon = couponMod.registerCoupon;
});

// ─── addToCart ───────────────────────────────────────────────────
describe("addToCart", () => {
  test("正常: 新規ユーザーのカートに商品を追加できる", () => {
    const product = { id: 1, name: "Laptop", price: 120000, stock: 5 };
    const cart = addToCart(1, product, 1);
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].product.id).toBe(1);
    expect(cart.items[0].quantity).toBe(1);
  });

  test("正常: 同じ商品を追加すると数量が加算される", () => {
    const product = { id: 1, name: "Laptop", price: 120000, stock: 5 };
    addToCart(1, product, 2);
    const cart = addToCart(1, product, 3);
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].quantity).toBe(5);
  });

  test("正常: 異なる商品はそれぞれ別アイテムになる", () => {
    const p1 = { id: 1, name: "Laptop", price: 120000, stock: 5 };
    const p2 = { id: 2, name: "Mouse", price: 3000, stock: 10 };
    addToCart(1, p1, 1);
    const cart = addToCart(1, p2, 1);
    expect(cart.items).toHaveLength(2);
  });

  test("正常: 異なるユーザーはカートが独立している", () => {
    const product = { id: 1, name: "Laptop", price: 120000, stock: 5 };
    addToCart(1, product, 1);
    const cart2 = addToCart(2, product, 2);
    expect(cart2.items[0].quantity).toBe(2);
  });

  // [BUG P3] 在庫を超える数量を追加できてしまう
  test("[BUG P3] 在庫を超える数量はエラーになること", () => {
    const product = { id: 1, name: "Laptop", price: 120000, stock: 2 };
    // 現状: 在庫チェックなしで通過してしまう → このテストは FAIL する
    expect(() => addToCart(1, product, 3)).toThrow();
  });

  // [BUG P1] 負の数量を渡してもエラーにならない
  test("[BUG P1] 負の数量はエラーになること", () => {
    const product = { id: 1, name: "Laptop", price: 120000, stock: 5 };
    // 現状: エラーにならず quantity が -1 になる → このテストは FAIL する
    expect(() => addToCart(1, product, -1)).toThrow();
  });

  // [BUG P1] 数量 0 もバリデーションされない
  test("[BUG P1] 数量 0 はエラーになること", () => {
    const product = { id: 1, name: "Laptop", price: 120000, stock: 5 };
    // 現状: エラーにならずカートに 0 個が追加される → このテストは FAIL する
    expect(() => addToCart(1, product, 0)).toThrow();
  });

  // [BUG P3] 累積数量が在庫を超えてもエラーにならない
  test("[BUG P3] 加算後の数量が在庫を超えるとエラーになること", () => {
    const product = { id: 1, name: "Laptop", price: 120000, stock: 3 };
    addToCart(1, product, 2); // 合計 2（OK）
    // 現状: チェックなしで合計 4 になる → このテストは FAIL する
    expect(() => addToCart(1, product, 2)).toThrow();
  });
});

// ─── calcTotal ───────────────────────────────────────────────────
describe("calcTotal", () => {
  test("正常: クーポンなしの合計金額を返す", () => {
    const product = { id: 1, name: "Item", price: 1000, stock: 5 };
    const cart = addToCart(1, product, 3);
    expect(calcTotal(cart)).toBe(3000);
  });

  test("正常: 複数商品の合計", () => {
    const p1 = { id: 1, name: "A", price: 1000, stock: 5 };
    const p2 = { id: 2, name: "B", price: 500, stock: 5 };
    addToCart(1, p1, 2);
    const cart = addToCart(1, p2, 1);
    expect(calcTotal(cart)).toBe(2500);
  });

  test("正常: 空カートは 0", () => {
    const cart: CartModule.Cart = { userId: 1, items: [] };
    expect(calcTotal(cart)).toBe(0);
  });

  test("正常: 10% 割引クーポン適用後の合計", () => {
    const product = { id: 1, name: "Item", price: 1000, stock: 5 };
    const cart = addToCart(1, product, 1);
    registerCoupon("DISC10", 10);
    applyCoupon(1, "DISC10");
    expect(calcTotal(cart)).toBe(900);
  });

  test("正常: 100% 割引クーポン（全額無料）", () => {
    const product = { id: 1, name: "Item", price: 1000, stock: 5 };
    const cart = addToCart(1, product, 1);
    registerCoupon("FREE", 100);
    applyCoupon(1, "FREE");
    expect(calcTotal(cart)).toBe(0);
  });

  test("正常: 0% 割引クーポン（割引なし）は合計が変わらない", () => {
    const product = { id: 1, name: "Item", price: 1000, stock: 5 };
    const cart = addToCart(1, product, 1);
    registerCoupon("ZERO", 0);
    applyCoupon(1, "ZERO");
    expect(calcTotal(cart)).toBe(1000);
  });

  // [BUG P1] 割引計算で浮動小数点誤差が発生する
  // 例: 100円の商品に 33% 割引 → 100 * 0.67 = 67.0 (OK) だが、
  //     300円の商品に 10% 割引 → 300 * 0.9 = 270 (OK) でも、
  //     特定のケースで小数点以下の誤差が残る
  test("[BUG P1] 割引後の合計が小数点誤差を含まないこと（丸め処理）", () => {
    // 1円の商品を 3 個、33% 引き → 3 * (1 - 33/100) = 2.01
    // 実際には浮動小数点で 2.0099999999999998 になる場合がある
    const product = { id: 1, name: "Item", price: 1, stock: 10 };
    const cart = addToCart(1, product, 3);
    registerCoupon("DISC33", 33);
    applyCoupon(1, "DISC33");
    const total = calcTotal(cart);
    // 現状: Math.round 等がなく誤差が混入する → このテストは FAIL する
    expect(total).toBe(Math.round(total * 100) / 100);
  });
});

// ─── applyCoupon ─────────────────────────────────────────────────
describe("applyCoupon", () => {
  test("正常: クーポンをカートに適用できる", () => {
    const product = { id: 1, name: "Item", price: 1000, stock: 5 };
    const cart = addToCart(1, product, 1);
    registerCoupon("DISC10", 10);
    applyCoupon(1, "DISC10");
    expect(cart.appliedCoupon?.code).toBe("DISC10");
  });

  test("異常: カートが存在しない場合はエラー", () => {
    registerCoupon("DISC10", 10);
    expect(() => applyCoupon(999, "DISC10")).toThrow("カートが存在しません");
  });

  test("異常: 存在しないクーポンコードはエラー", () => {
    addToCart(1, { id: 1, name: "Item", price: 1000, stock: 5 }, 1);
    expect(() => applyCoupon(1, "INVALID")).toThrow("存在しません");
  });

  test("異常: 使用済みクーポンの再利用はエラー", () => {
    addToCart(1, { id: 1, name: "Item", price: 1000, stock: 5 }, 1);
    registerCoupon("ONCE", 10);
    applyCoupon(1, "ONCE");
    expect(() => applyCoupon(1, "ONCE")).toThrow("使用済み");
  });

  test("正常: 別ユーザーは同じクーポンを独立して使用できる", () => {
    addToCart(1, { id: 1, name: "Item", price: 1000, stock: 5 }, 1);
    addToCart(2, { id: 1, name: "Item", price: 1000, stock: 5 }, 1);
    registerCoupon("SHARED", 10);
    expect(() => {
      applyCoupon(1, "SHARED");
      applyCoupon(2, "SHARED");
    }).not.toThrow();
  });

  // [BUG P3] 空カート（items が空）にクーポンを適用できてしまう
  test("[BUG P3] 空カートへのクーポン適用はエラーになること", () => {
    const product = { id: 1, name: "Item", price: 1000, stock: 5 };
    const cart = addToCart(1, product, 1);
    removeFromCart(1, product.id); // 全削除して空カートにする
    registerCoupon("EMPTY", 10);
    // 現状: 空カートでも適用できてしまう → このテストは FAIL する
    expect(() => applyCoupon(1, "EMPTY")).toThrow();
  });

  // [BUG P3] 既にクーポン適用済みのカートに別クーポンを上書きできる
  test("[BUG P3] すでにクーポン適用済みのカートに別クーポンを重ねがけできないこと", () => {
    addToCart(1, { id: 1, name: "Item", price: 1000, stock: 5 }, 1);
    registerCoupon("FIRST", 10);
    registerCoupon("SECOND", 20);
    applyCoupon(1, "FIRST");
    // 現状: SECOND で上書きされてしまう → このテストは FAIL する
    expect(() => applyCoupon(1, "SECOND")).toThrow();
  });
});

// ─── removeFromCart ──────────────────────────────────────────────
describe("removeFromCart", () => {
  test("正常: 指定商品をカートから削除できる", () => {
    const product = { id: 1, name: "Item", price: 1000, stock: 5 };
    const cart = addToCart(1, product, 2);
    removeFromCart(1, 1);
    expect(cart.items).toHaveLength(0);
  });

  test("正常: 複数商品から 1 件だけ削除できる", () => {
    const p1 = { id: 1, name: "A", price: 1000, stock: 5 };
    const p2 = { id: 2, name: "B", price: 500, stock: 5 };
    addToCart(1, p1, 1);
    const cart = addToCart(1, p2, 1);
    removeFromCart(1, 1);
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].product.id).toBe(2);
  });

  test("カートが存在しない場合はエラーを投げない", () => {
    expect(() => removeFromCart(999, 1)).not.toThrow();
  });

  test("存在しない商品 ID を削除しても他のアイテムは残る", () => {
    const product = { id: 1, name: "Item", price: 1000, stock: 5 };
    const cart = addToCart(1, product, 1);
    removeFromCart(1, 999);
    expect(cart.items).toHaveLength(1);
  });
});

// ─── clearCart ───────────────────────────────────────────────────
describe("clearCart", () => {
  test("正常: カートを削除できる", () => {
    addToCart(1, { id: 1, name: "Item", price: 1000, stock: 5 }, 1);
    clearCart(1);
    // clearCart 後はカートが存在しないため applyCoupon でエラーになる
    registerCoupon("X", 10);
    expect(() => applyCoupon(1, "X")).toThrow("カートが存在しません");
  });

  test("存在しないユーザーに clearCart してもエラーにならない", () => {
    expect(() => clearCart(999)).not.toThrow();
  });
});

// ─── itemCount ───────────────────────────────────────────────────
describe("itemCount", () => {
  test("正常: 複数アイテムの合計数量を返す", () => {
    const p1 = { id: 1, name: "A", price: 100, stock: 10 };
    const p2 = { id: 2, name: "B", price: 200, stock: 10 };
    addToCart(1, p1, 3);
    const cart = addToCart(1, p2, 2);
    expect(itemCount(cart)).toBe(5);
  });

  test("空カートは 0 を返す", () => {
    const cart: CartModule.Cart = { userId: 1, items: [] };
    expect(itemCount(cart)).toBe(0);
  });

  test("1 種類 1 個は 1 を返す", () => {
    const product = { id: 1, name: "Item", price: 100, stock: 5 };
    const cart = addToCart(1, product, 1);
    expect(itemCount(cart)).toBe(1);
  });
});
