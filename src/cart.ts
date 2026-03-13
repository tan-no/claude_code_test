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

// カートにアイテムを追加する
export function addToCart(userId: number, product: Product, quantity: number): Cart {
  // バグ①: 在庫チェックがない（stockを無視して追加できてしまう）
  if (!carts.has(userId)) {
    carts.set(userId, { userId, items: [] });
  }

  const cart = carts.get(userId)!;
  const existing = cart.items.find((i) => i.product.id === product.id);

  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.items.push({ product, quantity });
  }

  return cart;
}

// カートの合計金額を計算する（クーポンが適用されている場合は割引後の金額を返す）
export function calcTotal(cart: Cart): number {
  // バグ②: 小数点の丸め処理がないため、0.1 + 0.2 のような浮動小数点誤差が発生する
  const subtotal = cart.items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  if (cart.appliedCoupon) {
    return subtotal * (1 - cart.appliedCoupon.discountRate / 100);
  }
  return subtotal;
}

// クーポンをカートに適用する
export function applyCoupon(userId: number, code: string): void {
  const cart = carts.get(userId);
  if (!cart) throw new Error("カートが存在しません");

  const coupon = getCoupon(code);
  if (!coupon) throw new Error(`クーポンコード "${code}" は存在しません`);

  if (hasUsedCoupon(userId, code)) {
    throw new Error(`クーポン "${code}" はすでに使用済みです`);
  }

  cart.appliedCoupon = coupon;
  markCouponUsed(userId, code);
}

// カートからアイテムを削除する
export function removeFromCart(userId: number, productId: number): void {
  const cart = carts.get(userId);
  if (!cart) return;
  // バグ③: filter の結果を代入していないので削除が反映されない
  cart.items.filter((i) => i.product.id !== productId);
}

// カートを空にする
export function clearCart(userId: number): void {
  carts.delete(userId);
}

// カートのアイテム数を返す
export function itemCount(cart: Cart): number {
  return cart.items.reduce((sum, item) => sum + item.quantity, 0);
}
