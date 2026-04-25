import { useEffect, useMemo, useState } from "react"
import { useQuery } from "urql"
import { GetAppMetadataDocument, type GetAppMetadataQuery } from "../gql"

const LOCAL_VERSION_KEY = "drivebase.local_version"
const LATEST_GITHUB_VERSION_KEY = "drivebase.latest_github_version"
const GITHUB_REPO = "drivebase/drivebase"

function normalize(v?: string | null) {
  return (v ?? "").trim().replace(/^v/i, "")
}

export function useAppUpdate() {
  const [{ data, fetching }] = useQuery<GetAppMetadataQuery>({ query: GetAppMetadataDocument })
  const [latestTag, setLatestTag] = useState<string | null>(null)
  const [latestVersion, setLatestVersion] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)

  const currentVersion = data?.appMetadata?.version ?? null

  useEffect(() => {
    if (!currentVersion) return
    let cancelled = false

    const run = async () => {
      setChecking(true)
      try {
        const res = await fetch(
          `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
          { headers: { Accept: "application/vnd.github+json" } },
        )
        if (!res.ok || cancelled) return
        const payload = (await res.json()) as { tag_name?: string }
        const raw = payload.tag_name ?? ""
        const version = normalize(raw)
        if (!version || cancelled) return
        setLatestTag(raw)
        setLatestVersion(version)
        localStorage.setItem(LATEST_GITHUB_VERSION_KEY, version)
        localStorage.setItem(LOCAL_VERSION_KEY, normalize(currentVersion))
      } catch {
        const cached = normalize(localStorage.getItem(LATEST_GITHUB_VERSION_KEY))
        if (cached && !cancelled) setLatestVersion(cached)
      } finally {
        if (!cancelled) setChecking(false)
      }
    }

    run()
    return () => { cancelled = true }
  }, [currentVersion])

  const isUpdateAvailable = useMemo(() => {
    if (!currentVersion || !latestVersion) return false
    const local = normalize(localStorage.getItem(LOCAL_VERSION_KEY)) || normalize(currentVersion)
    return latestVersion !== local
  }, [currentVersion, latestVersion])

  return {
    currentVersion,
    latestVersion,
    latestTag,
    isChecking: fetching || checking,
    isUpdateAvailable,
  }
}
