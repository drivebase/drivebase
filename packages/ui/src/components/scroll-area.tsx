import { ScrollArea as RadixScrollArea } from "radix-ui"
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from "react"
import { cn } from "@drivebase/ui/lib/cn"

export const ScrollArea = forwardRef<
  ElementRef<typeof RadixScrollArea.Root>,
  ComponentPropsWithoutRef<typeof RadixScrollArea.Root>
>(function ScrollArea({ className, children, ...props }, ref) {
  return (
    <RadixScrollArea.Root
      ref={ref}
      className={cn("relative overflow-hidden", className)}
      {...props}
    >
      <RadixScrollArea.Viewport className="h-full w-full rounded-[inherit]">
        {children}
      </RadixScrollArea.Viewport>
      <ScrollBar />
      <RadixScrollArea.Corner />
    </RadixScrollArea.Root>
  )
})

export const ScrollBar = forwardRef<
  ElementRef<typeof RadixScrollArea.Scrollbar>,
  ComponentPropsWithoutRef<typeof RadixScrollArea.Scrollbar>
>(function ScrollBar({ className, orientation = "vertical", ...props }, ref) {
  return (
    <RadixScrollArea.Scrollbar
      ref={ref}
      orientation={orientation}
      className={cn(
        "flex touch-none select-none p-0.5 transition-colors",
        orientation === "vertical" && "h-full w-2 border-l border-l-transparent",
        orientation === "horizontal" && "h-2 w-full flex-col border-t border-t-transparent",
        className
      )}
      {...props}
    >
      <RadixScrollArea.Thumb
        className={cn(
          "relative flex-1 rounded-full",
          "bg-[var(--fg-subtle)]/40 hover:bg-[var(--fg-muted)]/60"
        )}
      />
    </RadixScrollArea.Scrollbar>
  )
})
