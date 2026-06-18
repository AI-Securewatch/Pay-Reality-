import type { DemoState } from "./demoTypes";
import { createInitialDemoState } from "./demoSeed";

const STORAGE_KEY = "payreality-demo-v2";

export function saveDemoData(state: DemoState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors in demo
  }
}

export function loadDemoData(): DemoState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DemoState;
    if (!parsed.agents || !parsed.policies) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearDemoData(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function getInitialState(): DemoState {
  return loadDemoData() ?? createInitialDemoState();
}
