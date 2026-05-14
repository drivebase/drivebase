import { createPortal } from "react-dom"
import { useEffect } from "react"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { getApiBaseUrl } from "@drivebase/data"
import { fileKindOf } from "@drivebase/ui/components/file-icon"
import type { FileItemNode } from "./file-item"

function isImageNode(node: FileItemNode): boolean {
  return (
    node.type === "file" &&
    (!!node.mimeType?.startsWith("image/") || fileKindOf(node.name) === "image")
  )
}

interface PreviewDialogProps {
  node: FileItemNode | null
  /** All nodes visible in the current folder — used to build prev/next navigation. */
  siblings: FileItemNode[]
  onClose: () => void
  onNavigate: (node: FileItemNode) => void
}

export function PreviewDialog({ node, siblings, onClose, onNavigate }: PreviewDialogProps) {
  const imageNodes = siblings.filter(isImageNode)
  const currentIndex = node ? imageNodes.findIndex((n) => n.id === node.id) : -1
  const prevNode = currentIndex > 0 ? (imageNodes[currentIndex - 1] ?? null) : null
  const nextNode =
    currentIndex < imageNodes.length - 1 ? (imageNodes[currentIndex + 1] ?? null) : null

  useEffect(() => {
    if (!node) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        onClose()
      } else if (e.key === "ArrowLeft" && prevNode) {
        e.preventDefault()
        onNavigate(prevNode)
      } else if (e.key === "ArrowRight" && nextNode) {
        e.preventDefault()
        onNavigate(nextNode)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [node, prevNode, nextNode, onClose, onNavigate])

  if (!node) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/82 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* header: filename + counter + close */}
      <div
        className="absolute inset-x-0 top-0 flex items-center gap-3 bg-gradient-to-b from-black/60 to-transparent px-4 py-3"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-white/90">
          {node.name}
        </span>
        {imageNodes.length > 1 && (
          <span className="shrink-0 tabular-nums text-xs text-white/50">
            {currentIndex + 1} / {imageNodes.length}
          </span>
        )}
        <button
          onClick={onClose}
          className="shrink-0 rounded-full p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Close preview"
        >
          <X size={16} />
        </button>
      </div>

      {/* image */}
      <div
        className="h-[90vh] w-[90vw]"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          key={node.id}
          src={`${getApiBaseUrl()}/api/download/${node.id}`}
          alt={node.name}
          draggable={false}
          className="h-full w-full rounded-[var(--radius-md)] object-contain"
        />
      </div>

      {/* prev */}
      {prevNode && (
        <button
          className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full p-2.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          onClick={(e) => {
            e.stopPropagation()
            onNavigate(prevNode)
          }}
          aria-label="Previous image"
        >
          <ChevronLeft size={22} />
        </button>
      )}

      {/* next */}
      {nextNode && (
        <button
          className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-2.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          onClick={(e) => {
            e.stopPropagation()
            onNavigate(nextNode)
          }}
          aria-label="Next image"
        >
          <ChevronRight size={22} />
        </button>
      )}
    </div>,
    document.body,
  )
}
