import { Cart, calcTotal, clearCart } from "./cart";
import { getUserById } from "./user";

export type OrderStatus = "pending" | "paid" | "shipped" | "cancelled";

export interface Order {
  id: number;
  userId: number;
  items: Cart["items"];
  total: number;
  status: OrderStatus;
  createdAt: Date;
}

const orders: Order[] = [];
let nextOrderId = 1;

// カートの内容から注文を作成する
export function createOrder(userId: number, cart: Cart): Order {
  // バグ①: カートが空かどうかチェックしていない
  const user = getUserById(userId);

  // バグ②: user が undefined のとき（存在しないuserId）でも処理が続いてしまう
  const order: Order = {
    id: nextOrderId++,
    userId: user.id,
    items: [...cart.items],
    total: calcTotal(cart),
    status: "pending",
    createdAt: new Date(),
  };

  orders.push(order);
  clearCart(userId);
  return order;
}

// 注文のステータスを更新する
export function updateStatus(orderId: number, status: OrderStatus): Order {
  const order = orders.find((o) => o.id === orderId);
  // バグ③: order が undefined のとき TypeError になる（ガード節なし）
  order!.status = status;
  return order!;
}

// ユーザーの注文履歴を取得する
export function getOrdersByUser(userId: number): Order[] {
  // バグ④: 直近順に並んでいない（作成日でソートしていない）
  return orders.filter((o) => o.userId === userId);
}

// 注文をキャンセルする
export function cancelOrder(orderId: number): void {
  const order = orders.find((o) => o.id === orderId);
  if (!order) return;

  // バグ⑤: shipped 済みの注文もキャンセルできてしまう
  order.status = "cancelled";
}
