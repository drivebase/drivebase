import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react"
import { Slot } from "radix-ui"
import { cn } from "@drivebase/ui/lib/cn"

export type ButtonTone = "default" | "primary" | "ghost" | "outline" | "danger" | "link"
export type ButtonSize = "xs" | "sm" | "md" | "lg" | "icon-sm" | "icon" | "icon-lg"

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: ButtonTone
  size?: ButtonSize
  /** Render as the child element (polymorphic — via Radix Slot). */
  asChild?: boolean
  iconStart?: ReactNode
  iconEnd?: ReactNode
}

const base =
  "relative inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap font-medium " +
  "select-none transition-[background,color,border-color,box-shadow,transform] " +
  "disabled:pointer-events-none disabled:opacity-50 " +
  "aria-disabled:pointer-events-none aria-disabled:opacity-50 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"

const toneStyles: Record<ButtonTone, string> = {
  default:
    "bg-[var(--bg-subtle)] text-[var(--fg)] border border-[var(--border)] hover:bg-[var(--bg-muted)]",
  primary:
    "bg-[var(--accent)] text-[var(--accent-fg)] hover:brightness-[1.04] active:brightness-[0.98]",
  ghost:
    "bg-transparent text-[var(--fg)] hover:bg-[var(--bg-muted)] aria-expanded:bg-[var(--bg-muted)]",
  outline:
    "bg-transparent text-[var(--fg)] border border-[var(--border)] hover:bg-[var(--bg-subtle)]",
  danger:
    "bg-[var(--danger)] text-[var(--danger-fg)] hover:brightness-[1.04] active:brightness-[0.98]",
  link: "bg-transparent text-[var(--accent)] underline-offset-4 hover:underline h-auto p-0",
}

const sizeStyles: Record<ButtonSize, string> = {
  xs: "h-6 px-2 text-xs rounded-[var(--radius-sm)]",
  sm: "h-7 px-2.5 text-[13px] rounded-[var(--radius-sm)]",
  md: "h-8 px-3 text-sm rounded-[var(--radius-md)]",
  lg: "h-10 px-4 text-sm rounded-[var(--radius-md)]",
  "icon-sm": "size-7 rounded-[var(--radius-sm)]",
  icon: "size-8 rounded-[var(--radius-md)]",
  "icon-lg": "size-10 rounded-[var(--radius-md)]",
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    tone = "default",
    size = "md",
    asChild = false,
    className,
    iconStart,
    iconEnd,
    children,
    ...props
  },
  ref
) {
  const Comp = asChild ? Slot.Root : "button"
  return (
    <Comp
      ref={ref}
      data-tone={tone}
      data-size={size}
      className={cn(base, toneStyles[tone], sizeStyles[size], className)}
      {...props}
    >
      {iconStart}
      {children}
      {iconEnd}
    </Comp>
  )
})
