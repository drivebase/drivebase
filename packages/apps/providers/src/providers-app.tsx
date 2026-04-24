import { useState } from "react"
import { useProviderTypes } from "@drivebase/data"
import type { AppProps } from "@drivebase/kernel"
import type { ProviderTypesQuery } from "@drivebase/data/gql"
import { Button } from "@drivebase/ui/components/button"
import { ConnectForm } from "./connect-form"
import { providerIconClass } from "./provider-icons"

type ProviderType = ProviderTypesQuery["providerTypes"][number]

/**
 * Providers app. Two views in the same window:
 *   list  — every ProviderType from the server with a Connect button
 *   form  — dynamic credentials form for the selected ProviderType
 *
 * Selecting a row replaces the window contents with the form. On success
 * the form closes, `myProviders` is refetched, and we return to the list.
 */
export function ProvidersApp(_props: AppProps) {
  const [selected, setSelected] = useState<ProviderType | null>(null)
  const { providerTypes, fetching: typesFetching, error: typesError } = useProviderTypes()

  if (selected) {
    return (
      <ConnectForm
        providerType={selected}
        onBack={() => setSelected(null)}
        onConnected={() => setSelected(null)}
      />
    )
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto py-2">
      <section>
        <h3 className="px-4 pt-2 pb-1 text-[10px] font-medium uppercase tracking-wider text-[var(--fg-subtle)]">
          Available
        </h3>

        {typesError && (
          <div className="mx-4 mb-2 rounded-[var(--radius-sm)] border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-2.5 py-1.5 text-xs text-[var(--danger)]">
            {typesError.message}
          </div>
        )}

        {typesFetching && providerTypes.length === 0 ? (
          <div className="px-4 text-xs text-[var(--fg-muted)]">Loading…</div>
        ) : providerTypes.length === 0 ? (
          <div className="px-4 text-xs text-[var(--fg-muted)]">No provider types available.</div>
        ) : (
          <ul className="px-4 [&>li+li]:border-t [&>li+li]:border-[var(--border)]">
            {providerTypes.map((t) => (
              <li key={t.type} className="flex items-center gap-3 py-2">
                <span className={`inline-block size-5 ${providerIconClass(t.type)}`} aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-[var(--fg)]">{t.label}</div>
                  <div className="truncate text-xs text-[var(--fg-muted)]">
                    {t.type} · {authLabel(t.authKind)}
                  </div>
                </div>
                <Button size="sm" tone="primary" onClick={() => setSelected(t)}>
                  Connect
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function authLabel(kind: "oauth" | "api_key" | "credentials" | "none") {
  switch (kind) {
    case "oauth":
      return "OAuth"
    case "api_key":
      return "API key"
    case "credentials":
      return "Credentials"
    case "none":
      return "No auth"
  }
}
