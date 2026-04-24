import { useEffect, type ReactNode } from "react"
import { ConfirmDialogProvider } from "@drivebase/ui/components/alert-dialog"
import { BusProvider } from "./bus/context"
import type { KernelBus } from "./bus/event-bus"
import { useAppRegistryStore } from "./stores/app-registry-store"
import type { AppManifest } from "./registry/app-manifest"
import { useBootSequence } from "./boot/boot-sequence"
import { KernelConfigProvider, type KernelConfig } from "./config"

export interface KernelProviderProps {
  apps?: AppManifest[]
  bus?: KernelBus
  config?: Partial<KernelConfig>
  children: ReactNode
}

/**
 * Top-level provider. Injects the bus, kernel config, registers apps passed
 * in, and kicks off the boot sequence. Wrap `<Shell>` in this.
 */
export function KernelProvider({ apps, bus, config, children }: KernelProviderProps) {
  return (
    <BusProvider bus={bus}>
      <KernelConfigProvider config={config}>
        <ConfirmDialogProvider>
          <KernelBootstrap apps={apps}>{children}</KernelBootstrap>
        </ConfirmDialogProvider>
      </KernelConfigProvider>
    </BusProvider>
  )
}

function KernelBootstrap({ apps, children }: { apps?: AppManifest[]; children: ReactNode }) {
  useEffect(() => {
    if (!apps) return
    const register = useAppRegistryStore.getState().register
    for (const a of apps) register(a)
  }, [apps])

  useBootSequence()

  return <>{children}</>
}
