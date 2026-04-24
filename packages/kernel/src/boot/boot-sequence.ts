/**
 * Boot phase transitions are owned by `<SessionGate>` — it watches the Better
 * Auth session and drives `bootStore.phase` between splash / auth / locked /
 * ready. This file used to contain a fake timer-based boot; leaving the
 * export in place for future hooks (e.g. graphql preflight, feature flags)
 * that should block the shell from rendering.
 */
export function useBootSequence() {
  // no-op for now
}
