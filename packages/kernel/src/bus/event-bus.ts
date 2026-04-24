import mitt, { type Emitter } from "mitt"
import type { KernelEventMap } from "./types"

export type KernelBus = Emitter<KernelEventMap>

export function createBus(): KernelBus {
  return mitt<KernelEventMap>()
}
