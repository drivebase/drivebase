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
} from "@drivebase/kernel"
import { useEffect, useMemo } from "react"
import { apps } from "@/driveos/apps"
import { desktopMenus, getSystemMenuItems } from "@/driveos/menus"

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

  const systemMenuItems = useMemo(
    () =>
      getSystemMenuItems({
        onSignOut: () => { refetch() },
      }),
    [refetch],
  )

  return (
    <KernelProvider
      apps={apps}
      config={{ brandName: "Drivebase", systemMenuItems, desktopMenus }}
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
