import type { TelemetryEvent } from './events'

const DEFAULT_TELEMETRY_URL = 'https://telemetry.drivebase.io'

export type TelemetryClientOptions = {
  url?: string
  disabled?: boolean
}

export type TelemetryClient = {
  track(event: TelemetryEvent): Promise<void>
}

export function createTelemetryClient(opts: TelemetryClientOptions = {}): TelemetryClient {
  const disabled = opts.disabled ?? false
  const url = opts.url ?? DEFAULT_TELEMETRY_URL

  return {
    async track(event) {
      if (disabled) return

      const body = {
        type: 'event' as const,
        payload: {
          url: `/events/${event.name}`,
          name: event.name,
          ...('data' in event && event.data ? { data: event.data as Record<string, string | number | boolean> } : {}),
        },
      }

      try {
        await fetch(`${url}/v1/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      } catch {
        // telemetry must never crash the app
      }
    },
  }
}
