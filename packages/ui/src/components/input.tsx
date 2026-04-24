import { forwardRef, type InputHTMLAttributes } from "react"
import { cn } from "@drivebase/ui/lib/cn"

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        "flex h-8 w-full rounded-[var(--radius-md)] border border-[var(--border)]",
        "bg-[var(--bg-subtle)] px-2.5 text-sm text-[var(--fg)]",
        "placeholder:text-[var(--fg-subtle)]",
        "transition-[border-color,box-shadow]",
        "focus-visible:outline-none focus-visible:border-[var(--ring)]",
        "focus-visible:shadow-[0_0_0_3px_oklch(from_var(--ring)_l_c_h_/_0.2)]",
        "disabled:opacity-50 disabled:pointer-events-none",
        "aria-[invalid=true]:border-[var(--danger)]",
        "aria-[invalid=true]:shadow-[0_0_0_3px_oklch(from_var(--danger)_l_c_h_/_0.2)]",
        className
      )}
      {...props}
    />
  )
})
