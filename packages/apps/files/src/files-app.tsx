import { useEffect, useState } from "react"
import { useMyProviders } from "@drivebase/data"
import type { AppProps } from "@drivebase/kernel"
import { FilesWindowEmptyState } from "./files-window-empty-state"
import { FilesWindow } from "./files-window"
import type { Provider } from "./files-window-types"
import type { BreadcrumbCrumb } from "./hooks/use-files-navigation"
import type { ViewMode } from "./components/toolbar"

export interface FilesAppPayload {
  providerId: string
  path: BreadcrumbCrumb[]
  view?: ViewMode
}

export function FilesApp(props: AppProps) {
  const { providers, fetching: providersFetching } = useMyProviders()
  const [activeProvider, setActiveProvider] = useState<Provider | null>(null)

  useEffect(() => {
    if (activeProvider) return
    const saved = props.payload as FilesAppPayload | undefined
    if (saved?.providerId) {
      const found = providers.find((provider) => provider.id === saved.providerId)
      if (found) {
        setActiveProvider(found)
        return
      }
    }
    if (providers.length > 0) {
      setActiveProvider(providers[0] ?? null)
    }
  }, [activeProvider, providers, props.payload])

  if (!activeProvider) {
    return (
      <FilesWindowEmptyState
        providers={providers}
        providersFetching={providersFetching}
        onSelectProvider={setActiveProvider}
      />
    )
  }

  const saved = props.payload as FilesAppPayload | undefined
  const savedPath = saved?.providerId === activeProvider.id ? saved.path : undefined

  return (
    <FilesWindow
      key={activeProvider.id}
      windowId={props.windowId}
      provider={activeProvider}
      providers={providers}
      providersFetching={providersFetching}
      onSwitchProvider={setActiveProvider}
      initialPath={savedPath}
      initialView={saved?.view}
      setPayload={props.setPayload}
    />
  )
}
