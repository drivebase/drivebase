import { Progress as RadixProgress } from "radix-ui"
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from "react"
import { cn } from "@drivebase/ui/lib/cn"

export interface ProgressProps
  extends ComponentPropsWithoutRef<typeof RadixProgress.Root> {
  /** 0–100. Pass `null` (or omit) for an indeterminate bar. */
  value?: number | null
}

export const Progress = forwardRef<
  ElementRef<typeof RadixProgress.Root>,
  ProgressProps
>(function Progress({ className, value, ...props }, ref) {
  const isIndeterminate = value == null
  return (
    <RadixProgress.Root
      ref={ref}
      value={isIndeterminate ? undefined : value}
      className={cn(
        "relative h-1 w-full overflow-hidden rounded-full bg-[var(--bg-muted)]",
        className
      )}
      {...props}
    >
      <RadixProgress.Indicator
        className={cn(
          "h-full bg-[var(--accent)] transition-transform duration-200 ease-out",
          isIndeterminate && "animate-[progress-indeterminate_1.4s_ease-in-out_infinite]"
        )}
        style={
          isIndeterminate
            ? { transform: "translateX(-100%)", width: "40%" }
            : { transform: `translateX(-${100 - (value ?? 0)}%)` }
        }
      />
      <style>{`@keyframes progress-indeterminate {
        0% { transform: translateX(-100%); }
        50% { transform: translateX(40%); }
        100% { transform: translateX(260%); }
      }`}</style>
    </RadixProgress.Root>
  )
})
