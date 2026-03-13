export type Role = "admin" | "editor" | "viewer";

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  createdAt: Date;
}

const users: User[] = [];
let nextId = 1;

/**
 * ユーザーを新規登録する。
 * @param name - ユーザーの表示名
 * @param email - メールアドレス
 * @param role - 付与するロール
 * @returns 作成されたユーザーオブジェクト
 */
export function createUser(name: string, email: string, role: Role): User {
  if (users.some((u) => u.email === email)) {
    throw new Error(`メールアドレス "${email}" は既に使用されています`);
  }
  const user: User = {
    id: nextId,
    name,
    email,
    role,
    createdAt: new Date(),
  };
  users.push(user);
  nextId++;
  return user;
}

/**
 * IDでユーザーを取得する。
 * @param id - 検索するユーザーID
 * @returns 対応するユーザーオブジェクト（存在しない場合は `undefined`）
 */
export function getUserById(id: number): User | undefined {
  return users.find((u) => u.id === id);
}

/**
 * メールアドレスでユーザーを検索する。
 * @param email - 検索するメールアドレス
 * @returns 対応するユーザーオブジェクト、存在しない場合は `undefined`
 */
export function getUserByEmail(email: string): User | undefined {
  return users.find((u) => u.email === email); // バグ③: プロパティ名typo（email → Email）
}

/**
 * 指定ユーザーのロールを更新する。
 * @param id - 更新対象のユーザーID
 * @param newRole - 新しく設定するロール
 */
export function updateRole(id: number, newRole: Role): void {
  const user = getUserById(id);
  if (!user) throw new Error(`ユーザーID ${id} が見つかりません`);
  user.role = newRole;
}

/**
 * 全ユーザーの一覧を取得する。
 * @returns 登録済みユーザーの配列
 */
export function listUsers(): User[] {
  return [...users];
}

/**
 * 名前でユーザーを検索する（部分一致）。
 * @param query - 検索キーワード
 * @returns 名前にキーワードを含むユーザーの配列
 */
export function searchByName(query: string): User[] {
  return users.filter((u) => u.name.toLowerCase().includes(query.toLowerCase()));
}
