export type Role = 'superadmin' | 'analyst' | 'client';

export interface AppUser {
  id: string;
  username: string;
  password: string;
  role: Role;
  displayName: string;
  createdAt: string;
  createdBy: string;
}

const KEY = 'sw1ft_users';

function defaults(): AppUser[] {
  const now = new Date().toISOString();
  return [
    { id: 'usr-admin',   username: 'admin',   password: 'admin',        role: 'superadmin', displayName: 'Admin',       createdAt: now, createdBy: 'system' },
    { id: 'usr-analyst', username: 'analyst', password: 'sentinel2026', role: 'analyst',    displayName: 'J. Springis', createdAt: now, createdBy: 'system' },
  ];
}

export function getUsers(): AppUser[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const seed = defaults();
      localStorage.setItem(KEY, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(raw);
  } catch {
    return defaults();
  }
}

export function saveUser(user: AppUser): void {
  const list = getUsers();
  const idx = list.findIndex(u => u.id === user.id);
  if (idx >= 0) list[idx] = user; else list.push(user);
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function deleteUser(id: string): void {
  localStorage.setItem(KEY, JSON.stringify(getUsers().filter(u => u.id !== id)));
}

export function getUserByUsername(username: string): AppUser | null {
  return getUsers().find(u => u.username === username.toLowerCase()) ?? null;
}

export function createUser(data: {
  username: string;
  password: string;
  role: Role;
  displayName: string;
  createdBy: string;
}): { ok: boolean; error?: string } {
  if (getUserByUsername(data.username)) return { ok: false, error: 'Username already taken' };
  saveUser({
    id: `usr-${Date.now().toString(36)}`,
    username: data.username.toLowerCase(),
    password: data.password,
    role: data.role,
    displayName: data.displayName.trim() || data.username,
    createdAt: new Date().toISOString(),
    createdBy: data.createdBy,
  });
  return { ok: true };
}
