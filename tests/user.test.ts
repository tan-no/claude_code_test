/**
 * user.ts のユニットテスト
 *
 * [BUG P2] マークのテストは現在 FAIL する（既知の不具合）。
 * [BUG P3] マークのテストは現在 FAIL する（既知の不具合）。
 */

import type * as UserModule from "../src/user";

let createUser: typeof UserModule.createUser;
let getUserById: typeof UserModule.getUserById;
let getUserByEmail: typeof UserModule.getUserByEmail;
let updateRole: typeof UserModule.updateRole;
let listUsers: typeof UserModule.listUsers;
let searchByName: typeof UserModule.searchByName;
let deleteUser: typeof UserModule.deleteUser;

beforeEach(() => {
  jest.resetModules();
  const mod = require("../src/user") as typeof UserModule;
  createUser = mod.createUser;
  getUserById = mod.getUserById;
  getUserByEmail = mod.getUserByEmail;
  updateRole = mod.updateRole;
  listUsers = mod.listUsers;
  searchByName = mod.searchByName;
  deleteUser = mod.deleteUser;
});

// ─── createUser ──────────────────────────────────────────────────
describe("createUser", () => {
  test("正常: ユーザーを作成して返す", () => {
    const user = createUser("Alice", "alice@example.com", "editor");
    expect(user.id).toBe(1);
    expect(user.name).toBe("Alice");
    expect(user.email).toBe("alice@example.com");
    expect(user.role).toBe("editor");
    expect(user.createdAt).toBeInstanceOf(Date);
  });

  test("正常: ID が連番で採番される", () => {
    const u1 = createUser("Alice", "a@example.com", "viewer");
    const u2 = createUser("Bob", "b@example.com", "viewer");
    expect(u2.id).toBe(u1.id + 1);
  });

  test("正常: 全ロール（admin / editor / viewer）で作成できる", () => {
    const admin = createUser("Admin", "admin@example.com", "admin");
    const editor = createUser("Ed", "ed@example.com", "editor");
    const viewer = createUser("Viewer", "v@example.com", "viewer");
    expect(admin.role).toBe("admin");
    expect(editor.role).toBe("editor");
    expect(viewer.role).toBe("viewer");
  });

  // [BUG P2] メールアドレスの重複チェックがない
  test("[BUG P2] 同一メールアドレスで再登録するとエラーになること", () => {
    createUser("Alice", "dup@example.com", "viewer");
    // 現状: エラーにならず 2 件目が登録される → このテストは FAIL する
    expect(() => createUser("Alice2", "dup@example.com", "viewer")).toThrow();
  });
});

// ─── getUserById ─────────────────────────────────────────────────
describe("getUserById", () => {
  test("正常: 存在する ID でユーザーを取得できる", () => {
    const user = createUser("Alice", "alice@example.com", "viewer");
    expect(getUserById(user.id)).toEqual(user);
  });

  test("存在しない ID は undefined を返す", () => {
    expect(getUserById(999)).toBeUndefined();
  });

  test("境界値: ID=0 は undefined を返す", () => {
    createUser("Alice", "alice@example.com", "viewer"); // id=1
    expect(getUserById(0)).toBeUndefined();
  });
});

// ─── getUserByEmail ──────────────────────────────────────────────
describe("getUserByEmail", () => {
  test("正常: メールアドレスでユーザーを取得できる", () => {
    const user = createUser("Alice", "alice@example.com", "viewer");
    expect(getUserByEmail("alice@example.com")).toEqual(user);
  });

  test("存在しないメールは undefined を返す", () => {
    expect(getUserByEmail("nobody@example.com")).toBeUndefined();
  });

  test("部分一致では取得できない（完全一致）", () => {
    createUser("Alice", "alice@example.com", "viewer");
    expect(getUserByEmail("alice")).toBeUndefined();
  });
});

// ─── updateRole ──────────────────────────────────────────────────
describe("updateRole", () => {
  test("正常: ロールを更新できる", () => {
    const user = createUser("Alice", "alice@example.com", "viewer");
    updateRole(user.id, "admin");
    expect(getUserById(user.id)?.role).toBe("admin");
  });

  test("正常: editor → viewer への降格もできる", () => {
    const user = createUser("Alice", "alice@example.com", "editor");
    updateRole(user.id, "viewer");
    expect(getUserById(user.id)?.role).toBe("viewer");
  });

  test("異常: 存在しない ID はエラーを投げる", () => {
    expect(() => updateRole(999, "admin")).toThrow();
  });
});

// ─── listUsers ───────────────────────────────────────────────────
describe("listUsers", () => {
  test("正常: 登録済みユーザー全件を返す", () => {
    createUser("Alice", "a@example.com", "viewer");
    createUser("Bob", "b@example.com", "viewer");
    expect(listUsers()).toHaveLength(2);
  });

  test("ユーザーが 0 件のときは空配列を返す", () => {
    expect(listUsers()).toHaveLength(0);
  });

  // [BUG P2] listUsers() が内部配列の参照を返すため外部から破壊できる
  test("[BUG P2] 戻り値を変更しても内部状態が変わらないこと（防御的コピー）", () => {
    createUser("Alice", "a@example.com", "viewer");
    const list = listUsers();
    list.length = 0; // 外部からクリア
    // 現状: 内部配列も空になってしまう → このテストは FAIL する
    expect(listUsers()).toHaveLength(1);
  });
});

// ─── searchByName ────────────────────────────────────────────────
describe("searchByName", () => {
  test("正常: 部分一致でヒットする", () => {
    createUser("Alice", "a@example.com", "viewer");
    createUser("Bob", "b@example.com", "viewer");
    const result = searchByName("Ali");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Alice");
  });

  test("正常: 複数ヒット", () => {
    createUser("Alice", "a@example.com", "viewer");
    createUser("Alfred", "alf@example.com", "viewer");
    createUser("Bob", "b@example.com", "viewer");
    expect(searchByName("Al")).toHaveLength(2);
  });

  test("一致なしは空配列", () => {
    createUser("Alice", "a@example.com", "viewer");
    expect(searchByName("xyz")).toHaveLength(0);
  });

  test("空文字は全件ヒット", () => {
    createUser("Alice", "a@example.com", "viewer");
    createUser("Bob", "b@example.com", "viewer");
    expect(searchByName("")).toHaveLength(2);
  });

  // [BUG P3] 大文字小文字を区別するため小文字クエリで大文字名を見つけられない
  test("[BUG P3] 小文字クエリで大文字始まりの名前にヒットすること", () => {
    createUser("Alice", "a@example.com", "viewer");
    // 現状: includes("alice") は "Alice" にヒットしない → このテストは FAIL する
    expect(searchByName("alice")).toHaveLength(1);
  });
});

// ─── deleteUser ──────────────────────────────────────────────────
describe("deleteUser", () => {
  test("正常: 存在するユーザーを削除できる", () => {
    const user = createUser("Alice", "alice@example.com", "viewer");
    expect(() => deleteUser(user.id)).not.toThrow();
  });

  test("正常: 削除後は getUserById で取得できなくなる", () => {
    const user = createUser("Alice", "alice@example.com", "viewer");
    deleteUser(user.id);
    expect(getUserById(user.id)).toBeUndefined();
  });

  test("エッジ: 削除後は listUsers に含まれない", () => {
    const u1 = createUser("Alice", "a@example.com", "viewer");
    const u2 = createUser("Bob", "b@example.com", "viewer");
    deleteUser(u1.id);
    const list = listUsers();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(u2.id);
  });

  test("異常: 存在しない ID を削除しようとするとエラーをスロー", () => {
    expect(() => deleteUser(999)).toThrow();
  });

  test("異常: エラーメッセージに対象 ID が含まれる", () => {
    expect(() => deleteUser(42)).toThrow("42");
  });
});
