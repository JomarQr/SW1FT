const AUTH_KEY = 'sl_auth';

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
    return true;
  }
  return false;
}

export function logout(): void {
  localStorage.removeItem(AUTH_KEY);
}
