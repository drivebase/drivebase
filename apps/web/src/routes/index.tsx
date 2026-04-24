import { createFileRoute, useRouter } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { getRequestHeaders } from "@tanstack/react-start/server"
import { KernelProvider, Shell, LoginScreen, BootSplash, useBus } from "@drivebase/kernel"
import { DrivebaseDataProvider, gqlUrl } from "@drivebase/data"
import { useEffect, useMemo, useState } from "react"
import { apps } from "@/driveos/apps"
import { desktopMenus, getSystemMenuItems } from "@/driveos/menus"

interface ViewerPayload {
  viewer: {
    id: string
    email: string
    name: string
  } | null
}

const getInitialViewer = createServerFn({ method: "GET" }).handler(async () => {
  const cookie = getRequestHeaders().get("cookie") ?? ""
  const res = await fetch(gqlUrl(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie,
    },
    body: JSON.stringify({
      query: `query Viewer {
        viewer {
          id
          email
          name
        }
      }`,
    }),
  })

  if (!res.ok) {
    return { viewer: null } satisfies ViewerPayload
  }

  const json = (await res.json()) as {
    data?: ViewerPayload
  }

  return json.data ?? { viewer: null }
})

export const Route = createFileRoute("/")({
  loader: async () => {
    const [viewer] = await Promise.all([
      getInitialViewer(),
      new Promise((resolve) => setTimeout(resolve, 400)),
    ])
    return viewer
  },
  pendingComponent: BootSplash,
  pendingMs: 0,
  pendingMinMs: 400,
  component: DriveOS,
})

function DriveOS() {
  const router = useRouter()
  const systemMenuItems = useMemo(
    () =>
      getSystemMenuItems({
        onSignOut: async () => {
          await router.invalidate()
        },
      }),
    [router],
  )

  return (
    <DrivebaseDataProvider>
      <KernelProvider
        apps={apps}
        config={{ brandName: "Drivebase", systemMenuItems, desktopMenus }}
      >
        <DriveOSGate />
      </KernelProvider>
    </DrivebaseDataProvider>
  )
}

function DriveOSGate() {
  const loaderData = Route.useLoaderData()
  const router = useRouter()
  const bus = useBus()
  const [hydrated, setHydrated] = useState(false)
  const user = loaderData?.viewer ?? null

  useEffect(() => {
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    if (user) {
      bus.emit("auth.login", { userId: user.id })
      return
    }
    bus.emit("auth.logout", undefined)
  }, [bus, hydrated, user])

  if (!hydrated) return <BootSplash />
  if (user) return <Shell />
  return <LoginScreen onAuthenticated={() => router.invalidate()} />
}
