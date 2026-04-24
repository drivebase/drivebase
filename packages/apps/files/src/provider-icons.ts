/**
 * Map a server-supplied provider `type` string to an iconify logo class.
 * Duplicate of @drivebase/app-providers' copy so the Files package stays
 * independent (no cross-app import). Keep the two in sync; the full class
 * strings must remain literal so Tailwind's scanner emits the rules.
 */
const PROVIDER_ICON_CLASS: Record<string, string> = {
  google_drive: "icon-[logos--google-drive]",
  dropbox: "icon-[logos--dropbox]",
  onedrive: "icon-[logos--microsoft-onedrive]",
  s3: "icon-[logos--aws-s3]",
  r2: "icon-[logos--cloudflare]",
  local: "icon-[lucide--hard-drive]",
}

const FALLBACK_ICON_CLASS = "icon-[lucide--cloud]"

export function providerIconClass(type: string): string {
  return PROVIDER_ICON_CLASS[type] ?? FALLBACK_ICON_CLASS
}
