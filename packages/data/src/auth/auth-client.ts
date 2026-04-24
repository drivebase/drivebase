import { createAuthClient } from "better-auth/react"
import { authUrl } from "../config"

/**
 * Better Auth React client. Cookie-based sessions; all API calls use
 * `credentials: "include"` via better-fetch under the hood. Exposes:
 *   - `authClient.useSession()` — reactive session hook
 *   - `authClient.signIn.email(...)`, `authClient.signUp.email(...)`
 *   - `authClient.signOut()`
 */
export const authClient = createAuthClient({
  baseURL: authUrl(),
  basePath: "/auth",
})

export const { useSession, signIn, signUp, signOut, getSession } = authClient
