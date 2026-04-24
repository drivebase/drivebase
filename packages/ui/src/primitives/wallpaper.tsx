import { type CSSProperties } from "react"
import { cn } from "@drivebase/ui/lib/cn"

export type WallpaperVariant = "topo" | "linen" | "gradient" | "solid"

export interface WallpaperProps {
  variant?: WallpaperVariant
  className?: string
  style?: CSSProperties
}

/**
 * Fullscreen desktop background. The four variants track the prototype's
 * wallpaper options. All variants read oklch tokens so dark mode is automatic.
 */
export function Wallpaper({ variant = "topo", className, style }: WallpaperProps) {
  return (
    <div
      aria-hidden
      data-variant={variant}
      className={cn(
        "pointer-events-none absolute inset-0 -z-10 overflow-hidden",
        className
      )}
      style={{ ...variantStyle(variant), ...style }}
    />
  )
}

function variantStyle(variant: WallpaperVariant): CSSProperties {
  switch (variant) {
    case "solid":
      return { background: "var(--wallpaper-solid)" }

    case "linen": {
      // Two-axis striped weave built from CSS gradients.
      const warp = "var(--wallpaper-linen-warp)"
      const base = "var(--bg-subtle)"
      return {
        background: [
          `repeating-linear-gradient(90deg, ${warp} 0 1px, transparent 1px 3px)`,
          `repeating-linear-gradient(0deg, ${warp} 0 1px, transparent 1px 3px)`,
          base,
        ].join(", "),
      }
    }

    case "gradient":
      return {
        background:
          "radial-gradient(ellipse at 15% 10%, var(--wallpaper-gradient-a) 0%, transparent 55%), radial-gradient(ellipse at 90% 85%, var(--wallpaper-gradient-b) 0%, transparent 60%), var(--bg)",
      }

    case "topo":
    default: {
      // Topographic concentric rings as an SVG data URI.
      const svg = encodeURIComponent(
        `<svg xmlns='http://www.w3.org/2000/svg' width='420' height='420' viewBox='0 0 420 420'>
          <g fill='none' stroke='currentColor' stroke-width='1'>
            <circle cx='210' cy='210' r='40' />
            <circle cx='210' cy='210' r='80' />
            <circle cx='210' cy='210' r='120' />
            <circle cx='210' cy='210' r='160' />
            <circle cx='210' cy='210' r='200' />
          </g>
        </svg>`
      )
      return {
        color: "var(--wallpaper-topo-ink)",
        background: [
          `radial-gradient(ellipse at center, transparent 0%, var(--bg) 85%)`,
          `url("data:image/svg+xml;utf8,${svg}")`,
          `var(--bg-subtle)`,
        ].join(", "),
        backgroundRepeat: "no-repeat, repeat, no-repeat",
        backgroundSize: "auto, 420px 420px, auto",
      }
    }
  }
}
