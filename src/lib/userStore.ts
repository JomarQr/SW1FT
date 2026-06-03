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
    { id: 'usr-analyst', username: 'jevgenijs', password: 'Sw1ft@2026', role: 'superadmin', displayName: 'J. Springis', createdAt: now, createdBy: 'system' },
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
    let list: AppUser[] = JSON.parse(raw);
    let dirty = false;

    // Remove legacy admin/admin account
    const before = list.length;
    list = list.filter(u => !(u.id === 'usr-admin' || u.password === 'admin'));
    if (list.length !== before) dirty = true;

    // Migrate old 'analyst' username to 'jevgenijs'
    for (const u of list) {
      if (u.id === 'usr-analyst' && u.username === 'analyst') {
        u.username = 'jevgenijs';
        dirty = true;
      }
      // Ensure superadmin role on built-in account
      if (u.id === 'usr-analyst' && u.role !== 'superadmin') {
        u.role = 'superadmin';
        dirty = true;
      }
    }

    // If built-in account is missing, re-seed it
    if (!list.find(u => u.id === 'usr-analyst')) {
      list = [...defaults(), ...list];
      dirty = true;
    }

    if (dirty) localStorage.setItem(KEY, JSON.stringify(list));
    return list;
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
