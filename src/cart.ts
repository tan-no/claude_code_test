import { Coupon, getCoupon, hasUsedCoupon, markCouponUsed } from "./coupon";

export interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Cart {
  userId: number;
  items: CartItem[];
  appliedCoupon?: Coupon;
}

const carts: Map<number, Cart> = new Map();

/**
 * カートにアイテムを追加する。
 * 既に同じ商品が存在する場合は数量を加算する。
 * @param userId - カートの所有ユーザーID
 * @param product - 追加する商品
 * @param quantity - 追加する数量
 * @returns 更新後のカートオブジェクト
 */
export function addToCart(userId: number, product: Product, quantity: number): Cart {
  if (quantity <= 0) {
    throw new Error("数量は1以上で指定してください");
  }

  if (!carts.has(userId)) {
    carts.set(userId, { userId, items: [] });
  }

  const cart = carts.get(userId)!;
  const existing = cart.items.find((i) => i.product.id === product.id);

  const existingQty = existing ? existing.quantity : 0;
  if (existingQty + quantity > product.stock) {
    throw new Error(`在庫が不足しています（在庫: ${product.stock}）`);
  }

  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.items.push({ product, quantity });
  }

  return cart;
}

/**
 * カートの合計金額を計算する。
 * クーポンが適用されている場合は割引後の金額を返す。
 * @param cart - 合計を計算するカートオブジェクト
 * @returns 合計金額（クーポン割引適用後）
 */
export function calcTotal(cart: Cart): number {
  const subtotal = cart.items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  if (cart.appliedCoupon) {
    const discounted = subtotal * (1 - cart.appliedCoupon.discountRate / 100);
    return Math.round(discounted * 100) / 100;
  }
  return subtotal;
}

/**
 * クーポンをカートに適用する。
 * カートが存在しない場合、クーポンが無効な場合、または既に使用済みの場合はエラーをスローする。
 * @param userId - カートの所有ユーザーID
 * @param code - 適用するクーポンコード
 * @throws カートが存在しない場合
 * @throws クーポンコードが無効な場合
 * @throws クーポンが既に使用済みの場合
 */
export function applyCoupon(userId: number, code: string): void {
  const cart = carts.get(userId);
  if (!cart) throw new Error("カートが存在しません");
  if (cart.items.length === 0) throw new Error("カートが空のためクーポンを適用できません");

  const coupon = getCoupon(code);
  if (!coupon) throw new Error(`クーポンコード "${code}" は存在しません`);

  if (hasUsedCoupon(userId, code)) {
    throw new Error(`クーポン "${code}" はすでに使用済みです`);
  }

  if (cart.appliedCoupon) throw new Error("すでにクーポンが適用されています");

  cart.appliedCoupon = coupon;
  markCouponUsed(userId, code);
}

/**
 * カートから指定の商品を削除する。
 * @param userId - カートの所有ユーザーID
 * @param productId - 削除する商品のID
 */
export function removeFromCart(userId: number, productId: number): void {
  const cart = carts.get(userId);
  if (!cart) return;
  cart.items = cart.items.filter((i) => i.product.id !== productId);
}

/**
 * カートを空にする（カートごと削除する）。
 * @param userId - カートを削除するユーザーID
 */
export function clearCart(userId: number): void {
  carts.delete(userId);
}

/**
 * カート内の合計アイテム数を返す。
 * @param cart - 対象のカートオブジェクト
 * @returns 全アイテムの数量の合計
 */
export function itemCount(cart: Cart): number {
  return cart.items.reduce((sum, item) => sum + item.quantity, 0);
}
