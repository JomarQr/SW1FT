const AUTH_KEY = 'sl_auth';
const USER_KEY = 'sl_username';

const USERS: Record<string, string> = {
  analyst: 'sentinel2026',
  admin:   'admin',
};

export function isAuthenticated(): boolean {
  return localStorage.getItem(AUTH_KEY) === '1';
}

export function login(username: string, password: string): boolean {
  if (USERS[username.toLowerCase()] === password) {
    localStorage.setItem(AUTH_KEY, '1');
    localStorage.setItem(USER_KEY, username.toLowerCase());
    return true;
  }
  return false;
}

export function getUsername(): string {
  return localStorage.getItem(USER_KEY) ?? 'analyst';
}

export function logout(): void {
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(USER_KEY);
}
