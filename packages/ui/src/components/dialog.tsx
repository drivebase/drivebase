import { Dialog as RadixDialog } from "radix-ui"
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
  type HTMLAttributes,
} from "react"
import { cn } from "@drivebase/ui/lib/cn"

export const Dialog = RadixDialog.Root
export const DialogTrigger = RadixDialog.Trigger
export const DialogClose = RadixDialog.Close
export const DialogPortal = RadixDialog.Portal

export const DialogOverlay = forwardRef<
  ElementRef<typeof RadixDialog.Overlay>,
  ComponentPropsWithoutRef<typeof RadixDialog.Overlay>
>(function DialogOverlay({ className, ...props }, ref) {
  return (
    <RadixDialog.Overlay
      ref={ref}
      className={cn(
        "db-dialog-overlay fixed inset-0 z-[2147483646] bg-[oklch(0_0_0_/_0.45)] backdrop-blur-sm",
        className
      )}
      {...props}
    />
  )
})

export const DialogContent = forwardRef<
  ElementRef<typeof RadixDialog.Content>,
  ComponentPropsWithoutRef<typeof RadixDialog.Content>
>(function DialogContent({ className, children, ...props }, ref) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <RadixDialog.Content
        ref={ref}
        className={cn(
          "db-dialog-content fixed left-1/2 top-1/2 z-[2147483647] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2",
          "focus:outline-none",
          className
        )}
        {...props}
      >
        <div className="db-dialog-surface glass-strong window-shadow overflow-hidden rounded-[var(--window-radius)] will-change-[transform,opacity]">
          {children}
        </div>
      </RadixDialog.Content>
    </DialogPortal>
  )
})

export function DialogHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1.5 px-5 pt-5", className)} {...props} />
}

export function DialogBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 py-4", className)} {...props} />
}

export function DialogFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-row justify-end gap-2 border-t border-[var(--border)] bg-[oklch(0_0_0/0.04)] px-5 py-4 dark:bg-[oklch(1_0_0/0.03)]",
        className,
      )}
      {...props}
    />
  )
}

export const DialogTitle = forwardRef<
  ElementRef<typeof RadixDialog.Title>,
  ComponentPropsWithoutRef<typeof RadixDialog.Title>
>(function DialogTitle({ className, ...props }, ref) {
  return (
    <RadixDialog.Title
      ref={ref}
      className={cn("text-base font-semibold leading-none text-[var(--fg)]", className)}
      {...props}
    />
  )
})

export const DialogDescription = forwardRef<
  ElementRef<typeof RadixDialog.Description>,
  ComponentPropsWithoutRef<typeof RadixDialog.Description>
>(function DialogDescription({ className, ...props }, ref) {
  return (
    <RadixDialog.Description
      ref={ref}
      className={cn("text-sm text-[var(--fg-muted)]", className)}
      {...props}
    />
  )
})
