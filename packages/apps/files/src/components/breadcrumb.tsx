import { ChevronRight } from "lucide-react"
import { Fragment } from "react"
import type { BreadcrumbCrumb } from "../hooks/use-files-navigation"

export interface BreadcrumbProps {
  stack: BreadcrumbCrumb[]
  onJump: (index: number) => void
}

export function Breadcrumb({ stack, onJump }: BreadcrumbProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex min-h-7 items-center gap-0.5 overflow-x-auto border-b border-[var(--border)] px-3 py-1 text-xs"
    >
      {stack.map((crumb, i) => {
        const last = i === stack.length - 1
        return (
          <Fragment key={`${crumb.id ?? "root"}-${i}`}>
            {i > 0 && (
              <ChevronRight
                size={12}
                className="shrink-0 text-[var(--fg-subtle)]"
                aria-hidden
              />
            )}
            <button
              type="button"
              onClick={() => onJump(i)}
              disabled={last}
              className={
                last
                  ? "shrink-0 cursor-default px-1 py-0.5 font-medium text-[var(--fg)]"
                  : "shrink-0 rounded-[3px] px-1 py-0.5 text-[var(--fg-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--fg)]"
              }
            >
              {crumb.name}
            </button>
          </Fragment>
        )
      })}
    </nav>
  )
}
