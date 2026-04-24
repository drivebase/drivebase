import { useState, type SubmitEventHandler } from "react"
import { signIn, signUp } from "@drivebase/data"
import { Button } from "@drivebase/ui/components/button"
import { Input } from "@drivebase/ui/components/input"

type Mode = "signin" | "signup"

/**
 * Built-in login surface. Rendered above the wallpaper during boot when the
 * viewer is unauthenticated. Uses Better Auth's React client directly.
 *
 * This is not a window — the shell is fully hidden during this phase, which
 * matches how macOS/GNOME handle the pre-session state.
 */
export interface LoginScreenProps {
  onAuthenticated?: () => void | Promise<void>
}

export function LoginScreen({ onAuthenticated }: LoginScreenProps = {}) {
  const [mode, setMode] = useState<Mode>("signin")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit: SubmitEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const result =
        mode === "signin"
          ? await signIn.email({ email, password })
          : await signUp.email({ email, password, name })
      if (result.error) {
        setError(result.error.message ?? "Authentication failed")
      } else {
        await onAuthenticated?.()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[2000] grid place-items-center bg-[var(--bg)]/72 text-[var(--fg)] backdrop-blur-xl">
      <form
        onSubmit={onSubmit}
        className="glass-strong window-shadow flex w-full max-w-sm flex-col gap-4 rounded-[var(--window-radius)] border border-[var(--border)] p-6 text-[var(--fg)]"
      >
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <img
              src="/circle.svg"
              alt=""
              aria-hidden="true"
              className="size-4 shrink-0 object-contain"
            />
            <span className="text-base font-semibold">DriveOS</span>
          </div>
          <p className="text-sm text-[var(--fg-muted)]">
            {mode === "signin" ? "Sign in to continue" : "Create your account"}
          </p>
        </div>

        {mode === "signup" && (
          <label className="flex flex-col gap-1 text-xs text-[var(--fg-muted)]">
            Name
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
              disabled={busy}
            />
          </label>
        )}

        <label className="flex flex-col gap-1 text-xs text-[var(--fg-muted)]">
          Email
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            disabled={busy}
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-[var(--fg-muted)]">
          Password
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            required
            minLength={8}
            disabled={busy}
          />
        </label>

        {error && (
          <div className="rounded-[var(--radius-sm)] border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-2.5 py-1.5 text-xs text-[var(--danger)]">
            {error}
          </div>
        )}

        <Button type="submit" tone="primary" size="lg" disabled={busy}>
          {busy ? "…" : mode === "signin" ? "Sign in" : "Create account"}
        </Button>

        <button
          type="button"
          onClick={() => {
            setError(null)
            setMode((m) => (m === "signin" ? "signup" : "signin"))
          }}
          className="text-left text-xs text-[var(--fg-muted)] hover:text-[var(--fg)]"
        >
          {mode === "signin"
            ? "Don't have an account? Create one"
            : "Already have an account? Sign in"}
        </button>
      </form>
    </div>
  )
}
