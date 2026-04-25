import { Hono } from 'hono'
import type { Bindings, TrackBody } from '../types'

const v1 = new Hono<{ Bindings: Bindings }>()

v1.post('/send', async (c) => {
  const { UMAMI_URL, UMAMI_WEBSITE_ID, UMAMI_TOKEN } = c.env

  if (!UMAMI_URL || !UMAMI_WEBSITE_ID) {
    return c.json({ error: 'Umami not configured' }, 503)
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

  const forwarded = c.req.header('x-forwarded-for')
  const userAgent = c.req.header('user-agent') ?? ''

  const res = await fetch(`${UMAMI_URL}/api/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(UMAMI_TOKEN && { Authorization: `Bearer ${UMAMI_TOKEN}` }),
      'User-Agent': userAgent,
      ...(forwarded && { 'X-Forwarded-For': forwarded }),
    },
    body: JSON.stringify({
      type: body.type ?? 'event',
      payload: {
        ...body.payload,
        website: UMAMI_WEBSITE_ID,
      },
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    return c.json({ error: 'Upstream error', detail: text }, 502)
  }

  return c.json({ ok: true })
})

export default v1
