import { getUserByUsername, type AppUser, type Role } from './userStore';

const AUTH_KEY = 'sl_auth';
const USER_KEY = 'sl_username';

export function isAuthenticated(): boolean {
  return localStorage.getItem(AUTH_KEY) === '1';
}

export function login(username: string, password: string): boolean {
  const user = getUserByUsername(username.toLowerCase());
  if (user && user.password === password) {
    localStorage.setItem(AUTH_KEY, '1');
    localStorage.setItem(USER_KEY, username.toLowerCase());
    return true;
  }
  return false;
}

export function getCurrentUser(): AppUser | null {
  const username = localStorage.getItem(USER_KEY);
  if (!username) return null;
  return getUserByUsername(username);
}

export function getUsername(): string {
  return localStorage.getItem(USER_KEY) ?? 'analyst';
}

export function getRole(): Role {
  return getCurrentUser()?.role ?? 'client';
}

export function isAdmin(): boolean {
  return getRole() === 'superadmin';
}

export function logout(): void {
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(USER_KEY);
}
