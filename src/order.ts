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

/** 許可するステータス遷移テーブル */
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["paid", "cancelled"],
  paid: ["shipped", "cancelled"],
  shipped: [],
  cancelled: [],
};

/**
 * カートの内容から注文を作成する。
 * 注文作成時に各商品の在庫をデクリメントし、
 * 価格変更の影響を受けないようにproductはディープコピーで保持する。
 * 注文作成後、対象ユーザーのカートは削除される。
 */
export function createOrder(userId: number, cart: Cart): Order {
  if (cart.items.length === 0) throw new Error("カートが空です");
  const user = getUserById(userId);
  if (!user) throw new Error(`ユーザーID ${userId} が見つかりません`);

  // 在庫デクリメント + productをディープコピーして注文時点の価格・状態を固定する
  const items = cart.items.map((item) => {
    item.product.stock -= item.quantity;
    return {
      product: { ...item.product },
      quantity: item.quantity,
    };
  });

  const order: Order = {
    id: nextOrderId++,
    userId: user.id,
    items,
    total: calcTotal(cart),
    status: "pending",
    createdAt: new Date(),
  };

  orders.push(order);
  clearCart(userId);
  return order;
}

/**
 * 注文のステータスを更新する。
 * VALID_TRANSITIONS に基づき、不正な遷移はエラーをスローする。
 */
export function updateStatus(orderId: number, status: OrderStatus): Order {
  const order = orders.find((o) => o.id === orderId);
  if (!order) throw new Error(`注文ID ${orderId} が見つかりません`);

  const allowed = VALID_TRANSITIONS[order.status];
  if (!allowed.includes(status)) {
    throw new Error(
      `ステータスを "${order.status}" から "${status}" に変更できません`
    );
  }

  order.status = status;
  return order;
}

/**
 * ユーザーの注文履歴を取得する（作成日時の降順）。
 */
export function getOrdersByUser(userId: number): Order[] {
  return orders
    .filter((o) => o.userId === userId)
    .sort(
      (a, b) =>
        b.createdAt.getTime() - a.createdAt.getTime() || b.id - a.id
    );
}

/**
 * 注文の合計金額を items の現在の内容から再計算して更新する。
 * 各アイテムの price * quantity を合計し、小数点2桁に丸めて返す。
 */
export function recalcTotal(orderId: number): number {
  const order = orders.find((o) => o.id === orderId);
  if (!order) throw new Error(`注文ID ${orderId} が見つかりません`);

  const raw = order.items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const total = Math.round(raw * 100) / 100;
  order.total = total;
  return total;
}

/**
 * 注文をキャンセルする。
 * shipped 済みの注文はキャンセルできない。
 * 注文が存在しない場合は何もしない。
 */
export function cancelOrder(orderId: number): void {
  const order = orders.find((o) => o.id === orderId);
  if (!order) return;

  if (order.status === "shipped") {
    throw new Error("出荷済みの注文はキャンセルできません");
  }

  order.status = "cancelled";
}
