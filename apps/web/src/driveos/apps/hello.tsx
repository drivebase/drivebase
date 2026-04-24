import { Sparkles } from "lucide-react"
import type { AppManifest, AppProps } from "@drivebase/kernel"
import { useSession, useViewer } from "@drivebase/data"

function HelloApp({ windowId }: AppProps) {
  const session = useSession()
  const { viewer, fetching, error } = useViewer()

  return (
    <div className="flex h-full flex-col gap-3 p-6 text-[var(--fg)]">
      <h2 className="text-lg font-semibold">Hello from DriveOS</h2>
      <p className="text-sm text-[var(--fg-muted)]">
        Proves the data layer is wired: Better Auth session + GraphQL viewer query.
      </p>

      <section className="rounded-md border border-[var(--border)] p-3 text-sm">
        <div className="font-medium">Better Auth session</div>
        {session.isPending ? (
          <div className="text-[var(--fg-muted)]">loading…</div>
        ) : session.data?.user ? (
          <div className="text-[var(--fg-muted)]">
            {session.data.user.email} ({session.data.user.name})
          </div>
        ) : (
          <div className="text-[var(--fg-muted)]">not signed in</div>
        )}
      </section>

      <section className="rounded-md border border-[var(--border)] p-3 text-sm">
        <div className="font-medium">GraphQL viewer</div>
        {fetching ? (
          <div className="text-[var(--fg-muted)]">fetching…</div>
        ) : error ? (
          <div className="text-[var(--danger)]">{error.message}</div>
        ) : viewer ? (
          <div className="text-[var(--fg-muted)]">
            {viewer.email} — id: <span className="font-mono text-xs">{viewer.id}</span>
          </div>
        ) : (
          <div className="text-[var(--fg-muted)]">null (unauthenticated)</div>
        )}
      </section>

      <p className="mt-auto text-xs font-mono text-[var(--fg-subtle)]">windowId: {windowId}</p>
    </div>
  )
}

export const helloManifest: AppManifest = {
  id: "hello",
  name: "Hello",
  version: "0.0.1",
  icon: { kind: "lucide", component: Sparkles },
  defaultWindowSize: { w: 520, h: 420 },
  component: HelloApp,
  shortcuts: [
    {
      id: "default",
      label: "Hello",
    },
  ],
}
