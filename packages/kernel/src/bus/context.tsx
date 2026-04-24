import { createContext, useContext, useMemo, type ReactNode } from "react"
import { createBus, type KernelBus } from "./event-bus"

const BusContext = createContext<KernelBus | null>(null)

export function BusProvider({ bus, children }: { bus?: KernelBus; children: ReactNode }) {
  const value = useMemo(() => bus ?? createBus(), [bus])
  return <BusContext.Provider value={value}>{children}</BusContext.Provider>
}

export function useBus(): KernelBus {
  const bus = useContext(BusContext)
  if (!bus) throw new Error("useBus must be used inside <BusProvider>")
  return bus
}
