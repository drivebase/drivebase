import { LocationsSidebar } from "./components/locations-sidebar"
import type { Provider } from "./files-window-types"

interface FilesWindowEmptyStateProps {
  providers: Provider[]
  providersFetching: boolean
  onSelectProvider: (provider: Provider) => void
}

export function FilesWindowEmptyState({
  providers,
  providersFetching,
  onSelectProvider,
}: FilesWindowEmptyStateProps) {
  return (
    <div className="flex h-full">
      <LocationsSidebar
        providers={providers}
        selectedProviderId={null}
        onSelect={onSelectProvider}
        fetching={providersFetching}
      />
      <div className="flex flex-1 items-center justify-center text-xs text-[var(--fg-muted)]">
        {providers.length === 0
          ? "Connect a provider to browse files."
          : "Pick a location to get started."}
      </div>
    </div>
  )
}
