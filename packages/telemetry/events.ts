export const ALLOWED_EVENT_NAMES = [
  'file.uploaded',
  'file.deleted',
  'file.moved',
  'file.copied',
  'file.transferred',
  'folder.created',
  'provider.connected',
  'provider.disconnected',
  'upload.completed',
  'install',
] as const

export type EventName = (typeof ALLOWED_EVENT_NAMES)[number]

export type TelemetryEvent = {
  name: EventName
  data?: Record<string, string | number | boolean>
}
