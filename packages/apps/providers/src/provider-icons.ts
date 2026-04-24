/**
 * Map a server-supplied provider `type` string to an iconify logo class.
 *
 * NOTE: the strings here must be the FULL `icon-[set--name]` class, not just
 * the icon name. Tailwind's scanner only emits rules for class names it finds
 * as literals in source files; if we built the class at runtime (e.g. via a
 * template like `icon-[${name}]`) Tailwind wouldn't see it and nothing would
 * render. Keeping the full class inline makes the scanner happy and keeps
 * the iconify dynamic plugin generating exactly the icons we reference.
 */
const PROVIDER_ICON_CLASS: Record<string, string> = {
  google_drive: "icon-[logos--google-drive]",
  dropbox: "icon-[logos--dropbox]",
  onedrive: "icon-[logos--microsoft-onedrive]",
  s3: "icon-[logos--aws-s3]",
  r2: "icon-[logos--cloudflare]",
  backblaze: "icon-[logos--backblaze-icon]",
  local: "icon-[lucide--hard-drive]",
}

const FALLBACK_ICON_CLASS = "icon-[lucide--cloud]"

export function providerIconClass(type: string): string {
  return PROVIDER_ICON_CLASS[type] ?? FALLBACK_ICON_CLASS
}
