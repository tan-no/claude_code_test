# プロジェクト設定

## プロジェクト概要

Node.js + TypeScript で実装されたシンプルな EC サイトのバックエンドロジック。
ユーザー管理・カート操作・クーポン適用・注文フローを提供するインメモリ実装。

```
src/
├── user.ts    # ユーザー作成・検索・ロール管理
├── cart.ts    # カート操作・合計金額計算・クーポン適用
├── coupon.ts  # クーポン登録・使用済み管理
├── order.ts   # 注文作成・ステータス管理・キャンセル
└── index.ts   # 動作確認用サンプルスクリプト

tests/
├── user.test.ts
├── cart.test.ts
├── coupon.test.ts
└── order.test.ts
```

---

## 実行環境

Windows 環境では `node` が PATH に通っていないため、フルパスで実行する。

- **Node.js**: `C:\Program Files\nodejs\node.exe`
- **npm**: `node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js"`
- **npx**: `node "C:\Program Files\nodejs\node_modules\npm\bin\npx-cli.js"`
- **GitHub CLI**: `C:\Program Files\GitHub CLI\gh.exe`

### コマンド一覧

| 用途 | コマンド |
|------|---------|
| 依存インストール | `node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" install` |
| テスト実行 | `node "C:\Users\...\node_modules\jest\bin\jest.js" --rootDir .` |
| 型チェック | `node "C:\Program Files\nodejs\node_modules\npm\bin\npx-cli.js" tsc --noEmit` |
| アプリ起動 | `node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" start` |
| PR作成 | `"C:\Program Files\GitHub CLI\gh.exe" pr create ...` |

---

## コーディング規約

### 全般
- **言語**: TypeScript（`strict: true`）
- **モジュール形式**: CommonJS（`"module": "commonjs"`）
- **対象 ES バージョン**: ES2020

### 型・インターフェース
- 公開する型は `export interface` / `export type` で定義する
- 関数の引数・戻り値には必ず型を付与する

### エラーハンドリング
- 不正な入力・存在しないリソース・ビジネスルール違反は `throw new Error(...)` で明示的にエラーにする
- エラーメッセージは日本語で具体的に記述する（例: `"在庫が不足しています（在庫: 3）"`）
- 存在チェックが不要な削除系（`removeFromCart`, `cancelOrder` の存在チェック部分など）は静かに無視してよい

### ビジネスロジック上の決まり
- **在庫**: `addToCart` 時に `product.stock` を超えないようチェックし、`createOrder` 時にデクリメントする
- **ステータス遷移**: `pending → paid → shipped`（各段階でキャンセル可）。逆方向・`shipped` 後のキャンセルは禁止
- **クーポン**: 1カートにつき1枚のみ適用可、同一ユーザーによる再使用禁止、空カートへの適用禁止
- **金額計算**: 割引後の合計は `Math.round(result * 100) / 100` で小数点2桁に丸める
- **防御的コピー**: `listUsers()` など内部コレクションを返す関数はスプレッド構文でコピーして返す
- **ディープコピー**: `createOrder` の `items` は `{ ...item.product }` でスナップショットを保持する

---

## テスト方針

### フレームワーク
- **Jest** + **ts-jest**（`tsconfig.test.json` を参照）

### テストの配置
- `tests/` ディレクトリに `<モジュール名>.test.ts` を配置する

### 状態のリセット
各モジュールはモジュールレベルの変数（`Map`, 配列）で状態を管理するため、
テスト間の干渉を防ぐために `beforeEach` で `jest.resetModules()` + `require()` を使ってリセットする。

```typescript
beforeEach(() => {
  jest.resetModules();
  const mod = require("../src/user") as typeof import("../src/user");
  createUser = mod.createUser;
  // ...
});
```

相互依存するモジュール（例: order → cart → coupon）は **依存の末端から順にロード** することで
同一キャッシュインスタンスを共有できる。

```typescript
// coupon → user → cart → order の順でロード
const couponMod = require("../src/coupon");
const userMod   = require("../src/user");
const cartMod   = require("../src/cart");
const orderMod  = require("../src/order");
```

### テストのカバレッジ方針
- **正常系**: 基本的な動作が期待通りに動くこと
- **異常系**: 不正入力・存在しないリソースで適切なエラーが投げられること
- **境界値**: 0・負数・最大値・空コレクション等
- **不具合検出テスト**: 修正前は FAIL し、修正後に PASS するテストを `[BUG Px]` プレフィックスで明示する

### テスト実行（CI）
GitHub Actions（`.github/workflows/ci.yml`）により push・PR 時に自動実行される。

---

## マージコンフリクト対応フロー

コンフリクトが発生した場合は以下の手順で対応する。

### 手順

```
# 1. コンフリクト解消
git fetch origin main
git merge origin/main
# 各ファイルのコンフリクトマーカー（<<<<<<< / ======= / >>>>>>>）を手動修正

# 2. 解消後にステージング・コミット・プッシュ
git add <修正したファイル>
git commit -m "chore: main とのマージコンフリクトを解消"
git push origin <ブランチ名>

# 3. Auto-merge を再設定（squash マージ）
"C:\Program Files\GitHub CLI\gh.exe" pr merge <PR番号> --auto --squash
```

### ポイント
- コンフリクト解消後は必ず `git diff --check` でマーカーの残留がないことを確認する
- push 後に CI が通過すると Auto-merge が自動的にマージを実行する
- Auto-merge は PR がクローズされると解除されるため、再オープン時は再設定が必要

---

## コミットメッセージのルール

### フォーマット
```
<種別>: <変更内容の概要>（日本語）

<詳細説明（任意）>

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

### 種別

| 種別 | 用途 |
|------|------|
| `feat` | 新機能の追加 |
| `fix` | バグ修正 |
| `test` | テストの追加・修正 |
| `ci` | CI/CD 設定の変更 |
| `refactor` | 動作変更を伴わないリファクタリング |
| `docs` | ドキュメントのみの変更 |
| `chore` | ビルド設定・依存関係の更新など |

### 例
```
fix: addToCart に負の数量・在庫超過チェックを追加

- 数量 <= 0 の場合はエラーをスロー
- 既存数量との合算が stock を超える場合もエラーをスロー
```
