/**
 * order.ts のユニットテスト
 *
 * order.ts は cart.ts / user.ts に依存するため、
 * beforeEach で全モジュールをリセット・再ロードする。
 * ロード順: coupon → user → cart → order
 * （こうすることで order.ts が内部で require する cart/user が
 *   テストコードと同じキャッシュインスタンスを参照する）
 *
 * [BUG P1] マークのテストは現在 FAIL する（P1 優先度の不具合）。
 * [BUG P3] マークのテストは現在 FAIL する（P3 優先度の不具合）。
 */

import type * as UserModule from "../src/user";
import type * as CartModule from "../src/cart";
import type * as CouponModule from "../src/coupon";
import type * as OrderModule from "../src/order";

let createUser: typeof UserModule.createUser;
let addToCart: typeof CartModule.addToCart;
let applyCoupon: typeof CartModule.applyCoupon;
let registerCoupon: typeof CouponModule.registerCoupon;
let createOrder: typeof OrderModule.createOrder;
let updateStatus: typeof OrderModule.updateStatus;
let getOrdersByUser: typeof OrderModule.getOrdersByUser;
let cancelOrder: typeof OrderModule.cancelOrder;

/** テストごとにモジュール全体をリセットして独立した状態を確保する */
beforeEach(() => {
  jest.resetModules();
  // 依存の末端から順にロード（キャッシュを共有させる）
  const couponMod = require("../src/coupon") as typeof CouponModule;
  const userMod = require("../src/user") as typeof UserModule;
  const cartMod = require("../src/cart") as typeof CartModule;
  const orderMod = require("../src/order") as typeof OrderModule;

  registerCoupon = couponMod.registerCoupon;
  createUser = userMod.createUser;
  addToCart = cartMod.addToCart;
  applyCoupon = cartMod.applyCoupon;
  createOrder = orderMod.createOrder;
  updateStatus = orderMod.updateStatus;
  getOrdersByUser = orderMod.getOrdersByUser;
  cancelOrder = orderMod.cancelOrder;
});

// ─── createOrder ─────────────────────────────────────────────────
describe("createOrder", () => {
  test("正常: カートから注文を作成できる", () => {
    const user = createUser("Alice", "alice@example.com", "viewer");
    const cart = addToCart(user.id, { id: 1, name: "Item", price: 1000, stock: 5 }, 2);
    const order = createOrder(user.id, cart);

    expect(order.id).toBe(1);
    expect(order.userId).toBe(user.id);
    expect(order.total).toBe(2000);
    expect(order.status).toBe("pending");
    expect(order.createdAt).toBeInstanceOf(Date);
  });

  test("正常: 注文 ID が連番で採番される", () => {
    const user = createUser("Alice", "alice@example.com", "viewer");
    const cart1 = addToCart(user.id, { id: 1, name: "A", price: 500, stock: 5 }, 1);
    const order1 = createOrder(user.id, cart1);

    const cart2 = addToCart(user.id, { id: 2, name: "B", price: 500, stock: 5 }, 1);
    const order2 = createOrder(user.id, cart2);

    expect(order2.id).toBe(order1.id + 1);
  });

  test("正常: 注文作成後にカートが空になる（clearCart が呼ばれる）", () => {
    const user = createUser("Alice", "alice@example.com", "viewer");
    const cart = addToCart(user.id, { id: 1, name: "Item", price: 1000, stock: 5 }, 1);
    createOrder(user.id, cart);
    // カートが削除されているので再度 addToCart すると新規カートになる
    const newCart = addToCart(user.id, { id: 2, name: "NewItem", price: 500, stock: 5 }, 1);
    expect(newCart.items).toHaveLength(1);
    expect(newCart.items[0].product.id).toBe(2);
  });

  test("正常: クーポン適用後の割引額が total に反映される", () => {
    const user = createUser("Alice", "alice@example.com", "viewer");
    const cart = addToCart(user.id, { id: 1, name: "Item", price: 1000, stock: 5 }, 1);
    registerCoupon("DISC10", 10);
    applyCoupon(user.id, "DISC10");
    const order = createOrder(user.id, cart);
    expect(order.total).toBe(900);
  });

  test("正常: 注文の items はカートのコピーを保持する", () => {
    const user = createUser("Alice", "alice@example.com", "viewer");
    const cart = addToCart(user.id, { id: 1, name: "Item", price: 1000, stock: 5 }, 2);
    const order = createOrder(user.id, cart);
    expect(order.items).toHaveLength(1);
    expect(order.items[0].quantity).toBe(2);
  });

  test("異常: 空カートは注文できない", () => {
    const user = createUser("Alice", "alice@example.com", "viewer");
    const emptyCart: CartModule.Cart = { userId: user.id, items: [] };
    expect(() => createOrder(user.id, emptyCart)).toThrow("カートが空");
  });

  test("異常: 存在しないユーザー ID はエラー", () => {
    const cart: CartModule.Cart = {
      userId: 999,
      items: [{ product: { id: 1, name: "Item", price: 1000, stock: 5 }, quantity: 1 }],
    };
    expect(() => createOrder(999, cart)).toThrow("見つかりません");
  });

  // [BUG P3] 注文後に商品の在庫が減少しない
  test("[BUG P3] 注文後に商品の stock が減少すること", () => {
    const user = createUser("Alice", "alice@example.com", "viewer");
    const product = { id: 1, name: "Item", price: 1000, stock: 5 };
    const cart = addToCart(user.id, product, 2);
    createOrder(user.id, cart);
    // 現状: stock は変わらない → このテストは FAIL する
    expect(product.stock).toBe(3); // 5 - 2
  });

  // [BUG P1] items は shallow copy のため、注文後に product.price を変更すると
  //          order.items[].product.price も変わってしまう
  test("[BUG P1] 注文後に商品価格を変更しても注文明細の価格は変わらないこと", () => {
    const user = createUser("Alice", "alice@example.com", "viewer");
    const product = { id: 1, name: "Item", price: 1000, stock: 5 };
    const cart = addToCart(user.id, product, 1);
    const order = createOrder(user.id, cart);

    product.price = 9999; // 注文後に価格を変更

    // 現状: 参照を共有しているため order.items[0].product.price も変わる
    // → このテストは FAIL する
    expect(order.items[0].product.price).toBe(1000);
  });
});

// ─── updateStatus ────────────────────────────────────────────────
describe("updateStatus", () => {
  test("正常: ステータスを更新できる", () => {
    const user = createUser("Alice", "alice@example.com", "viewer");
    const cart = addToCart(user.id, { id: 1, name: "Item", price: 1000, stock: 5 }, 1);
    const order = createOrder(user.id, cart);

    const updated = updateStatus(order.id, "paid");
    expect(updated.status).toBe("paid");
  });

  test("正常: pending → paid → shipped の順に更新できる", () => {
    const user = createUser("Alice", "alice@example.com", "viewer");
    const cart = addToCart(user.id, { id: 1, name: "Item", price: 1000, stock: 5 }, 1);
    const order = createOrder(user.id, cart);

    updateStatus(order.id, "paid");
    updateStatus(order.id, "shipped");
    expect(order.status).toBe("shipped");
  });

  test("異常: 存在しない注文 ID はエラー", () => {
    expect(() => updateStatus(999, "paid")).toThrow("見つかりません");
  });

  // [BUG P3] ステータスの後退遷移（paid → pending 等）も許可されてしまう
  test("[BUG P3] shipped → paid などの後退遷移はエラーになること", () => {
    const user = createUser("Alice", "alice@example.com", "viewer");
    const cart = addToCart(user.id, { id: 1, name: "Item", price: 1000, stock: 5 }, 1);
    const order = createOrder(user.id, cart);

    updateStatus(order.id, "paid");
    updateStatus(order.id, "shipped");

    // 現状: shipped → paid への後退が通ってしまう → このテストは FAIL する
    expect(() => updateStatus(order.id, "paid")).toThrow();
  });

  // [BUG P3] cancelled 後の再オープンも防げない
  test("[BUG P3] cancelled 注文を shipped に更新できないこと", () => {
    const user = createUser("Alice", "alice@example.com", "viewer");
    const cart = addToCart(user.id, { id: 1, name: "Item", price: 1000, stock: 5 }, 1);
    const order = createOrder(user.id, cart);
    updateStatus(order.id, "cancelled");

    // 現状: キャンセル後も別ステータスへ遷移できる → このテストは FAIL する
    expect(() => updateStatus(order.id, "shipped")).toThrow();
  });
});

// ─── getOrdersByUser ─────────────────────────────────────────────
describe("getOrdersByUser", () => {
  test("正常: そのユーザーの注文のみ返す", () => {
    const alice = createUser("Alice", "alice@example.com", "viewer");
    const bob = createUser("Bob", "bob@example.com", "viewer");

    const cartA = addToCart(alice.id, { id: 1, name: "Item", price: 1000, stock: 10 }, 1);
    createOrder(alice.id, cartA);

    const cartB = addToCart(bob.id, { id: 1, name: "Item", price: 1000, stock: 10 }, 1);
    createOrder(bob.id, cartB);

    const aliceOrders = getOrdersByUser(alice.id);
    expect(aliceOrders).toHaveLength(1);
    expect(aliceOrders[0].userId).toBe(alice.id);
  });

  test("注文が 0 件のユーザーは空配列を返す", () => {
    const user = createUser("Alice", "alice@example.com", "viewer");
    expect(getOrdersByUser(user.id)).toHaveLength(0);
  });

  test("複数注文を全件返す", () => {
    const user = createUser("Alice", "alice@example.com", "viewer");
    const cart1 = addToCart(user.id, { id: 1, name: "A", price: 500, stock: 5 }, 1);
    createOrder(user.id, cart1);
    const cart2 = addToCart(user.id, { id: 2, name: "B", price: 500, stock: 5 }, 1);
    createOrder(user.id, cart2);
    expect(getOrdersByUser(user.id)).toHaveLength(2);
  });

  // [BUG P3] 注文が作成日時の降順にならない（ソートされない）
  test("[BUG P3] 注文履歴が作成日の新しい順（降順）で返ること", () => {
    const user = createUser("Alice", "alice@example.com", "viewer");
    const cart1 = addToCart(user.id, { id: 1, name: "A", price: 500, stock: 5 }, 1);
    const order1 = createOrder(user.id, cart1);
    const cart2 = addToCart(user.id, { id: 2, name: "B", price: 500, stock: 5 }, 1);
    const order2 = createOrder(user.id, cart2);

    const orders = getOrdersByUser(user.id);
    // 現状: ソートなしで追加順（昇順）に返る → このテストは FAIL する
    expect(orders[0].id).toBe(order2.id); // 新しい方が先頭
    expect(orders[1].id).toBe(order1.id);
  });
});

// ─── cancelOrder ─────────────────────────────────────────────────
describe("cancelOrder", () => {
  test("正常: pending 注文をキャンセルできる", () => {
    const user = createUser("Alice", "alice@example.com", "viewer");
    const cart = addToCart(user.id, { id: 1, name: "Item", price: 1000, stock: 5 }, 1);
    const order = createOrder(user.id, cart);

    cancelOrder(order.id);
    expect(order.status).toBe("cancelled");
  });

  test("正常: paid 注文をキャンセルできる", () => {
    const user = createUser("Alice", "alice@example.com", "viewer");
    const cart = addToCart(user.id, { id: 1, name: "Item", price: 1000, stock: 5 }, 1);
    const order = createOrder(user.id, cart);
    updateStatus(order.id, "paid");

    cancelOrder(order.id);
    expect(order.status).toBe("cancelled");
  });

  test("存在しない注文 ID はエラーにならない（静かに無視）", () => {
    expect(() => cancelOrder(999)).not.toThrow();
  });

  // [BUG P3] shipped 済み注文もキャンセルできてしまう
  test("[BUG P3] shipped 済み注文はキャンセルできないこと", () => {
    const user = createUser("Alice", "alice@example.com", "viewer");
    const cart = addToCart(user.id, { id: 1, name: "Item", price: 1000, stock: 5 }, 1);
    const order = createOrder(user.id, cart);
    updateStatus(order.id, "paid");     // pending → paid
    updateStatus(order.id, "shipped");  // paid → shipped

    // 現状: shipped でもキャンセルが通ってしまう → このテストは FAIL する
    expect(() => cancelOrder(order.id)).toThrow();
  });

  // [BUG P3] 既に cancelled の注文を再度 cancelOrder しても何も起きない（冪等性は OK だが意図確認用）
  test("cancelled 済みの注文を再度キャンセルしても status は cancelled のまま", () => {
    const user = createUser("Alice", "alice@example.com", "viewer");
    const cart = addToCart(user.id, { id: 1, name: "Item", price: 1000, stock: 5 }, 1);
    const order = createOrder(user.id, cart);
    cancelOrder(order.id);
    cancelOrder(order.id); // 2 回目
    expect(order.status).toBe("cancelled");
  });
});
