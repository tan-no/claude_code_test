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

// カートの合計金額を計算する
export function calcTotal(cart: Cart): number {
  // バグ②: 小数点の丸め処理がないため、0.1 + 0.2 のような浮動小数点誤差が発生する
  return cart.items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
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
