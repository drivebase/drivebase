import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = {
  UMAMI_URL: string
  UMAMI_WEBSITE_ID: string
}

type EventPayload = {
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

type TrackBody = {
  type: 'event'
  payload: EventPayload
}

const app = new Hono<{ Bindings: Bindings }>()
const v1 = new Hono<{ Bindings: Bindings }>()

app.use('*', cors())

app.get('/', (c) => c.json({ ok: true }))

app.route('/v1', v1)

v1.post('/send', async (c) => {
  const { UMAMI_URL, UMAMI_WEBSITE_ID } = c.env

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

export default app
