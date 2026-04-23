import type { BehaviorSnapshot } from './useBehaviorCapture';

const STORE_KEY = 'sl_behavior_sessions';

export function saveSession(snapshot: BehaviorSnapshot): void {
  const sessions = getSessions();
  sessions.unshift(snapshot);
  localStorage.setItem(STORE_KEY, JSON.stringify(sessions.slice(0, 100)));
}

export function getSessions(): BehaviorSnapshot[] {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function clearSessions(): void {
  localStorage.removeItem(STORE_KEY);
}
