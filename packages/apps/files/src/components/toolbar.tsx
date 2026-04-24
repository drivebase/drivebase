import { cn } from "@drivebase/ui/lib/cn"
import {
  ArrowLeft,
  ArrowRight,
  ClipboardPaste,
  Copy,
  Trash2,
  FolderPlus,
  LayoutGrid,
  List as ListIcon,
  RefreshCw,
  Search,
  Upload,
} from "lucide-react"
import type { ChangeEventHandler } from "react"

export type ViewMode = "grid" | "list"

interface ToolbarAction {
  id: string
  label: string
  icon: React.ReactNode
  onClick: () => void
  hidden?: boolean
  disabled?: boolean
  primary?: boolean
}

export interface ToolbarProps {
  view: ViewMode
  onViewChange: (v: ViewMode) => void
  query: string
  onQueryChange: (q: string) => void
  onBack: () => void
  canGoBack: boolean
  onUpload: () => void
  onNewFolder: () => void
  onSync: () => void
  onCopySelection: () => void
  onPaste: () => void
  onDeleteSelection: () => void
  syncing: boolean
  selectionCount: number
  canPaste: boolean
  clipboardCount: number
}

/**
 * Left → right: back/forward, divider, primary actions (upload / new folder
 * / sync), flexible search, view toggle pinned to the end. Heights and
 * paddings follow the shell's 28–30px control rhythm.
 */
export function Toolbar({
  view,
  onViewChange,
  query,
  onQueryChange,
  onBack,
  canGoBack,
  onUpload,
  onNewFolder,
  onSync,
  onCopySelection,
  onPaste,
  onDeleteSelection,
  syncing,
  selectionCount,
  canPaste,
  clipboardCount,
}: ToolbarProps) {
  const handleQuery: ChangeEventHandler<HTMLInputElement> = (e) =>
    onQueryChange(e.target.value)
  const hasSelection = selectionCount > 0
  const actions: ToolbarAction[] = [
    {
      id: "upload",
      label: "Upload",
      icon: <Upload size={13} />,
      onClick: onUpload,
      primary: true,
    },
    {
      id: "copy",
      label: "Copy",
      icon: <Copy size={13} />,
      onClick: onCopySelection,
      hidden: !hasSelection,
    },
    {
      id: "new-folder",
      label: "New folder",
      icon: <FolderPlus size={13} />,
      onClick: onNewFolder,
      hidden: hasSelection,
    },
    {
      id: "sync",
      label: "Sync",
      icon: <RefreshCw size={13} className={cn(syncing && "animate-spin")} />,
      onClick: onSync,
      hidden: hasSelection,
      disabled: syncing,
    },
    {
      id: "paste",
      label: `Paste (${clipboardCount})`,
      icon: <ClipboardPaste size={13} />,
      onClick: onPaste,
      hidden: !canPaste || hasSelection,
    },
    {
      id: "delete",
      label: "Delete",
      icon: <Trash2 size={13} />,
      onClick: onDeleteSelection,
      hidden: !hasSelection,
    },
  ]

  return (
    <div className="flex h-[42px] shrink-0 items-center gap-1.5 border-b border-[var(--border)] bg-[var(--glass-bg-strong)] px-2.5">
      <TbBtn onClick={onBack} disabled={!canGoBack} title="Back" aria-label="Back">
        <ArrowLeft size={13} />
      </TbBtn>
      <TbBtn disabled title="Forward" aria-label="Forward">
        <ArrowRight size={13} />
      </TbBtn>

      <div className="mx-1 h-4 w-px bg-[var(--border)]" />

      {actions.filter((action) => !action.hidden).map((action) => (
        <TbBtn
          key={action.id}
          primary={action.primary}
          onClick={action.onClick}
          disabled={action.disabled}
          title={action.label}
        >
          {action.icon}
          <span>{action.label}</span>
        </TbBtn>
      ))}

      <div className="ml-auto flex min-w-[180px] items-center gap-1.5 rounded-[3px] bg-[oklch(0_0_0/0.04)] px-2.5 dark:bg-[oklch(1_0_0/0.06)]">
        <Search size={13} className="shrink-0 text-[var(--fg-subtle)]" />
        <input
          value={query}
          onChange={handleQuery}
          placeholder="Search this drive…"
          className="h-[26px] w-full bg-transparent text-xs text-[var(--fg)] placeholder:text-[var(--fg-subtle)] focus:outline-none"
        />
      </div>

      <div className="flex items-center gap-0 rounded-[3px] bg-[oklch(0_0_0/0.04)] p-0.5 dark:bg-[oklch(1_0_0/0.06)]">
        <ViewBtn active={view === "grid"} onClick={() => onViewChange("grid")} label="Grid">
          <LayoutGrid size={12} />
        </ViewBtn>
        <ViewBtn active={view === "list"} onClick={() => onViewChange("list")} label="List">
          <ListIcon size={12} />
        </ViewBtn>
      </div>
    </div>
  )
}

function TbBtn({
  children,
  primary,
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean }) {
  return (
    <button
      type="button"
      {...rest}
      className={cn(
        "flex h-[26px] shrink-0 items-center gap-1.5 rounded-[3px] px-2.5 text-xs transition-colors",
        "disabled:pointer-events-none disabled:opacity-40",
        primary
          ? "bg-[var(--fg)] text-[var(--bg)] hover:bg-[color-mix(in_oklch,var(--fg)_92%,transparent)]"
          : "text-[var(--fg-muted)] hover:bg-[oklch(0_0_0/0.05)] hover:text-[var(--fg)] dark:hover:bg-[oklch(1_0_0/0.08)]",
        className,
      )}
    >
      {children}
    </button>
  )
}

function ViewBtn({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean
  onClick: () => void
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={cn(
        "grid h-5 w-6 place-items-center rounded-[2px] transition-colors",
        active
          ? "bg-[var(--bg)] text-[var(--fg)] shadow-[0_1px_2px_oklch(0_0_0/0.05)] dark:bg-[var(--bg-muted)]"
          : "text-[var(--fg-subtle)] hover:text-[var(--fg)]",
      )}
    >
      {children}
    </button>
  )
}
