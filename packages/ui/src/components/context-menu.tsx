import { ContextMenu as RadixContext } from "radix-ui"
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from "react"
import { cn } from "@drivebase/ui/lib/cn"

export const ContextMenu = RadixContext.Root
export const ContextMenuTrigger = RadixContext.Trigger
export const ContextMenuGroup = RadixContext.Group
export const ContextMenuRadioGroup = RadixContext.RadioGroup
export const ContextMenuSub = RadixContext.Sub
export const ContextMenuPortal = RadixContext.Portal

export const ContextMenuContent = forwardRef<
  ElementRef<typeof RadixContext.Content>,
  ComponentPropsWithoutRef<typeof RadixContext.Content>
>(function ContextMenuContent({ className, ...props }, ref) {
  return (
    <RadixContext.Portal>
      <RadixContext.Content
        ref={ref}
        className={cn(
          // Context-menu portals render at the document root while app windows
          // use persisted inline z-indices, so the menu layer must decisively
          // outrank window chrome or right-click appears to do nothing.
          "z-[2147483647] min-w-[12rem] overflow-hidden rounded-[var(--radius-lg)] p-1",
          "glass-strong window-shadow text-sm text-[var(--fg)]",
          "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          className
        )}
        {...props}
      />
    </RadixContext.Portal>
  )
})

const itemBase =
  "relative flex cursor-default select-none items-center gap-2 rounded-[var(--radius-sm)] " +
  "px-2 py-1.5 text-sm outline-none " +
  "data-[highlighted]:bg-[var(--bg-muted)] data-[highlighted]:text-[var(--fg)] " +
  "data-[disabled]:pointer-events-none data-[disabled]:opacity-50"

export const ContextMenuItem = forwardRef<
  ElementRef<typeof RadixContext.Item>,
  ComponentPropsWithoutRef<typeof RadixContext.Item> & { inset?: boolean }
>(function ContextMenuItem({ className, inset, ...props }, ref) {
  return (
    <RadixContext.Item
      ref={ref}
      className={cn(itemBase, inset && "pl-7", className)}
      {...props}
    />
  )
})

export const ContextMenuCheckboxItem = forwardRef<
  ElementRef<typeof RadixContext.CheckboxItem>,
  ComponentPropsWithoutRef<typeof RadixContext.CheckboxItem>
>(function ContextMenuCheckboxItem({ className, children, ...props }, ref) {
  return (
    <RadixContext.CheckboxItem ref={ref} className={cn(itemBase, "pl-7", className)} {...props}>
      <span className="absolute left-2 flex size-4 items-center justify-center">
        <RadixContext.ItemIndicator>
          <svg
            viewBox="0 0 16 16"
            width="12"
            height="12"
            aria-hidden
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 8.5 6.5 12 13 5" />
          </svg>
        </RadixContext.ItemIndicator>
      </span>
      {children}
    </RadixContext.CheckboxItem>
  )
})

export const ContextMenuLabel = forwardRef<
  ElementRef<typeof RadixContext.Label>,
  ComponentPropsWithoutRef<typeof RadixContext.Label>
>(function ContextMenuLabel({ className, ...props }, ref) {
  return (
    <RadixContext.Label
      ref={ref}
      className={cn("px-2 py-1.5 text-xs font-medium text-[var(--fg-muted)]", className)}
      {...props}
    />
  )
})

export const ContextMenuSeparator = forwardRef<
  ElementRef<typeof RadixContext.Separator>,
  ComponentPropsWithoutRef<typeof RadixContext.Separator>
>(function ContextMenuSeparator({ className, ...props }, ref) {
  return (
    <RadixContext.Separator
      ref={ref}
      className={cn("-mx-1 my-1 h-px bg-[var(--border)]", className)}
      {...props}
    />
  )
})

export function ContextMenuShortcut({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn("ml-auto text-xs tracking-widest text-[var(--fg-subtle)]", className)}
      {...props}
    />
  )
}

export const ContextMenuSubTrigger = forwardRef<
  ElementRef<typeof RadixContext.SubTrigger>,
  ComponentPropsWithoutRef<typeof RadixContext.SubTrigger> & { inset?: boolean }
>(function ContextMenuSubTrigger({ className, inset, children, ...props }, ref) {
  return (
    <RadixContext.SubTrigger
      ref={ref}
      className={cn(
        itemBase,
        "data-[state=open]:bg-[var(--bg-muted)]",
        inset && "pl-7",
        className
      )}
      {...props}
    >
      {children}
      <svg
        viewBox="0 0 16 16"
        width="12"
        height="12"
        aria-hidden
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="ml-auto"
      >
        <path d="m6 4 4 4-4 4" />
      </svg>
    </RadixContext.SubTrigger>
  )
})

export const ContextMenuSubContent = forwardRef<
  ElementRef<typeof RadixContext.SubContent>,
  ComponentPropsWithoutRef<typeof RadixContext.SubContent>
>(function ContextMenuSubContent({ className, ...props }, ref) {
  return (
    <RadixContext.SubContent
      ref={ref}
      className={cn(
        "z-[2147483647] min-w-[10rem] overflow-hidden rounded-[var(--radius-lg)] p-1",
        "glass-strong window-shadow text-sm",
        "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
        "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
        className
      )}
      {...props}
    />
  )
})
