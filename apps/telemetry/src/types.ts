export type Bindings = {
  UMAMI_URL: string
  UMAMI_WEBSITE_ID: string
}

export type EventPayload = {
  hostname?: string
  screen?: string
  language?: string
  url: string
  referrer?: string
  title?: string
  tag?: string
  id?: string
  name?: string
  data?: Record<string, string | number | boolean>
}

export type TrackBody = {
  type: 'event'
  payload: EventPayload
}
