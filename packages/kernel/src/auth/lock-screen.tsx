import { useState, type FormEvent } from "react"
import { signIn, useSession } from "@drivebase/data"
import { Button } from "@drivebase/ui/components/button"
import { Input } from "@drivebase/ui/components/input"
import { useAuthStore } from "../stores/auth-store"
import { useBus } from "../bus/context"

/**
 * Lock overlay. Unlike LoginScreen, the shell stays mounted underneath so
 * window state is preserved. User re-enters their password; on success we
 * clear the locked flag and emit `auth.unlock`.
 */
export function LockScreen() {
  const session = useSession()
  const unlock = useAuthStore((s) => s.unlock)
  const bus = useBus()
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const email = session.data?.user.email ?? ""
  const name = session.data?.user.name ?? email

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email) return
    setError(null)
    setBusy(true)
    try {
      const result = await signIn.email({ email, password })
      if (result.error) {
        setError(result.error.message ?? "Incorrect password")
      } else {
        setPassword("")
        unlock()
        bus.emit("auth.unlock", undefined)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[2500] grid place-items-center bg-[var(--bg)]/72 text-[var(--fg)] backdrop-blur-xl">
      <form
        onSubmit={onSubmit}
        className="glass-strong window-shadow flex w-full max-w-xs flex-col gap-4 rounded-[var(--window-radius)] border border-[var(--border)] p-6 text-center text-[var(--fg)]"
      >
        <img
          src="/circle.svg"
          alt=""
          aria-hidden="true"
          className="mx-auto size-14 object-contain"
        />
        <div>
          <div className="text-base font-semibold">{name}</div>
          <div className="text-xs text-[var(--fg-muted)]">{email}</div>
        </div>

        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoFocus
          disabled={busy}
          required
        />

        {error && <div className="text-xs text-[var(--danger)]">{error}</div>}

        <Button type="submit" tone="primary" size="md" disabled={busy}>
          {busy ? "…" : "Unlock"}
        </Button>
      </form>
    </div>
  )
}
