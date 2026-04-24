import { create } from "zustand"

export type WindowCommandHandler = () => void | Promise<void>

const commandsRegistry = new Map<string, Record<string, WindowCommandHandler>>()

interface WindowCommandStore {
  setCommands: (windowId: string, commands: Record<string, WindowCommandHandler>) => void
  clearCommands: (windowId: string) => void
  invoke: (windowId: string, commandId: string) => void | Promise<void>
}

export const useWindowCommandStore = create<WindowCommandStore>(() => ({
  setCommands: (windowId, commands) =>
    void commandsRegistry.set(windowId, commands),
  clearCommands: (windowId) =>
    void commandsRegistry.delete(windowId),
  invoke: async (windowId, commandId) => {
    const command = commandsRegistry.get(windowId)?.[commandId]
    if (!command) return
    await command()
  },
}))
