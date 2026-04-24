import { useMemo, type ReactNode } from "react"
import { Provider as UrqlProvider, type Client } from "urql"
import { createDriveClient } from "./client"

export interface DrivebaseDataProviderProps {
  /** Optional pre-built client — useful for tests or SSR. */
  client?: Client
  children: ReactNode
}

/**
 * Top-level data provider. Owns the urql client for the lifetime of the app.
 * Auth is not wrapped here — Better Auth's React client is framework-agnostic
 * and works anywhere inside this tree via its own hooks.
 */
export function DrivebaseDataProvider({ client, children }: DrivebaseDataProviderProps) {
  const instance = useMemo(() => client ?? createDriveClient(), [client])
  return <UrqlProvider value={instance}>{children}</UrqlProvider>
}
