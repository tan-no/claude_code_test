import express, { Request, Response } from "express";
import path from "path";
import fs from "fs";
import * as userMod from "./user";
import * as cartMod from "./cart";
import * as couponMod from "./coupon";
import * as orderMod from "./order";

const app = express();
app.use(express.json({ limit: "20mb" }));
app.use(express.static(path.join(__dirname, "../public")));

// ── 商品マスタ（サーバー内インメモリ） ──────────────────────────
let nextProductId = 1;
const products: cartMod.Product[] = [];

function addProduct(name: string, price: number, stock: number): cartMod.Product {
  const p: cartMod.Product = { id: nextProductId++, name, price, stock };
  products.push(p);
  return p;
}

// 初期データ
addProduct("ノートPC", 120000, 5);
addProduct("ワイヤレスマウス", 3500, 20);
addProduct("USBハブ", 2800, 15);
addProduct("モニター", 45000, 8);
addProduct("キーボード", 8000, 12);

couponMod.registerCoupon("SAVE10", 10);
couponMod.registerCoupon("SUMMER20", 20);

// ── 商品 ──────────────────────────────────────────────────────────
app.get("/api/products", (_req: Request, res: Response) => {
  res.json(products);
});

app.post("/api/products", (req: Request, res: Response) => {
  const { name, price, stock } = req.body as { name: string; price: number; stock: number };
  try {
    if (!name || price == null || stock == null) throw new Error("name, price, stock は必須です");
    const p = addProduct(name, Number(price), Number(stock));
    res.status(201).json(p);
  } catch (e: unknown) {
    res.status(400).json({ error: (e as Error).message });
  }
});

// ── ユーザー ──────────────────────────────────────────────────────
app.get("/api/users", (_req: Request, res: Response) => {
  res.json(userMod.listUsers());
});

app.post("/api/users", (req: Request, res: Response) => {
  const { name, email, role } = req.body as { name: string; email: string; role: userMod.Role };
  try {
    const u = userMod.createUser(name, email, role);
    res.status(201).json(u);
  } catch (e: unknown) {
    res.status(400).json({ error: (e as Error).message });
  }
});

app.patch("/api/users/:id/role", (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { role } = req.body as { role: userMod.Role };
  try {
    userMod.updateRole(id, role);
    res.json(userMod.getUserById(id));
  } catch (e: unknown) {
    res.status(400).json({ error: (e as Error).message });
  }
});

app.delete("/api/users/:id", (req: Request, res: Response) => {
  const id = Number(req.params.id);
  try {
    userMod.deleteUser(id);
    res.json({ ok: true });
  } catch (e: unknown) {
    res.status(400).json({ error: (e as Error).message });
  }
});

// ── クーポン ──────────────────────────────────────────────────────
app.get("/api/coupons/:code", (req: Request, res: Response) => {
  const c = couponMod.getCoupon(req.params.code);
  if (!c) return res.status(404).json({ error: "クーポンが見つかりません" });
  res.json(c);
});

app.post("/api/coupons", (req: Request, res: Response) => {
  const { code, discountRate } = req.body as { code: string; discountRate: number };
  try {
    const c = couponMod.registerCoupon(code, Number(discountRate));
    res.status(201).json(c);
  } catch (e: unknown) {
    res.status(400).json({ error: (e as Error).message });
  }
});

// ── カート ────────────────────────────────────────────────────────
app.get("/api/cart/:userId", (req: Request, res: Response) => {
  const userId = Number(req.params.userId);
  const cart = cartMod.getCart(userId) ?? { userId, items: [] };
  res.json({ cart, total: cartMod.calcTotal(cart) });
});

app.post("/api/cart/:userId/add", (req: Request, res: Response) => {
  const userId = Number(req.params.userId);
  const { productId, quantity } = req.body as { productId: number; quantity: number };
  const product = products.find((p) => p.id === Number(productId));
  if (!product) return res.status(404).json({ error: "商品が見つかりません" });
  try {
    const updatedCart = cartMod.addToCart(userId, product, Number(quantity));
    res.json({ cart: updatedCart, total: cartMod.calcTotal(updatedCart) });
  } catch (e: unknown) {
    res.status(400).json({ error: (e as Error).message });
  }
});

app.delete("/api/cart/:userId/item/:productId", (req: Request, res: Response) => {
  const userId = Number(req.params.userId);
  const productId = Number(req.params.productId);
  cartMod.removeFromCart(userId, productId);
  res.json({ ok: true });
});

app.post("/api/cart/:userId/coupon", (req: Request, res: Response) => {
  const userId = Number(req.params.userId);
  const { code } = req.body as { code: string };
  try {
    cartMod.applyCoupon(userId, code);
    res.json({ ok: true });
  } catch (e: unknown) {
    res.status(400).json({ error: (e as Error).message });
  }
});

app.delete("/api/cart/:userId", (req: Request, res: Response) => {
  cartMod.clearCart(Number(req.params.userId));
  res.json({ ok: true });
});

// ── 注文 ──────────────────────────────────────────────────────────
app.post("/api/orders", (req: Request, res: Response) => {
  const { userId } = req.body as { userId: number };
  const cart = cartMod.getCart(Number(userId));
  if (!cart) return res.status(400).json({ error: "カートが存在しません" });
  try {
    const order = orderMod.createOrder(Number(userId), cart);
    res.status(201).json(order);
  } catch (e: unknown) {
    res.status(400).json({ error: (e as Error).message });
  }
});

app.get("/api/orders/user/:userId", (req: Request, res: Response) => {
  res.json(orderMod.getOrdersByUser(Number(req.params.userId)));
});

app.patch("/api/orders/:orderId/status", (req: Request, res: Response) => {
  const { status } = req.body as { status: orderMod.OrderStatus };
  try {
    const order = orderMod.updateStatus(Number(req.params.orderId), status);
    res.json(order);
  } catch (e: unknown) {
    res.status(400).json({ error: (e as Error).message });
  }
});

app.delete("/api/orders/:orderId", (req: Request, res: Response) => {
  try {
    orderMod.cancelOrder(Number(req.params.orderId));
    res.json({ ok: true });
  } catch (e: unknown) {
    res.status(400).json({ error: (e as Error).message });
  }
});

// ── フレーム保存（GIF 用）────────────────────────────────────────
app.post("/api/frames", (req: Request, res: Response) => {
  const { tc, frame, data } = req.body as { tc: string; frame: number; data: string };
  const dir = path.join(__dirname, "../docs/videos/frames", tc);
  fs.mkdirSync(dir, { recursive: true });
  const base64 = data.replace(/^data:image\/png;base64,/, "");
  const buf = Buffer.from(base64, "base64");
  fs.writeFileSync(path.join(dir, `frame_${String(frame).padStart(3, "0")}.png`), buf);
  res.json({ ok: true, frame });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 EC サイト UI サーバー起動中: http://localhost:${PORT}`);
});
