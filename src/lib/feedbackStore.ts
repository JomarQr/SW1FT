export type OverrideStatus = 'SAFE' | 'WATCH' | 'ALERT' | 'BLOCKED';

export interface SessionFeedback {
  id: string;
  sessionId: string;
  userId: string;
  originalStatus: string;
  originalRiskScore: number;
  overrideStatus: OverrideStatus;
  reason: string;
  analyst: string;
  timestamp: string;
  modelWasCorrect: boolean;
}

const KEY = 'sw1ft_feedbacks';

export function getFeedbacks(): SessionFeedback[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]'); }
  catch { return []; }
}

export function getFeedbackForSession(sessionId: string): SessionFeedback | null {
  return getFeedbacks().find(f => f.sessionId === sessionId) ?? null;
}

export function saveFeedback(f: SessionFeedback): void {
  const list = getFeedbacks();
  const idx  = list.findIndex(e => e.sessionId === f.sessionId);
  if (idx >= 0) list[idx] = f; else list.unshift(f);
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function countFeedbacks(): number {
  return getFeedbacks().length;
}

export function clearFeedbacks(): void {
  localStorage.removeItem(KEY);
}
