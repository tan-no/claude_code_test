import { createUser, getUserById, searchByName } from "./user";
import { addToCart, calcTotal, removeFromCart, applyCoupon } from "./cart";
import { registerCoupon } from "./coupon";
import { createOrder, updateStatus, getOrdersByUser } from "./order";

// 動作確認用のサンプルスクリプト
const alice = createUser("Alice", "alice@example.com", "editor");
const bob   = createUser("Bob",   "bob@example.com",   "viewer");

console.log("=== ユーザー作成 ===");
console.log(alice);
console.log(bob);

const laptop: import("./cart").Product = { id: 1, name: "Laptop",  price: 120000, stock: 5 };
const mouse:  import("./cart").Product = { id: 2, name: "Mouse",   price:   3000, stock: 10 };

console.log("\n=== カート操作 ===");
const cart = addToCart(alice.id, laptop, 1);
addToCart(alice.id, mouse, 2);
console.log("合計:", calcTotal(cart));

console.log("\n=== クーポン適用 ===");
registerCoupon("SAVE10", 10); // 10%割引
applyCoupon(alice.id, "SAVE10");
console.log("割引後合計:", calcTotal(cart));
try {
  applyCoupon(alice.id, "SAVE10"); // 2回目は失敗する
} catch (e) {
  console.log("エラー:", (e as Error).message);
}

console.log("\n=== 注文作成 ===");
const order = createOrder(alice.id, cart);
console.log(order);

console.log("\n=== ステータス更新 ===");
updateStatus(order.id, "paid");
console.log(getOrdersByUser(alice.id));

// デバッグ検証用
console.log("\n=== 存在しないユーザー ===");
const ghost = getUserById(999);
console.log("ghost:", ghost); // undefined

console.log("\n=== 空カートでの注文 ===");
const emptyCart = { userId: 1, items: [] };
try {
  createOrder(1, emptyCart);
} catch (e) {
  console.log("エラー:", (e as Error).message);
}