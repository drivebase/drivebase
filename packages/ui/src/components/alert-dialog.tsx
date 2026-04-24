import { AlertDialog as RadixAlertDialog } from "radix-ui"
import { AlertTriangle } from "lucide-react"
import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ElementRef,
  type HTMLAttributes,
  type ReactNode,
} from "react"
import { cn } from "@drivebase/ui/lib/cn"
import { Button } from "./button"

export const AlertDialog = RadixAlertDialog.Root
export const AlertDialogTrigger = RadixAlertDialog.Trigger
export const AlertDialogPortal = RadixAlertDialog.Portal
export const AlertDialogAction = RadixAlertDialog.Action
export const AlertDialogCancel = RadixAlertDialog.Cancel

export const AlertDialogOverlay = forwardRef<
  ElementRef<typeof RadixAlertDialog.Overlay>,
  ComponentPropsWithoutRef<typeof RadixAlertDialog.Overlay>
>(function AlertDialogOverlay({ className, ...props }, ref) {
  return (
    <RadixAlertDialog.Overlay
      ref={ref}
      className={cn(
        "db-dialog-overlay fixed inset-0 z-[2147483646] bg-[oklch(0_0_0_/_0.45)] backdrop-blur-sm",
        className,
      )}
      {...props}
    />
  )
})

export const AlertDialogContent = forwardRef<
  ElementRef<typeof RadixAlertDialog.Content>,
  ComponentPropsWithoutRef<typeof RadixAlertDialog.Content>
>(function AlertDialogContent({ className, children, ...props }, ref) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <RadixAlertDialog.Content
        ref={ref}
        className={cn(
          "db-dialog-content fixed left-1/2 top-1/2 z-[2147483647] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2",
          "focus:outline-none",
          className,
        )}
        {...props}
      >
        <div className="db-dialog-surface glass-strong window-shadow overflow-hidden rounded-[var(--window-radius)] will-change-[transform,opacity]">
          {children}
        </div>
      </RadixAlertDialog.Content>
    </AlertDialogPortal>
  )
})

export function AlertDialogHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1.5 px-5 pt-5", className)} {...props} />
}

export function AlertDialogBody({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 py-4", className)} {...props} />
}

export function AlertDialogFooter({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-row justify-end gap-2 border-t border-[var(--border)] bg-[oklch(0_0_0/0.04)] px-5 py-4 dark:bg-[oklch(1_0_0/0.03)]",
        className,
      )}
      {...props}
    />
  )
}

export const AlertDialogTitle = forwardRef<
  ElementRef<typeof RadixAlertDialog.Title>,
  ComponentPropsWithoutRef<typeof RadixAlertDialog.Title>
>(function AlertDialogTitle({ className, ...props }, ref) {
  return (
    <RadixAlertDialog.Title
      ref={ref}
      className={cn("text-base font-semibold leading-6 text-[var(--fg)]", className)}
      {...props}
    />
  )
})

export const AlertDialogDescription = forwardRef<
  ElementRef<typeof RadixAlertDialog.Description>,
  ComponentPropsWithoutRef<typeof RadixAlertDialog.Description>
>(function AlertDialogDescription({ className, ...props }, ref) {
  return (
    <RadixAlertDialog.Description
      ref={ref}
      className={cn("text-sm leading-6 text-[var(--fg-muted)]", className)}
      {...props}
    />
  )
})

export interface AskConfirmOptions {
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: "primary" | "danger"
}

interface ConfirmRequest {
  id: number
  title: string
  description?: string
  confirmLabel: string
  cancelLabel: string
  tone: NonNullable<AskConfirmOptions["tone"]>
  resolve: (value: boolean) => void
}

let enqueueConfirmRequest: ((request: ConfirmRequest) => void) | null = null
let confirmRequestId = 0

export function askConfirm(
  title: string,
  descriptionOrOptions?: string | AskConfirmOptions,
  options?: AskConfirmOptions,
): Promise<boolean> {
  const description =
    typeof descriptionOrOptions === "string"
      ? descriptionOrOptions
      : descriptionOrOptions?.description
  const resolvedOptions =
    typeof descriptionOrOptions === "string"
      ? (options ?? {})
      : (descriptionOrOptions ?? {})

  return new Promise((resolve) => {
    const request: ConfirmRequest = {
      id: ++confirmRequestId,
      title,
      description,
      confirmLabel: resolvedOptions.confirmLabel ?? "Confirm",
      cancelLabel: resolvedOptions.cancelLabel ?? "Cancel",
      tone: resolvedOptions.tone ?? "primary",
      resolve,
    }

    if (enqueueConfirmRequest) {
      enqueueConfirmRequest(request)
      return
    }

    if (typeof window !== "undefined") {
      resolve(window.confirm([title, description].filter(Boolean).join("\n\n")))
      return
    }

    resolve(false)
  })
}

export const askConfirmation = askConfirm

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [requests, setRequests] = useState<ConfirmRequest[]>([])
  const requestsRef = useRef<ConfirmRequest[]>([])
  const responseRef = useRef<boolean | null>(null)
  const current = requests[0] ?? null
  const tone = current?.tone ?? "primary"

  useEffect(() => {
    requestsRef.current = requests
  }, [requests])

  useEffect(() => {
    const enqueue = (request: ConfirmRequest) => {
      setRequests((prev) => [...prev, request])
    }
    enqueueConfirmRequest = enqueue

    return () => {
      if (enqueueConfirmRequest === enqueue) enqueueConfirmRequest = null
      for (const request of requestsRef.current) request.resolve(false)
      requestsRef.current = []
    }
  }, [])

  const handleResolvedClose = () => {
    if (!current) return
    const result = responseRef.current ?? false
    responseRef.current = null
    current.resolve(result)
    setRequests((prev) => prev.filter((request) => request.id !== current.id))
  }

  return (
    <>
      {children}
      <AlertDialog
        open={current != null}
        onOpenChange={(open) => {
          if (!open) handleResolvedClose()
        }}
      >
        <AlertDialogContent className="max-w-[28rem]">
          {current ? (
            <>
              <div
                className={cn(
                  "absolute inset-x-0 top-0 h-px",
                  tone === "danger"
                    ? "bg-[var(--danger)]/60"
                    : "bg-[var(--accent)]/60",
                )}
              />
              <div className="flex items-start gap-4 px-5 pb-5 pt-5">
                <div
                  className={cn(
                    "mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-[18px] border",
                    tone === "danger"
                      ? "border-[var(--danger)]/25 bg-[var(--danger)]/12 text-[var(--danger)]"
                      : "border-[var(--accent)]/20 bg-[var(--accent)]/10 text-[var(--accent)]",
                  )}
                >
                  <AlertTriangle size={18} />
                </div>

                <AlertDialogHeader className="min-w-0 flex-1 p-0">
                  <AlertDialogTitle>{current.title}</AlertDialogTitle>
                  {current.description ? (
                    <AlertDialogDescription>
                      {current.description}
                    </AlertDialogDescription>
                  ) : null}
                </AlertDialogHeader>
              </div>

              <AlertDialogFooter>
                <AlertDialogCancel asChild>
                  <Button
                    size="sm"
                    tone="outline"
                    onClick={() => {
                      responseRef.current = false
                    }}
                  >
                    {current.cancelLabel}
                  </Button>
                </AlertDialogCancel>
                <AlertDialogAction asChild>
                  <Button
                    size="sm"
                    tone={tone === "danger" ? "danger" : "primary"}
                    onClick={() => {
                      responseRef.current = true
                    }}
                  >
                    {current.confirmLabel}
                  </Button>
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          ) : null}
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
