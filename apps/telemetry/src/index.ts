import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Bindings } from './types'
import v1 from './routes/v1'

const app = new Hono<{ Bindings: Bindings }>()

app.use('*', cors())

app.get('/', (c) => c.json({ ok: true, time: new Date().toISOString() }))

app.route('/v1', v1)

export default app
