export function BootSplash() {
  return (
    <div className="fixed inset-0 z-[2000] grid place-items-center bg-[var(--bg)] text-[var(--fg)]">
      <div className="flex flex-col items-center gap-3">
        <img
          src="/circle.svg"
          alt=""
          aria-hidden="true"
          className="size-10 object-contain"
        />
        <span className="text-sm font-medium">DriveOS</span>
      </div>
    </div>
  )
}
