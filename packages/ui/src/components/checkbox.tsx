import { Checkbox as RadixCheckbox } from "radix-ui"
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from "react"
import { cn } from "@drivebase/ui/lib/cn"

export const Checkbox = forwardRef<
  ElementRef<typeof RadixCheckbox.Root>,
  ComponentPropsWithoutRef<typeof RadixCheckbox.Root>
>(function Checkbox({ className, ...props }, ref) {
  return (
    <RadixCheckbox.Root
      ref={ref}
      className={cn(
        "peer size-4 shrink-0 rounded-[4px] border border-[var(--border-strong)]",
        "bg-[var(--bg-subtle)] transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]/60",
        "data-[state=checked]:border-[var(--accent)] data-[state=checked]:bg-[var(--accent)]",
        "data-[state=checked]:text-[var(--accent-fg)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <RadixCheckbox.Indicator className="flex items-center justify-center">
        <svg
          viewBox="0 0 16 16"
          width="12"
          height="12"
          aria-hidden
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 8.5 6.5 12 13 5" />
        </svg>
      </RadixCheckbox.Indicator>
    </RadixCheckbox.Root>
  )
})
