export function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-2">
      <h2 className="text-base font-semibold text-[var(--fg)]">{title}</h2>
      {description && (
        <p className="mt-0.5 text-xs text-[var(--fg-muted)]">{description}</p>
      )}
    </div>
  )
}
