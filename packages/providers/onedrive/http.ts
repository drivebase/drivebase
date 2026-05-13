import {
  AuthError,
  NotFoundError,
  ProviderError,
  RateLimitError,
} from "@drivebase/storage";
import type { TokenStore } from "./token-store.ts";

export type FetchFn = typeof fetch;

export class OneDriveHttp {
  constructor(
    private readonly tokens: TokenStore,
    private readonly fetchImpl: FetchFn = fetch,
  ) {}

  async request(
    input: string,
    init: RequestInit & { skipAuth?: boolean } = {},
  ): Promise<Response> {
    const { skipAuth, ...rest } = init;
    const send = async (token: string) => {
      const headers = new Headers(rest.headers);
      if (!skipAuth) headers.set("authorization", `Bearer ${token}`);
      return this.fetchImpl(input, { ...rest, headers });
    };

    let token = skipAuth ? "" : await this.tokens.getAccessToken();
    let res = await send(token);
    if (res.status === 401 && !skipAuth) {
      token = await this.tokens.forceRefresh();
      res = await send(token);
    }
    return res;
  }

  async json<T>(input: string, init?: RequestInit): Promise<T> {
    const res = await this.request(input, init);
    if (res.ok) return (await res.json()) as T;
    throw await translateError(res, input);
  }
}

export async function translateError(res: Response, ctx: string): Promise<Error> {
  let body = "";
  try {
    body = await res.text();
  } catch {
    // swallow
  }
  if (res.status === 404) return new NotFoundError(`${ctx}: ${body || "not found"}`);
  if (res.status === 401 || res.status === 403) {
    return new AuthError(`${ctx}: ${res.status} ${body}`);
  }
  if (res.status === 429) {
    const retry = Number(res.headers.get("retry-after") ?? "") * 1000;
    return new RateLimitError(
      `${ctx}: 429 ${body}`,
      Number.isFinite(retry) && retry > 0 ? retry : undefined,
    );
  }
  return new ProviderError(`${ctx}: ${res.status} ${body}`, "onedrive");
}
