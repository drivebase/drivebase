/**
 * Prototype-parity file/folder icons as inline SVGs. Ported verbatim from
 * the Drivebase prototype (`icons.jsx`) so the Files window looks identical.
 *
 * Two variants:
 *   - `sm` → 16px flat glyphs for list rows and breadcrumbs.
 *   - `lg` → 44px filled cards for grid cells, with an extension label
 *     rendered inside FileLg when no kind-specific variant applies.
 *
 * Dispatch by `type` + inferred kind:
 *   folder → FolderIcon / FolderIconLg
 *   image/video/code/archive → kind-specific SVG (same SVG scaled for sm/lg)
 *   else → FileIcon / FileIconLg (shows the extension on lg)
 */

export type FileKind = "file" | "image" | "video" | "code" | "archive"

const IMAGE_EXTS = new Set(["png", "jpg", "jpeg", "webp", "gif", "svg", "heic"])
const VIDEO_EXTS = new Set(["mp4", "mov", "webm", "avi"])
const CODE_EXTS = new Set([
  "js",
  "jsx",
  "ts",
  "tsx",
  "py",
  "rb",
  "go",
  "json",
  "css",
  "html",
])
const ARCHIVE_EXTS = new Set(["zip", "tar", "gz", "rar", "7z"])

export function fileExtOf(name: string): string {
  const m = name.match(/\.([a-z0-9]+)$/i)
  return m ? m[1]!.toLowerCase() : ""
}

export function fileKindOf(name: string): FileKind {
  const e = fileExtOf(name)
  if (IMAGE_EXTS.has(e)) return "image"
  if (VIDEO_EXTS.has(e)) return "video"
  if (CODE_EXTS.has(e)) return "code"
  if (ARCHIVE_EXTS.has(e)) return "archive"
  return "file"
}

export interface FileIconProps {
  type: "file" | "folder"
  name: string
  variant?: "sm" | "lg"
  /**
   * Override the inferred file kind. Rarely needed; the server currently
   * doesn't surface one so we infer from the extension.
   */
  kind?: FileKind
  className?: string
}

export function FileIcon({
  type,
  name,
  variant = "sm",
  kind,
  className,
}: FileIconProps) {
  if (type === "folder") {
    return variant === "lg" ? (
      <FolderLg className={className} />
    ) : (
      <Folder className={className} />
    )
  }
  const k = kind ?? fileKindOf(name)
  const size = variant === "lg" ? 44 : 16
  switch (k) {
    case "image":
      return (
        <Image
          size={size}
          color="oklch(55% 0.14 200)"
          className={className}
        />
      )
    case "video":
      return (
        <Video size={size} color="oklch(55% 0.16 20)" className={className} />
      )
    case "code":
      return (
        <Code size={size} color="oklch(55% 0.14 280)" className={className} />
      )
    case "archive":
      return (
        <Archive
          size={size}
          color="oklch(60% 0.09 70)"
          className={className}
        />
      )
    default:
      return variant === "lg" ? (
        <FileLg ext={fileExtOf(name)} className={className} />
      ) : (
        <File className={className} />
      )
  }
}

// ---- Raw SVG primitives (ports of icons.jsx) -------------------------------

const FOLDER_HUE = "oklch(58% 0.10 85)"
const FILE_HUE = "oklch(50% 0.01 260)"

function Folder({ className }: { className?: string }) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="none"
      className={className}
    >
      <path
        d="M1.5 4.5 A1 1 0 0 1 2.5 3.5 H6.2 L7.5 5 H13.5 A1 1 0 0 1 14.5 6 V11.5 A1 1 0 0 1 13.5 12.5 H2.5 A1 1 0 0 1 1.5 11.5 Z"
        fill={FOLDER_HUE}
        fillOpacity={0.15}
        stroke={FOLDER_HUE}
        strokeWidth={1}
        strokeLinejoin="round"
      />
    </svg>
  )
}

function FolderLg({ className }: { className?: string }) {
  return (
    <svg
      width={44}
      height={44}
      viewBox="0 0 44 44"
      fill="none"
      className={className}
    >
      <path
        d="M4 14 A2 2 0 0 1 6 12 H16 L19 15 H38 A2 2 0 0 1 40 17 V32 A2 2 0 0 1 38 34 H6 A2 2 0 0 1 4 32 Z"
        fill={FOLDER_HUE}
        fillOpacity={0.18}
        stroke={FOLDER_HUE}
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
      <path
        d="M4 18 H40"
        stroke={FOLDER_HUE}
        strokeWidth={0.8}
        strokeOpacity={0.5}
      />
    </svg>
  )
}

function File({ className }: { className?: string }) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="none"
      className={className}
    >
      <path
        d="M3.5 2.5 H9 L12.5 5.5 V13 A0.5 0.5 0 0 1 12 13.5 H4 A0.5 0.5 0 0 1 3.5 13 Z"
        fill="white"
        stroke={FILE_HUE}
        strokeWidth={1}
        strokeLinejoin="round"
      />
      <path
        d="M9 2.5 V5.5 H12.5"
        stroke={FILE_HUE}
        strokeWidth={1}
        fill="none"
      />
    </svg>
  )
}

function FileLg({ ext, className }: { ext: string; className?: string }) {
  return (
    <svg
      width={44}
      height={44}
      viewBox="0 0 44 44"
      fill="none"
      className={className}
    >
      <path
        d="M10 6 H26 L34 14 V37 A1 1 0 0 1 33 38 H11 A1 1 0 0 1 10 37 Z"
        fill="white"
        stroke={FILE_HUE}
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
      <path
        d="M26 6 V14 H34"
        stroke={FILE_HUE}
        strokeWidth={1.2}
        fill="none"
      />
      {ext ? (
        <text
          x={22}
          y={29}
          textAnchor="middle"
          fontSize={6}
          fontFamily="Geist Mono, ui-monospace, monospace"
          fill={FILE_HUE}
          fontWeight={500}
        >
          {ext.toUpperCase()}
        </text>
      ) : null}
    </svg>
  )
}

function Image({
  size,
  color,
  className,
}: {
  size: number
  color: string
  className?: string
}) {
  // Viewport and geometry are authored for 44; scale preserves stroke weight.
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      className={className}
    >
      <rect
        x={6}
        y={9}
        width={32}
        height={26}
        rx={1}
        fill={color}
        fillOpacity={0.12}
        stroke={color}
        strokeWidth={1.2}
      />
      <circle cx={14} cy={17} r={2.5} fill={color} />
      <path
        d="M6 30 L16 22 L24 28 L32 20 L38 25 V34 H6 Z"
        fill={color}
        fillOpacity={0.35}
      />
    </svg>
  )
}

function Video({
  size,
  color,
  className,
}: {
  size: number
  color: string
  className?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      className={className}
    >
      <rect
        x={6}
        y={9}
        width={32}
        height={26}
        rx={1}
        fill={color}
        fillOpacity={0.12}
        stroke={color}
        strokeWidth={1.2}
      />
      <path d="M19 17 L28 22 L19 27 Z" fill={color} />
    </svg>
  )
}

function Code({
  size,
  color,
  className,
}: {
  size: number
  color: string
  className?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      className={className}
    >
      <path
        d="M10 6 H26 L34 14 V37 A1 1 0 0 1 33 38 H11 A1 1 0 0 1 10 37 Z"
        fill="white"
        stroke={color}
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
      <path
        d="M26 6 V14 H34"
        stroke={color}
        strokeWidth={1.2}
        fill="none"
      />
      <path
        d="M18 24 L15 27 L18 30 M26 24 L29 27 L26 30"
        stroke={color}
        strokeWidth={1.2}
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  )
}

function Archive({
  size,
  color,
  className,
}: {
  size: number
  color: string
  className?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      className={className}
    >
      <rect
        x={8}
        y={8}
        width={28}
        height={30}
        rx={1}
        fill={color}
        fillOpacity={0.15}
        stroke={color}
        strokeWidth={1.2}
      />
      <path
        d="M22 12 V16 M22 18 V22 M22 24 V28"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </svg>
  )
}
