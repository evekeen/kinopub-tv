export function logWatchingError(context: string, error: unknown): void {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.warn('[watching] ' + context, error);
  }
}
