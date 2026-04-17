import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Download, FolderInput, FolderOpen, Image, Info, Layers, Monitor, Pencil, Share2, Trash2, Copy } from "lucide-react";
import { useContextMenuStore } from "@/store/context-menu";
import type { ContextTarget } from "@/lib/event-bus";
import { eventBus } from "@/lib/event-bus";
import { cn } from "@/lib/utils";
import { getAppContextMenuItems } from "./app-context-menu-registry";

// ---------------------------------------------------------------------------
// Primitive menu item — matches shadcn ContextMenuItem styling
// ---------------------------------------------------------------------------
interface MenuItemProps {
  children: React.ReactNode;
  onSelect?: () => void;
  className?: string;
}

function MenuItem({ children, onSelect, className }: MenuItemProps) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault(); // don't blur the focused window
        onSelect?.();
      }}
      className={cn(
        "group relative flex w-full cursor-default items-center gap-1.5 rounded-md px-1.5 py-1 text-sm outline-none select-none",
        "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
    >
      {children}
    </button>
  );
}

function MenuSeparator() {
  return <div className="-mx-1 my-1 h-px bg-border" />;
}

function MenuShortcut({ children }: { children: React.ReactNode }) {
  return (
    <span className="ml-auto text-xs tracking-widest text-muted-foreground group-hover:text-accent-foreground">
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Menu content per target type
// ---------------------------------------------------------------------------
function DesktopMenuItems({ close }: { close: () => void }) {
  return (
    <>
      <MenuItem onSelect={close}>
        <Image size={14} />
        Change Wallpaper…
      </MenuItem>
      <MenuSeparator />
      <MenuItem onSelect={close}>
        <Monitor size={14} />
        Display Settings
      </MenuItem>
    </>
  );
}

function FileMenuItems({
  data,
  close,
}: {
  data: { id: string; name: string; kind: string };
  close: () => void;
}) {
  return (
    <>
      <MenuItem
        onSelect={() => {
          eventBus.emit("file:opened", { fileId: data.id, name: data.name });
          close();
        }}
      >
        <FolderOpen size={14} />
        Open
      </MenuItem>
      <MenuItem onSelect={close}>
        <Layers size={14} />
        Open With…
      </MenuItem>
      <MenuSeparator />
      <MenuItem onSelect={close}>
        <Download size={14} />
        Download
      </MenuItem>
      <MenuItem onSelect={close}>
        <Share2 size={14} />
        Share
      </MenuItem>
      <MenuSeparator />
      <MenuItem onSelect={close}>
        <Pencil size={14} />
        Rename
      </MenuItem>
      <MenuItem onSelect={close}>
        <Copy size={14} />
        Duplicate
      </MenuItem>
      <MenuItem onSelect={close}>
        <FolderInput size={14} />
        Move To…
      </MenuItem>
      <MenuSeparator />
      <MenuItem onSelect={close}>
        <Info size={14} />
        Get Info
      </MenuItem>
      <MenuSeparator />
      <MenuItem
        className="text-destructive hover:text-destructive focus:text-destructive"
        onSelect={() => {
          eventBus.emit("file:deleted", { fileIds: [data.id] });
          close();
        }}
      >
        <Trash2 size={14} />
        Move to Trash
        <MenuShortcut>⌘⌫</MenuShortcut>
      </MenuItem>
    </>
  );
}

function ShortcutMenuItems({
  data,
  close,
}: {
  data: { id: string; label: string };
  close: () => void;
}) {
  return (
    <>
      <MenuItem
        onSelect={() => {
          eventBus.emit("desktop:shortcut-activated", { shortcutId: data.id });
          close();
        }}
      >
        <FolderOpen size={14} />
        Open
      </MenuItem>
      <MenuSeparator />
      <MenuItem
        className="text-destructive hover:text-destructive focus:text-destructive"
        onSelect={close}
      >
        <Trash2 size={14} />
        Remove from Desktop
      </MenuItem>
    </>
  );
}

function AppMenuItems({
  close,
  target,
}: {
  close: () => void;
  target: Extract<NonNullable<ContextTarget>, { type: "app" }>;
}) {
  const items = getAppContextMenuItems(target.data);
  if (items.length === 0) return null;

  return (
    <>
      {items.map((item) =>
        item.type === "separator" ? (
          <MenuSeparator key={item.id} />
        ) : (
          <MenuItem
            key={item.id}
            className={
              item.destructive
                ? "text-destructive hover:text-destructive focus:text-destructive"
                : undefined
            }
            onSelect={() => {
              item.onSelect();
              close();
            }}
          >
            {item.icon ? <item.icon size={14} /> : null}
            {item.label}
            {item.shortcut ? <MenuShortcut>{item.shortcut}</MenuShortcut> : null}
          </MenuItem>
        ),
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Renderer — single instance at Desktop root
// ---------------------------------------------------------------------------
export function ContextMenuRenderer() {
  const { isOpen, position, target, close } = useContextMenuStore();
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(e: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        close();
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }

    document.addEventListener("pointerdown", handlePointerDown, { capture: true });
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, { capture: true });
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, close]);

  // Clamp position so menu doesn't overflow viewport
  const MENU_WIDTH = 208; // w-52
  const MENU_HEIGHT_ESTIMATE = 280;
  const clampedX = Math.min(position.x, window.innerWidth - MENU_WIDTH - 8);
  const clampedY = Math.min(position.y, window.innerHeight - MENU_HEIGHT_ESTIMATE - 8);

  if (!isOpen || !target) return null;

  return createPortal(
    <div
      ref={menuRef}
      style={{ top: clampedY, left: clampedX }}
      className="fixed z-[99999] w-52 rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 animate-in fade-in-0 zoom-in-95 duration-100"
    >
      {target.type === "desktop" && <DesktopMenuItems close={close} />}
      {target.type === "file" && (
        <FileMenuItems data={target.data} close={close} />
      )}
      {target.type === "shortcut" && (
        <ShortcutMenuItems data={target.data} close={close} />
      )}
      {target.type === "app" && <AppMenuItems target={target} close={close} />}
    </div>,
    document.body,
  );
}
