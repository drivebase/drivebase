import { useEffect, useMemo, useState, type SubmitEventHandler } from "react"
import {
  useConnectProvider,
  useCreateOAuthApp,
  useBeginProviderOAuth,
  useMyOAuthApps,
} from "@drivebase/data"
import type { MyOAuthAppsQuery, ProviderTypesQuery } from "@drivebase/data/gql"
import { Button } from "@drivebase/ui/components/button"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@drivebase/ui/components/select"
import { Input } from "@drivebase/ui/components/input"
import { ArrowLeft } from "lucide-react"

type ProviderType = ProviderTypesQuery["providerTypes"][number]
type OAuthApp = MyOAuthAppsQuery["myOAuthApps"][number]

export interface ConnectFormProps {
  providerType: ProviderType
  onBack: () => void
  onConnected: () => void
}

/**
 * Dynamic connect form. Two flows by `authKind`:
 *   - credentials/api_key/none → render `credentialFields` dynamically and
 *     call `connectProvider` directly.
 *   - oauth → prefer a saved OAuth app for the provider, or create a new
 *     OAuth app first and then start `beginProviderOAuth`. The popup callback
 *     is delivered via `drivebase:oauth-callback`.
 */
export function ConnectForm({ providerType, onBack, onConnected }: ConnectFormProps) {
  if (providerType.authKind === "oauth") {
    return (
      <OAuthFlow
        providerType={providerType}
        onBack={onBack}
        onConnected={onConnected}
      />
    )
  }
  return (
    <CredentialsFlow
      providerType={providerType}
      onBack={onBack}
      onConnected={onConnected}
    />
  )
}

function CredentialsFlow({ providerType, onBack, onConnected }: ConnectFormProps) {
  const [label, setLabel] = useState(providerType.label)
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(providerType.credentialFields.map((f) => [f.key, ""])),
  )
  const [error, setError] = useState<string | null>(null)
  const [, connectProvider] = useConnectProvider()
  const [submitting, setSubmitting] = useState(false)

  const canSubmit = useMemo(() => {
    if (!label.trim()) return false
    return providerType.credentialFields.every(
      (f) => !f.required || (values[f.key] ?? "").length > 0,
    )
  }, [label, values, providerType.credentialFields])

  const onSubmit: SubmitEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault()
    if (!canSubmit || submitting) return
    setError(null)
    setSubmitting(true)
    try {
      const result = await connectProvider({
        input: {
          type: providerType.type,
          label: label.trim(),
          credentials: values,
        },
      })
      if (result.error) {
        setError(result.error.graphQLErrors[0]?.message ?? result.error.message)
        return
      }
      if (result.data?.connectProvider) {
        onConnected()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <FormShell
      providerType={providerType}
      onBack={onBack}
      onSubmit={onSubmit}
      submitting={submitting}
      canSubmit={canSubmit}
      error={error}
    >
      <label className="flex flex-col gap-1 text-xs text-[var(--fg-muted)]">
        Label
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Personal Drive"
          required
          disabled={submitting}
        />
        <span className="text-[11px] text-[var(--fg-subtle)]">
          Shown in the Files sidebar and anywhere this provider appears.
        </span>
      </label>

      {providerType.credentialFields.length === 0 ? (
        <p className="text-xs text-[var(--fg-muted)]">
          This provider doesn't require any credentials.
        </p>
      ) : (
        providerType.credentialFields.map((field) => (
          <label key={field.key} className="flex flex-col gap-1 text-xs text-[var(--fg-muted)]">
            <span>
              {field.label}
              {field.required && <span className="ml-0.5 text-[var(--danger)]">*</span>}
            </span>
            <Input
              type={field.type === "password" ? "password" : field.type === "url" ? "url" : "text"}
              value={values[field.key] ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
              placeholder={field.placeholder ?? undefined}
              required={field.required}
              disabled={submitting}
            />
            {field.helpText && (
              <span className="text-[11px] text-[var(--fg-subtle)]">{field.helpText}</span>
            )}
          </label>
        ))
      )}
    </FormShell>
  )
}

type OAuthCallbackMessage = {
  type: "drivebase:oauth-callback"
  payload:
    | { ok: true; providerId: string; providerType: string }
    | { ok: false; message: string }
}

function OAuthFlow({ providerType, onBack, onConnected }: ConnectFormProps) {
  const [label, setLabel] = useState(providerType.label)
  const [oauthAppLabel, setOAuthAppLabel] = useState(providerType.label)
  const [selectedOAuthAppId, setSelectedOAuthAppId] = useState<string>("")
  const [clientId, setClientId] = useState("")
  const [clientSecret, setClientSecret] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [phase, setPhase] = useState<"idle" | "starting" | "awaiting">("idle")
  const [, createOAuthApp] = useCreateOAuthApp()
  const [, beginProviderOAuth] = useBeginProviderOAuth()
  const { oauthApps, fetching: loadingOAuthApps } = useMyOAuthApps()

  const providerOAuthApps = useMemo<OAuthApp[]>(
    () => oauthApps.filter((app: OAuthApp) => app.provider === providerType.type),
    [oauthApps, providerType.type],
  )
  const hasExistingOAuthApps = providerOAuthApps.length > 0
  const createNewValue = "__create_new__"
  const activeSelection = hasExistingOAuthApps
    ? selectedOAuthAppId || providerOAuthApps[0]!.id
    : createNewValue
  const creatingNew = activeSelection === createNewValue

  const submitting = phase !== "idle"

  useEffect(() => {
    if (loadingOAuthApps) return

    if (!hasExistingOAuthApps) {
      setSelectedOAuthAppId("")
      return
    }

    setSelectedOAuthAppId((current) => current || providerOAuthApps[0]!.id)
  }, [hasExistingOAuthApps, loadingOAuthApps, providerOAuthApps])

  const canSubmit = useMemo(() => {
    if (!label.trim()) return false
    if (creatingNew && !oauthAppLabel.trim()) return false
    if (!creatingNew) return Boolean(activeSelection)
    return Boolean(clientId.trim() && clientSecret.trim())
  }, [activeSelection, clientId, clientSecret, creatingNew, label, oauthAppLabel])

  // Listen once for the popup's postMessage. We filter by origin against the
  // popup's window reference and by payload shape so stray messages from
  // other pages or extensions don't trigger us.
  useEffect(() => {
    if (phase !== "awaiting") return
    function onMessage(e: MessageEvent<OAuthCallbackMessage>) {
      const data = e.data
      if (!data || typeof data !== "object") return
      if (data.type !== "drivebase:oauth-callback") return
      if (data.payload.ok) {
        onConnected()
      } else {
        setError(data.payload.message || "OAuth failed")
        setPhase("idle")
      }
    }
    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  }, [phase, onConnected])

  const onSubmit: SubmitEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault()
    if (!canSubmit || submitting) return
    setError(null)
    setPhase("starting")
    try {
      let oauthAppId = activeSelection
      if (creatingNew) {
        const appRes = await createOAuthApp({
          input: {
            provider: providerType.type,
            label: oauthAppLabel.trim(),
            clientId: clientId.trim(),
            clientSecret: clientSecret.trim(),
          },
        })
        if (appRes.error) {
          setError(
            appRes.error.graphQLErrors[0]?.message ?? appRes.error.message,
          )
          setPhase("idle")
          return
        }
        oauthAppId = appRes.data?.createOAuthApp.id ?? ""
        if (!oauthAppId) {
          setError("Failed to create OAuth app")
          setPhase("idle")
          return
        }
      }

      const beginRes = await beginProviderOAuth({
        input: { oauthAppId, label: label.trim() },
      })
      if (beginRes.error) {
        setError(
          beginRes.error.graphQLErrors[0]?.message ?? beginRes.error.message,
        )
        setPhase("idle")
        return
      }
      const authorizeUrl = beginRes.data?.beginProviderOAuth.authorizeUrl
      if (!authorizeUrl) {
        setError("Failed to begin OAuth")
        setPhase("idle")
        return
      }

      const popup = window.open(
        authorizeUrl,
        "drivebase-oauth",
        "popup=yes,width=560,height=720",
      )
      if (!popup) {
        setError("Popup blocked. Allow popups for Drivebase and retry.")
        setPhase("idle")
        return
      }
      setPhase("awaiting")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start OAuth")
      setPhase("idle")
    }
  }

  const submitLabel =
    phase === "starting" ? "Starting…" : phase === "awaiting" ? "Waiting…" : "Connect"

  return (
    <FormShell
      providerType={providerType}
      onBack={onBack}
      onSubmit={onSubmit}
      submitting={submitting}
      canSubmit={canSubmit}
      error={error}
      submitLabel={submitLabel}
    >
      <label className="flex flex-col gap-1 text-xs text-[var(--fg-muted)]">
        Connection label
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Personal Drive"
          required
          disabled={submitting}
        />
        <span className="text-[11px] text-[var(--fg-subtle)]">
          Shown in the Files sidebar and anywhere this provider appears.
        </span>
      </label>

      {hasExistingOAuthApps && (
        <div className="flex flex-col gap-1 text-xs text-[var(--fg-muted)]">
          <div>OAuth app</div>
          <Select
            value={activeSelection}
            onValueChange={setSelectedOAuthAppId}
            disabled={submitting || loadingOAuthApps}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select OAuth app" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {providerOAuthApps.map((app) => (
                  <SelectItem key={app.id} value={app.id}>
                    {app.label}
                  </SelectItem>
                ))}
              </SelectGroup>
              <SelectSeparator />
              <SelectGroup>
                <SelectItem value={createNewValue}>Create new OAuth app</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          <div className="text-[11px] text-[var(--fg-subtle)]">
            Reuse a saved OAuth app or create a new one for {providerType.label}.
          </div>
        </div>
      )}

      {creatingNew && (
        <>
          <label className="flex flex-col gap-1 text-xs text-[var(--fg-muted)]">
            <span>
              OAuth app label<span className="ml-0.5 text-[var(--danger)]">*</span>
            </span>
            <Input
              value={oauthAppLabel}
              onChange={(e) => setOAuthAppLabel(e.target.value)}
              placeholder={`e.g. ${providerType.label}`}
              required
              disabled={submitting}
            />
            <span className="text-[11px] text-[var(--fg-subtle)]">
              Saved so you can reuse this OAuth app later.
            </span>
          </label>

          <label className="flex flex-col gap-1 text-xs text-[var(--fg-muted)]">
            <span>
              Client ID<span className="ml-0.5 text-[var(--danger)]">*</span>
            </span>
            <Input
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              required
              disabled={submitting}
              autoComplete="off"
              spellCheck={false}
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-[var(--fg-muted)]">
            <span>
              Client Secret<span className="ml-0.5 text-[var(--danger)]">*</span>
            </span>
            <Input
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              required
              disabled={submitting}
              autoComplete="off"
              spellCheck={false}
            />
            <span className="text-[11px] text-[var(--fg-subtle)]">
              Stored encrypted. A popup will open to complete consent.
            </span>
          </label>
        </>
      )}
    </FormShell>
  )
}

function FormShell({
  providerType,
  onBack,
  onSubmit,
  submitting,
  canSubmit,
  error,
  submitLabel,
  children,
}: {
  providerType: ProviderType
  onBack: () => void
  onSubmit: SubmitEventHandler<HTMLFormElement>
  submitting: boolean
  canSubmit: boolean
  error: string | null
  submitLabel?: string
  children: React.ReactNode
}) {
  return (
    <form onSubmit={onSubmit} className="flex h-full flex-col">
      <header className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
        <Button
          type="button"
          tone="ghost"
          size="icon-sm"
          onClick={onBack}
          disabled={submitting}
          aria-label="Back"
        >
          <ArrowLeft size={14} />
        </Button>
        <div className="flex flex-col">
          <div className="text-sm font-semibold text-[var(--fg)]">
            Connect {providerType.label}
          </div>
          <div className="text-xs text-[var(--fg-muted)]">
            {providerType.authKind === "oauth" ? "OAuth 2.0" : `${providerType.credentialFields.length} field${providerType.credentialFields.length === 1 ? "" : "s"}`}
          </div>
        </div>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {children}

        {error && (
          <div className="rounded-[var(--radius-sm)] border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-2.5 py-1.5 text-xs text-[var(--danger)]">
            {error}
          </div>
        )}
      </div>

      <footer className="flex items-center justify-end gap-2 border-t border-[var(--border)] px-4 py-3">
        <Button type="button" tone="ghost" onClick={onBack} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" tone="primary" disabled={!canSubmit || submitting}>
          {submitLabel ?? (submitting ? "Connecting…" : "Connect")}
        </Button>
      </footer>
    </form>
  )
}
