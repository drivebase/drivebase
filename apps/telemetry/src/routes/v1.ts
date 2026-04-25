import { Hono } from 'hono'
import { ALLOWED_EVENT_NAMES } from '@drivebase/telemetry'
import type { Bindings, TrackBody } from '../types'

const MAX_BODY_BYTES = 4096

const v1 = new Hono<{ Bindings: Bindings }>()

v1.post('/send', async (c) => {
  const { UMAMI_URL, UMAMI_WEBSITE_ID, UMAMI_TOKEN } = c.env

  if (!UMAMI_URL || !UMAMI_WEBSITE_ID) {
    return c.json({ error: 'Umami not configured' }, 503)
  }

  const ip = c.req.header('CF-Connecting-IP') ?? 'unknown'
  const { success } = await c.env.RATE_LIMITER.limit({ key: ip })
  if (!success) {
    return c.json({ error: 'Too many requests' }, 429)
  }

  const contentLength = Number(c.req.header('Content-Length') ?? 0)
  if (contentLength > MAX_BODY_BYTES) {
    return c.json({ error: 'Payload too large' }, 413)
  }

  let body: TrackBody
  try {
    body = await c.req.json<TrackBody>()
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400)
  }

  if (!body.payload?.url) {
    return c.json({ error: 'payload.url is required' }, 400)
  }

  const eventName = body.payload.name
  if (!eventName || !(ALLOWED_EVENT_NAMES as readonly string[]).includes(eventName)) {
    return c.json({ error: 'Unknown event name' }, 400)
  }

  const umamiPayload = {
    type: body.type ?? 'event',
    payload: {
      ...body.payload,
      website: UMAMI_WEBSITE_ID,
    },
  }

  console.log('[telemetry] forwarding to umami', JSON.stringify(umamiPayload))

  const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

  c.executionCtx.waitUntil(
    fetch(`${UMAMI_URL}/api/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${UMAMI_TOKEN}`,
        'User-Agent': userAgent,
      },
      body: JSON.stringify(umamiPayload),
    }).then(async (res) => {
      const text = await res.text()
      console.log(`[telemetry] umami response ${res.status}:`, text)
    }).catch((err) => {
      console.error('[telemetry] umami fetch failed:', err)
    }),
  )

  return c.json({ ok: true })
})

export default v1
