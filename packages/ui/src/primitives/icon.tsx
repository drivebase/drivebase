import type { LucideIcon } from "lucide-react"
import type { ComponentPropsWithoutRef, ComponentType } from "react"
import { cn } from "@drivebase/ui/lib/cn"

export type IconSpec =
  | { kind: "lucide"; component: LucideIcon }
  | { kind: "iconify"; name: string }
  | { kind: "custom"; component: ComponentType<{ size?: number; className?: string }> }
  | { kind: "image"; src: string }

export interface IconProps extends ComponentPropsWithoutRef<"span"> {
  spec: IconSpec
  /** Pixel size for the rendered icon. Defaults to 16. */
  size?: number
}

/**
 * Renders an icon from either lucide-react (as a React component), the
 * iconify tailwind v4 plugin (as a `icon-[set--name]` class), or a custom
 * SVG component. The iconify plugin must be configured in the consuming
 * app's Tailwind setup — we only emit the class name.
 */
export function Icon({ spec, size = 16, className, style, ...props }: IconProps) {
  if (spec.kind === "lucide") {
    const LucideComponent = spec.component
    return (
      <span
        {...props}
        className={cn("inline-flex items-center justify-center", className)}
        style={style}
      >
        <LucideComponent size={size} />
      </span>
    )
  }

  if (spec.kind === "custom") {
    const CustomComponent = spec.component
    return (
      <span
        {...props}
        className={cn("inline-flex items-center justify-center", className)}
        style={style}
      >
        <CustomComponent size={size} />
      </span>
    )
  }

  if (spec.kind === "image") {
    return (
      <img
        {...props}
        src={spec.src}
        alt=""
        width={size}
        height={size}
        aria-hidden={props["aria-hidden"] ?? true}
        className={cn("inline-block object-contain", className)}
        style={style}
      />
    )
  }

  const iconifyClass = `icon-[${spec.name}]`
  return (
    <span
      {...props}
      aria-hidden={props["aria-hidden"] ?? true}
      className={cn("inline-block", iconifyClass, className)}
      style={{ width: size, height: size, ...style }}
    />
  )
}
