/**
 * Bun's `typeof fetch` includes a `preconnect` method that plain async
 * functions don't have. Rather than littering tests with `as unknown as
 * typeof fetch` casts (forbidden by project convention), wrap stubs with
 * this helper so they structurally satisfy the full `typeof fetch` type.
 */
export function asFetch(
  fn: (input: string | URL | Request, init?: RequestInit) => Promise<Response>,
): typeof fetch {
  const preconnect: typeof fetch.preconnect = () => {
    // No-op: tests never exercise connection pre-warming.
  };
  return Object.assign(fn, { preconnect });
}
