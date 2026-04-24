import { type HTMLAttributes } from "react"
import { cn } from "@drivebase/ui/lib/cn"

export function Kbd({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center gap-0.5",
        "rounded-[var(--radius-sm)] border border-[var(--border)]",
        "bg-[var(--bg-subtle)] px-1.5 font-mono text-[11px] font-medium",
        "text-[var(--fg-muted)] leading-none",
        className
      )}
      {...props}
    />
  )
}
