import { create } from "zustand"
import { nanoid } from "nanoid"
import { persist, kernelPersist } from "./persist"

export interface WindowState {
  id: string
  appId: string
  title: string
  x: number
  y: number
  w: number
  h: number
  z: number
  minimized: boolean
  maximized: boolean
  /** true for a few ms while the open animation plays. */
  opening?: boolean
  /** true while the close animation plays before the window is removed. */
  closing?: boolean
  /** opaque per-window payload stashed by the app when it launched. */
  payload?: unknown
}

interface WindowStore {
  windows: Record<string, WindowState>
  order: string[]
  focusedId: string | null
  zCounter: number

  open: (input: {
    appId: string
    title: string
    w?: number
    h?: number
    x?: number
    y?: number
    id?: string
    payload?: unknown
  }) => string
  close: (id: string) => void
  focus: (id: string) => void
  minimize: (id: string) => void
  toggleMaximize: (id: string) => void
  move: (id: string, pos: { x: number; y: number }) => void
  resize: (id: string, size: { w: number; h: number }) => void
  setPayload: (id: string, payload: unknown) => void
  clearOpening: (id: string) => void
  remove: (id: string) => void
}

const DEFAULT_SIZE = { w: 820, h: 520 }

export const useWindowStore = create<WindowStore>()(
  persist(
    (set, get) => ({
      windows: {},
      order: [],
      focusedId: null,
      zCounter: 100,

      open: (input) => {
        const id = input.id ?? `${input.appId}:${nanoid(6)}`
        const zCounter = get().zCounter + 1
        const existingCount = get().order.length
        const offset = existingCount * 28
        const win: WindowState = {
          id,
          appId: input.appId,
          title: input.title,
          x: input.x ?? 200 + offset,
          y: input.y ?? 70 + offset,
          w: input.w ?? DEFAULT_SIZE.w,
          h: input.h ?? DEFAULT_SIZE.h,
          z: zCounter,
          minimized: false,
          maximized: false,
          opening: true,
          payload: input.payload,
        }
        set((s) => ({
          windows: { ...s.windows, [id]: win },
          order: [...s.order, id],
          focusedId: id,
          zCounter,
        }))
        return id
      },

      close: (id) =>
        set((s) => {
          const win = s.windows[id]
          if (!win || win.closing) return s
          return {
            windows: { ...s.windows, [id]: { ...win, closing: true } },
            focusedId: s.focusedId === id ? (s.order.filter((wid) => wid !== id).at(-1) ?? null) : s.focusedId,
          }
        }),

      focus: (id) =>
        set((s) => {
          const win = s.windows[id]
          if (!win || win.closing) return s
          const zCounter = s.zCounter + 1
          return {
            windows: { ...s.windows, [id]: { ...win, z: zCounter, minimized: false } },
            focusedId: id,
            zCounter,
          }
        }),

      minimize: (id) =>
        set((s) => {
          const win = s.windows[id]
          if (!win) return s
          return {
            windows: { ...s.windows, [id]: { ...win, minimized: true } },
            focusedId: s.focusedId === id ? null : s.focusedId,
          }
        }),

      toggleMaximize: (id) =>
        set((s) => {
          const win = s.windows[id]
          if (!win) return s
          return {
            windows: { ...s.windows, [id]: { ...win, maximized: !win.maximized } },
          }
        }),

      move: (id, pos) =>
        set((s) => {
          const win = s.windows[id]
          if (!win) return s
          return { windows: { ...s.windows, [id]: { ...win, ...pos } } }
        }),

      resize: (id, size) =>
        set((s) => {
          const win = s.windows[id]
          if (!win) return s
          return { windows: { ...s.windows, [id]: { ...win, ...size } } }
        }),

      setPayload: (id, payload) =>
        set((s) => {
          const win = s.windows[id]
          if (!win) return s
          if (payloadEqual(win.payload, payload)) return s
          return { windows: { ...s.windows, [id]: { ...win, payload } } }
        }),

      clearOpening: (id) =>
        set((s) => {
          const win = s.windows[id]
          if (!win) return s
          const { opening: _ignored, ...rest } = win
          void _ignored
          return { windows: { ...s.windows, [id]: rest as WindowState } }
        }),

      remove: (id) =>
        set((s) => {
          const { [id]: _removed, ...rest } = s.windows
          void _removed
          const order = s.order.filter((wid) => wid !== id)
          return {
            windows: rest,
            order,
            focusedId: s.focusedId,
          }
        }),
    }),
    kernelPersist<WindowStore>("windows"),
  ),
)

function payloadEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (typeof a !== typeof b) return false
  if (a == null || b == null) return false
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    return a.every((value, index) => payloadEqual(value, b[index]))
  }
  if (typeof a === "object" && typeof b === "object") {
    const aEntries = Object.entries(a as Record<string, unknown>)
    const bEntries = Object.entries(b as Record<string, unknown>)
    if (aEntries.length !== bEntries.length) return false
    return aEntries.every(([key, value]) => payloadEqual(value, (b as Record<string, unknown>)[key]))
  }
  return false
}
