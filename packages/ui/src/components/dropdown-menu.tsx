import { DropdownMenu as RadixMenu } from "radix-ui"
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from "react"
import { cn } from "@drivebase/ui/lib/cn"

export const DropdownMenu = RadixMenu.Root
export const DropdownMenuTrigger = RadixMenu.Trigger
export const DropdownMenuGroup = RadixMenu.Group
export const DropdownMenuRadioGroup = RadixMenu.RadioGroup
export const DropdownMenuSub = RadixMenu.Sub
export const DropdownMenuPortal = RadixMenu.Portal

export const DropdownMenuContent = forwardRef<
  ElementRef<typeof RadixMenu.Content>,
  ComponentPropsWithoutRef<typeof RadixMenu.Content>
>(function DropdownMenuContent({ className, sideOffset = 6, ...props }, ref) {
  return (
    <RadixMenu.Portal>
      <RadixMenu.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn(
          "z-[2147483647] min-w-[12rem] overflow-hidden rounded-[var(--radius-lg)] p-1",
          "glass-strong window-shadow text-sm text-[var(--fg)]",
          "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          className
        )}
        {...props}
      />
    </RadixMenu.Portal>
  )
})

const itemBase =
  "relative flex cursor-default select-none items-center gap-2 rounded-[var(--radius-sm)] " +
  "px-2 py-1.5 text-sm outline-none " +
  "data-[highlighted]:bg-[var(--bg-muted)] data-[highlighted]:text-[var(--fg)] " +
  "data-[disabled]:pointer-events-none data-[disabled]:opacity-50"

export const DropdownMenuItem = forwardRef<
  ElementRef<typeof RadixMenu.Item>,
  ComponentPropsWithoutRef<typeof RadixMenu.Item> & { inset?: boolean }
>(function DropdownMenuItem({ className, inset, ...props }, ref) {
  return (
    <RadixMenu.Item
      ref={ref}
      className={cn(itemBase, inset && "pl-7", className)}
      {...props}
    />
  )
})

export const DropdownMenuCheckboxItem = forwardRef<
  ElementRef<typeof RadixMenu.CheckboxItem>,
  ComponentPropsWithoutRef<typeof RadixMenu.CheckboxItem>
>(function DropdownMenuCheckboxItem({ className, children, ...props }, ref) {
  return (
    <RadixMenu.CheckboxItem ref={ref} className={cn(itemBase, "pl-7", className)} {...props}>
      <span className="absolute left-2 flex size-4 items-center justify-center">
        <RadixMenu.ItemIndicator>
          <CheckIcon />
        </RadixMenu.ItemIndicator>
      </span>
      {children}
    </RadixMenu.CheckboxItem>
  )
})

export const DropdownMenuRadioItem = forwardRef<
  ElementRef<typeof RadixMenu.RadioItem>,
  ComponentPropsWithoutRef<typeof RadixMenu.RadioItem>
>(function DropdownMenuRadioItem({ className, children, ...props }, ref) {
  return (
    <RadixMenu.RadioItem ref={ref} className={cn(itemBase, "pl-7", className)} {...props}>
      <span className="absolute left-2 flex size-4 items-center justify-center">
        <RadixMenu.ItemIndicator>
          <span className="size-1.5 rounded-full bg-[var(--fg)]" />
        </RadixMenu.ItemIndicator>
      </span>
      {children}
    </RadixMenu.RadioItem>
  )
})

export const DropdownMenuLabel = forwardRef<
  ElementRef<typeof RadixMenu.Label>,
  ComponentPropsWithoutRef<typeof RadixMenu.Label>
>(function DropdownMenuLabel({ className, ...props }, ref) {
  return (
    <RadixMenu.Label
      ref={ref}
      className={cn("px-2 py-1.5 text-xs font-medium text-[var(--fg-muted)]", className)}
      {...props}
    />
  )
})

export const DropdownMenuSeparator = forwardRef<
  ElementRef<typeof RadixMenu.Separator>,
  ComponentPropsWithoutRef<typeof RadixMenu.Separator>
>(function DropdownMenuSeparator({ className, ...props }, ref) {
  return (
    <RadixMenu.Separator
      ref={ref}
      className={cn("-mx-1 my-1 h-px bg-[var(--border)]", className)}
      {...props}
    />
  )
})

export function DropdownMenuShortcut({
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

export const DropdownMenuSubTrigger = forwardRef<
  ElementRef<typeof RadixMenu.SubTrigger>,
  ComponentPropsWithoutRef<typeof RadixMenu.SubTrigger> & { inset?: boolean }
>(function DropdownMenuSubTrigger({ className, inset, children, ...props }, ref) {
  return (
    <RadixMenu.SubTrigger
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
      <ChevronRightIcon className="ml-auto" />
    </RadixMenu.SubTrigger>
  )
})

export const DropdownMenuSubContent = forwardRef<
  ElementRef<typeof RadixMenu.SubContent>,
  ComponentPropsWithoutRef<typeof RadixMenu.SubContent>
>(function DropdownMenuSubContent({ className, ...props }, ref) {
  return (
    <RadixMenu.SubContent
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

function CheckIcon() {
  return (
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
  )
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
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
      className={className}
    >
      <path d="m6 4 4 4-4 4" />
    </svg>
  )
}
