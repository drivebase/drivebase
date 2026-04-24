import { useCallback, useEffect, useRef, useState } from "react"
import {
  getApiBaseUrl,
  useCompleteUploadSession,
  useExecutePlan,
  useInitiateUploadSession,
  useOperationProgress,
  usePreflight,
} from "@drivebase/data"
import { useBus } from "@drivebase/kernel/bus"
import { useTransferStore } from "@drivebase/kernel"

interface UploadProgress {
  fileName: string
  loaded: number
  total: number
}

interface UploadPart {
  partNumber: number
  etag: string
}

/**
 * End-to-end batched upload:
 *   1. preflight(upload tree=[...files]) → one Operation(ready)
 *   2. initiateUploadSession             → one session per file entry
 *   3. PUT each chunk                    → proxy endpoint or presigned URLs
 *   4. completeUploadSession             → each session becomes ready
 *   5. executePlan                       → one upload job per file entry
 *   6. operationProgress subscription    → refetch on terminal status
 */
export function useUploadFiles(params: {
  providerId: string
  defaultParentId: string | null
  onComplete: () => void
}) {
  const { providerId, defaultParentId, onComplete } = params
  const [, preflight] = usePreflight()
  const [, initiateSession] = useInitiateUploadSession()
  const [, completeSession] = useCompleteUploadSession()
  const [, executePlan] = useExecutePlan()
  const [operationId, setOperationId] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [progress, setProgress] = useState<UploadProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const bus = useBus()
  const startUploadTransfer = useTransferStore((s) => s.startUploadTransfer)
  const updateUploadTransfer = useTransferStore((s) => s.updateUploadTransfer)
  const setUploadTransferPhase = useTransferStore((s) => s.setUploadTransferPhase)
  const finishUploadTransfer = useTransferStore((s) => s.finishUploadTransfer)
  const { event } = useOperationProgress(operationId)

  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    if (!event) return
    if (event.__typename === "OperationStatusEvent") {
      if (
        event.lifecycleStatus === "failed" ||
        event.lifecycleStatus === "cancelled"
      ) {
        setError(`Upload ${event.lifecycleStatus}`)
      }
      if (event.lifecycleStatus === "running") return
      if (operationId) {
        const activeTransfers = Object.values(useTransferStore.getState().uploadTransfers)
          .filter((transfer) => transfer.operationId === operationId)
        for (const transfer of activeTransfers) {
          finishUploadTransfer(transfer.id)
        }
      }
      setOperationId(null)
      setPending(false)
      setProgress(null)
      onCompleteRef.current()
    }
  }, [event, operationId, finishUploadTransfer])

  const upload = useCallback(
    async (
      filesInput: File | FileList | File[],
      parentId = defaultParentId,
    ): Promise<void> => {
      const files = filesInput instanceof File
        ? [filesInput]
        : filesInput instanceof FileList
          ? Array.from(filesInput)
          : filesInput
      if (files.length === 0) return

      const failUpload = (message: string, opId?: string) => {
        if (opId) {
          const activeTransfers = Object.values(useTransferStore.getState().uploadTransfers)
            .filter((transfer) => transfer.operationId === opId)
          for (const transfer of activeTransfers) {
            finishUploadTransfer(transfer.id)
          }
          setOperationId(null)
        }
        setPending(false)
        setProgress(null)
        setError(message)
      }

      setError(null)
      setPending(true)
      const totalBytes = files.reduce((sum, file) => sum + file.size, 0)
      setProgress({ fileName: files[0]?.name ?? "", loaded: 0, total: totalBytes })

      const pf = await preflight({
        input: {
          upload: {
            dstProviderId: providerId,
            dstParentId: parentId,
            strategy: "rename",
            tree: files.map((file) => ({
                name: file.name,
                type: "file",
                size: file.size,
                mimeType: file.type || null,
              })),
          },
        },
      })
      if (pf.error || !pf.data) {
        setPending(false)
        setProgress(null)
        setError(pf.error?.message ?? "Preflight failed")
        return
      }
      const plan = pf.data.preflight
      if (plan.status !== "ready") {
        setPending(false)
        setProgress(null)
        setError(`Plan status ${plan.status}`)
        return
      }

      const init = await initiateSession({
        input: { operationId: plan.operationId },
      })
      if (init.error || !init.data) {
        setPending(false)
        setProgress(null)
        setError(init.error?.message ?? "Upload init failed")
        return
      }
      const initiated = init.data.initiateUploadSession.sessions
      if (initiated.length !== files.length) {
        failUpload(
          `Upload session count mismatch: expected ${files.length}, got ${initiated.length}`,
          plan.operationId,
        )
        return
      }
      setOperationId(plan.operationId)
      bus.emit("transfer.open", undefined)

      const apiBase = getApiBaseUrl()
      let aggregateLoaded = 0

      for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
        const file = files[fileIndex]!
        const uploadSession = initiated[fileIndex]
        if (!uploadSession) {
          failUpload(`Missing upload session for ${file.name}`, plan.operationId)
          return
        }
        const { session, chunkUploadUrlPattern, presignedParts } = uploadSession
        startUploadTransfer({
          id: session.id,
          operationId: plan.operationId,
          fileName: file.name,
          totalBytes: file.size,
          mode: session.mode,
        })
        const chunkSize = session.chunkSizeBytes
        const totalChunks = session.totalChunks
        const parts: UploadPart[] = []
        let fileLoaded = 0

        for (let i = 0; i < totalChunks; i++) {
          const start = i * chunkSize
          const end = Math.min(start + chunkSize, file.size)
          const blob = file.slice(start, end)
          const chunkSize_ = end - start

          if (session.mode === "proxy") {
            if (!chunkUploadUrlPattern) {
              failUpload("Missing chunk URL pattern", plan.operationId)
              return
            }
            const url = apiBase + chunkUploadUrlPattern.replace("{index}", String(i))
            const chunkBaseLoaded = fileLoaded
            const aggregateBaseLoaded = aggregateLoaded
            try {
              await new Promise<void>((resolve, reject) => {
                const xhr = new XMLHttpRequest()
                xhr.open("PUT", url)
                xhr.withCredentials = true
                xhr.upload.onprogress = (e) => {
                  const chunkLoaded = e.lengthComputable ? e.loaded : 0
                  const totalFileLoaded = chunkBaseLoaded + chunkLoaded
                  const totalLoaded = aggregateBaseLoaded + totalFileLoaded
                  setProgress({ fileName: file.name, loaded: totalLoaded, total: totalBytes })
                  updateUploadTransfer(session.id, totalFileLoaded)
                }
                xhr.onload = () => {
                  if (xhr.status >= 200 && xhr.status < 300) resolve()
                  else reject(new Error(`Chunk ${i + 1} failed (${xhr.status})`))
                }
                xhr.onerror = () => reject(new Error(`Chunk ${i + 1} network error`))
                xhr.send(blob)
              })
            } catch (err) {
              failUpload(err instanceof Error ? err.message : String(err), plan.operationId)
              return
            }
          } else {
            const part = presignedParts?.[i]
            if (!part) {
              failUpload(`Missing presigned part ${i + 1}`, plan.operationId)
              return
            }
            const res = await fetch(part.url, {
              method: "PUT",
              credentials: "omit",
              body: blob,
            })
            if (!res.ok) {
              failUpload(`Chunk ${i + 1} failed (${res.status})`, plan.operationId)
              return
            }
            const etag = res.headers.get("ETag") ?? res.headers.get("etag") ?? ""
            parts.push({ partNumber: i + 1, etag })
          }
          fileLoaded += chunkSize_
          if (session.mode !== "proxy") {
            setProgress({
              fileName: file.name,
              loaded: aggregateLoaded + fileLoaded,
              total: totalBytes,
            })
            updateUploadTransfer(session.id, fileLoaded)
          }
        }

        const comp = await completeSession({
          input: {
            sessionId: session.id,
            parts: session.mode === "direct" ? parts : null,
          },
        })
        if (comp.error) {
          failUpload(comp.error.message, plan.operationId)
          return
        }

        setUploadTransferPhase(session.id, "finalizing")
        aggregateLoaded += file.size
      }

      const exec = await executePlan({ operationId: plan.operationId })
      if (exec.error) {
        failUpload(exec.error.message, plan.operationId)
        return
      }
      bus.emit("transfer.start", { operationId: plan.operationId })
    },
    [
      preflight,
      initiateSession,
      completeSession,
      executePlan,
      providerId,
      defaultParentId,
      bus,
      startUploadTransfer,
      updateUploadTransfer,
      setUploadTransferPhase,
      finishUploadTransfer,
    ],
  )

  return { upload, pending, progress, error }
}
