import { useEffect, useState, type ReactNode } from "react"
import { useSession } from "@drivebase/data"
import { useBootStore } from "../stores/boot-store"
import { useAuthStore } from "../stores/auth-store"
import { useBus } from "../bus/context"
import { BootSplash } from "../shell/boot-splash"
import { LoginScreen } from "./login-screen"
import { LockScreen } from "./lock-screen"

/**
 * Boot-time auth gate.
 *   - while session is loading → BootSplash
 *   - no user → LoginScreen (shell hidden)
 *   - user + locked → render shell BUT overlay LockScreen
 *   - user + unlocked → render shell
 *
 * Drives `bootStore.phase` so the rest of the kernel (LoadingBar, etc.) can
 * react without duplicating the logic.
 */
export function SessionGate({ children }: { children: ReactNode }) {
  const session = useSession()
  const locked = useAuthStore((s) => s.locked)
  const setPhase = useBootStore((s) => s.setPhase)
  const bus = useBus()
  const [minSplashElapsed, setMinSplashElapsed] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMinSplashElapsed(true)
    }, 400)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (session.isPending || !minSplashElapsed) {
      setPhase("splash")
      return
    }
    if (!session.data?.user) {
      setPhase("auth")
      return
    }
    if (locked) {
      setPhase("locked")
      return
    }
    setPhase("ready")
  }, [minSplashElapsed, session.isPending, session.data?.user, locked, setPhase])

  useEffect(() => {
    if (session.isPending) return
    if (session.data?.user) {
      bus.emit("auth.login", { userId: session.data.user.id })
    } else {
      bus.emit("auth.logout", undefined)
    }
  }, [bus, session.isPending, session.data?.user])

  if (session.isPending || !minSplashElapsed) return <BootSplash />
  if (!session.data?.user) return <LoginScreen />
  return (
    <>
      {children}
      {locked && <LockScreen />}
    </>
  )
}
