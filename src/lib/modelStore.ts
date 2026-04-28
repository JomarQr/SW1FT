export type TrainingStatus = 'idle' | 'training' | 'done';
export type TrainingMode   = 'daily' | 'weekly';

export interface ModelState {
  version: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  trainingSamples: number;
  lastTrained: string | null;
  status: TrainingStatus;
  progress: number;
  feedbacksUsed: number;
  trainingsCompleted: number;
}

const KEY = 'sw1ft_model_state';

const DEFAULT: ModelState = {
  version: 'v2.3.1',
  accuracy:  0.847,
  precision: 0.831,
  recall:    0.862,
  f1:        0.846,
  trainingSamples: 12_847,
  lastTrained: '2024-03-15T09:00:00Z',
  status: 'idle',
  progress: 0,
  feedbacksUsed: 0,
  trainingsCompleted: 0,
};

export function getModelState(): ModelState {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    return s ? { ...DEFAULT, ...s } : { ...DEFAULT };
  } catch { return { ...DEFAULT }; }
}

export function saveModelState(s: ModelState): void {
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function bumpModelVersion(feedbackCount: number, state: ModelState): ModelState {
  const parts = state.version.replace('v', '').split('.').map(Number);
  parts[2] += 1;
  const improvement = Math.min(feedbackCount * 0.0003, 0.015);
  return {
    ...state,
    version: `v${parts.join('.')}`,
    accuracy:  Math.min(0.99, state.accuracy  + improvement * 0.9),
    precision: Math.min(0.99, state.precision + improvement * 0.85),
    recall:    Math.min(0.99, state.recall    + improvement * 0.95),
    f1:        Math.min(0.99, state.f1        + improvement * 0.9),
    trainingSamples: state.trainingSamples + feedbackCount,
    lastTrained: new Date().toISOString(),
    status: 'done',
    progress: 100,
    feedbacksUsed: state.feedbacksUsed + feedbackCount,
    trainingsCompleted: state.trainingsCompleted + 1,
  };
}
