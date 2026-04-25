import { createFileRoute } from "@tanstack/react-router"
import {
  DrivebaseDataProvider,
  useViewer,
} from "@drivebase/data"
import {
  BootSplash,
  KernelProvider,
  LoginScreen,
  Shell,
  useBus,
  useKernelConfig,
} from "@drivebase/kernel"
import { useCallback, useEffect, useMemo } from "react"
import { apps } from "@/driveos/apps"
import { desktopMenus, getSystemMenuItems } from "@/driveos/menus"
import { UpdateBadge } from "@/driveos/update-badge"

export const Route = createFileRoute("/")({
  component: DriveOSRoot,
})

function DriveOSRoot() {
  return (
    <DrivebaseDataProvider>
      <DriveOSWithData />
    </DrivebaseDataProvider>
  )
}

function DriveOSWithData() {
  const { viewer, fetching, refetch } = useViewer()

  return (
    <KernelProvider
      apps={apps}
      config={{ brandName: "Drivebase", systemMenuItems: [], desktopMenus, MenuBarExtra: UpdateBadge }}
    >
      <DriveOSGate viewer={viewer} fetching={fetching} onRefetch={refetch} />
    </KernelProvider>
  )
}

interface DriveOSGateProps {
  viewer: { id: string; email: string; name: string } | null
  fetching: boolean
  onRefetch: () => void
}

function DriveOSGate({ viewer, fetching, onRefetch }: DriveOSGateProps) {
  const bus = useBus()
  const { setConfig } = useKernelConfig()

  const onOpenSettings = useCallback((section?: string) => {
    bus.emit("app.launch", { appId: "settings", payload: section ? { section } : undefined })
  }, [bus])

  const systemMenuItems = useMemo(
    () => getSystemMenuItems({ onSignOut: () => { onRefetch() }, onOpenSettings }),
    [onRefetch, onOpenSettings],
  )

  useEffect(() => {
    setConfig({ systemMenuItems })
  }, [setConfig, systemMenuItems])

  useEffect(() => {
    if (fetching) return
    if (viewer) {
      bus.emit("auth.login", { userId: viewer.id })
    } else {
      bus.emit("auth.logout", undefined)
    }
  }, [bus, viewer, fetching])

  if (fetching) return <BootSplash />
  if (!viewer) return <LoginScreen onAuthenticated={onRefetch} />
  return <Shell />
}
