const NAVIGATION_ACTIONS: ReadonlySet<string> = new Set([
  'up', 'down', 'left', 'right',
  'enter', 'back',
]);

const THROTTLE_MS = 150;

const lastKeyTime: Map<string, number> = new Map();

export function shouldThrottleKey(key: string, now: number): boolean {
  if (!NAVIGATION_ACTIONS.has(key)) {
    return false;
  }

  const lastTime = lastKeyTime.get(key);
  if (lastTime !== undefined && now - lastTime < THROTTLE_MS) {
    return true;
  }

  lastKeyTime.set(key, now);
  return false;
}

export function resetThrottleState(): void {
  lastKeyTime.clear();
}
