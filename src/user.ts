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

// ユーザーを新規登録する
export function createUser(name: string, email: string, role: Role): User {
  // バグ①: メールアドレスの重複チェックがない
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

// IDでユーザーを取得する
export function getUserById(id: number): User {
  // バグ②: 見つからない場合に undefined を返すが戻り値型が User（非nullableで不整合）
  return users.find((u) => u.id === id) as User;
}

// メールアドレスでユーザーを検索する
export function getUserByEmail(email: string): User | undefined {
  return users.find((u) => u.Email === email); // バグ③: プロパティ名typo（email → Email）
}

// ロールを更新する
export function updateRole(id: number, newRole: Role): void {
  const user = getUserById(id);
  user.role = newRole;
}

// 全ユーザーを取得する
export function listUsers(): User[] {
  return users;
}

// 名前でユーザーを検索する（部分一致）
export function searchByName(query: string): User[] {
  // バグ④: 大文字小文字を区別してしまう（toLowerCase がない）
  return users.filter((u) => u.name.includes(query));
}
