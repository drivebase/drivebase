/**
 * Custom app icons matching the Drivebase design system.
 * These are SVG-based icons designed to look consistent with our file icons.
 */

const FILES_HUE = "oklch(58% 0.10 85)"
const ACCENT_STROKE = "oklch(55% 0.14 200)"

/**
 * Files app icon — a stylized folder with documents visible inside,
 * conveying the file manager nature of the app.
 */
export function FilesAppIcon({ size = 44, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      className={className}
    >
      {/* Main folder body */}
      <path
        d="M6 14 A2 2 0 0 1 8 12 H17 L20 15 H36 A2 2 0 0 1 38 17 V32 A2 2 0 0 1 36 34 H8 A2 2 0 0 1 6 32 Z"
        fill={FILES_HUE}
        fillOpacity={0.15}
        stroke={FILES_HUE}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      {/* Folder tab accent line */}
      <path
        d="M6 18 H38"
        stroke={FILES_HUE}
        strokeWidth={0.8}
        strokeOpacity={0.4}
      />
      {/* Document peeking out */}
      <path
        d="M14 16 V26 A1 1 0 0 0 15 27 H29 A1 1 0 0 0 30 26 V16"
        fill="white"
        fillOpacity={0.9}
        stroke={ACCENT_STROKE}
        strokeWidth={1}
        strokeLinejoin="round"
      />
      {/* Document lines */}
      <path
        d="M17 20 H27 M17 23 H25"
        stroke={ACCENT_STROKE}
        strokeWidth={0.8}
        strokeLinecap="round"
        strokeOpacity={0.6}
      />
    </svg>
  )
}

/**
 * Settings app icon — a gear/cog design.
 */
export function SettingsAppIcon({ size = 44, className }: { size?: number; className?: string }) {
  const color = "oklch(55% 0.08 250)"
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      className={className}
    >
      <circle
        cx={22}
        cy={22}
        r={8}
        fill="white"
        stroke={color}
        strokeWidth={2}
      />
      <path
        d="M22 8 V12 M22 32 V36 M8 22 H12 M32 22 H36 M12.7 12.7 L15.5 15.5 M28.5 28.5 L31.3 31.3 M12.7 31.3 L15.5 28.5 M28.5 15.5 L31.3 12.7"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </svg>
  )
}

/**
 * Transfers app icon — arrows indicating movement/sync.
 */
export function TransfersAppIcon({ size = 44, className }: { size?: number; className?: string }) {
  return (
    <img
      src="/icons/transfers.png"
      alt=""
      width={size}
      height={size}
      aria-hidden
      className={className}
    />
  )
}
