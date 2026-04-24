import { type ComponentPropsWithoutRef } from "react"
import { cn } from "@drivebase/ui/lib/cn"

export interface GlassProps extends ComponentPropsWithoutRef<"div"> {
  /** Strong variant uses higher opacity — better for menubar/dock. */
  tone?: "default" | "strong"
}

/**
 * Semi-transparent backdrop-blur surface. Relies on the `glass` / `glass-strong`
 * utility classes defined in tokens/layers.css.
 */
export function Glass({ tone = "default", className, ...props }: GlassProps) {
  return (
    <div
      {...props}
      className={cn(tone === "strong" ? "glass-strong" : "glass", className)}
    />
  )
}
