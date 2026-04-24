import { useCallback } from "react"
import { getApiBaseUrl } from "@drivebase/data"

export function useDownloadNode() {
  return useCallback((nodeId: string) => {
    const href = `${getApiBaseUrl()}/api/download/${encodeURIComponent(nodeId)}`
    const anchor = document.createElement("a")
    anchor.href = href
    anchor.download = ""
    anchor.rel = "noopener"
    anchor.style.display = "none"
    document.body.append(anchor)
    anchor.click()
    anchor.remove()
  }, [])
}
