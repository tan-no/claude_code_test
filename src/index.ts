import { createUser, getUserById, searchByName } from "./user";
import { addToCart, calcTotal, removeFromCart } from "./cart";
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

console.log("\n=== 注文作成 ===");
const order = createOrder(alice.id, cart);
console.log(order);

console.log("\n=== ステータス更新 ===");
updateStatus(order.id, "paid");
console.log(getOrdersByUser(alice.id));
