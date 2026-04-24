import { Check, ChevronDown, ChevronUp } from "lucide-react"
import { Select as RadixSelect } from "radix-ui"
import type { ComponentPropsWithoutRef } from "react"
import { cn } from "@drivebase/ui/lib/cn"

export const Select = RadixSelect.Root
export const SelectValue = RadixSelect.Value
export const SelectGroup = RadixSelect.Group

export function SelectTrigger({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<typeof RadixSelect.Trigger>) {
  return (
    <RadixSelect.Trigger
      className={cn(
        "flex h-8 w-full items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[var(--border)]",
        "bg-[var(--bg-subtle)] px-2.5 text-sm text-[var(--fg)]",
        "transition-[border-color,box-shadow] outline-none",
        "focus-visible:border-[var(--ring)]",
        "focus-visible:shadow-[0_0_0_3px_oklch(from_var(--ring)_l_c_h_/_0.2)]",
        "disabled:pointer-events-none disabled:opacity-50",
        "[&>span]:truncate [&_[data-placeholder]]:text-[var(--fg-subtle)]",
        className,
      )}
      {...props}
    >
      {children}
      <RadixSelect.Icon className="shrink-0 text-[var(--fg-muted)]">
        <ChevronDown size={14} />
      </RadixSelect.Icon>
    </RadixSelect.Trigger>
  )
}

export function SelectContent({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<typeof RadixSelect.Content>) {
  return (
    <RadixSelect.Portal>
      <RadixSelect.Content
        className={cn(
          "z-[2147483647] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)]",
          "glass-strong window-shadow text-sm text-[var(--fg)]",
          "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          className,
        )}
        {...props}
      >
        <RadixSelect.ScrollUpButton className="flex h-6 cursor-default items-center justify-center text-[var(--fg-muted)]">
          <ChevronUp size={14} />
        </RadixSelect.ScrollUpButton>
        <RadixSelect.Viewport className="max-h-64 p-1">
          {children}
        </RadixSelect.Viewport>
        <RadixSelect.ScrollDownButton className="flex h-6 cursor-default items-center justify-center text-[var(--fg-muted)]">
          <ChevronDown size={14} />
        </RadixSelect.ScrollDownButton>
      </RadixSelect.Content>
    </RadixSelect.Portal>
  )
}

export function SelectItem({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<typeof RadixSelect.Item>) {
  return (
    <RadixSelect.Item
      className={cn(
        "relative flex cursor-default select-none items-center rounded-[var(--radius-sm)] py-1.5 pl-8 pr-2.5 text-sm text-[var(--fg)] outline-none",
        "data-[highlighted]:bg-[var(--bg-subtle)] data-[highlighted]:text-[var(--fg)]",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    >
      <span className="absolute left-2 inline-flex size-4 items-center justify-center text-[var(--accent)]">
        <RadixSelect.ItemIndicator>
          <Check size={14} />
        </RadixSelect.ItemIndicator>
      </span>
      <RadixSelect.ItemText>{children}</RadixSelect.ItemText>
    </RadixSelect.Item>
  )
}

export function SelectLabel({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof RadixSelect.Label>) {
  return (
    <RadixSelect.Label
      className={cn("px-2 py-1 text-[11px] font-medium text-[var(--fg-muted)]", className)}
      {...props}
    />
  )
}

export function SelectSeparator({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof RadixSelect.Separator>) {
  return (
    <RadixSelect.Separator
      className={cn("my-1 h-px bg-[var(--border)]", className)}
      {...props}
    />
  )
}
