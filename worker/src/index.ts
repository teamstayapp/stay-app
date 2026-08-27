/**
 * Stay API — nøgler bor her, ikke i PWA.
 * wrangler secret put VENICE_API_KEY
 */
export interface Env {
  VENICE_API_KEY?: string
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url)
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: cors() })
    }

    if (url.pathname === '/health') {
      return json({ ok: true, venice: Boolean(env.VENICE_API_KEY) })
    }

    if (url.pathname === '/chat' && req.method === 'POST') {
      if (!env.VENICE_API_KEY) {
        return json({ error: 'VENICE_API_KEY mangler på Worker' }, 501)
      }
      const body = await req.json().catch(() => ({}))
      const venice = await fetch('https://api.venice.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.VENICE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'venice-uncensored-role-play',
          messages: (body as { messages?: unknown }).messages ?? [],
        }),
      })
      const data = await venice.json()
      return json(data, venice.status)
    }

    return json({ error: 'not found' }, 404)
  },
}

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  }
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors() },
  })
}
