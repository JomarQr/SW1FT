const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-SW1FT-Key',
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS' && url.pathname.startsWith('/api/')) {
      return new Response(null, { status: 204, headers: CORS });
    }

    // POST /api/sessions — receive SDK behavioral payload
    if (request.method === 'POST' && url.pathname === '/api/sessions') {
      const apiKey = request.headers.get('X-SW1FT-Key') || '';
      if (!apiKey.startsWith('sw1ft_live_')) {
        return json({ error: 'Invalid or missing API key' }, 401);
      }

      let body;
      try { body = await request.json(); }
      catch { return json({ error: 'Invalid JSON body' }, 400); }

      const sessionId = body.sessionId || ('ses_' + Date.now().toString(36));

      if (env.SW1FT_SESSIONS) {
        await env.SW1FT_SESSIONS.put(
          sessionId,
          JSON.stringify({ ...body, receivedAt: new Date().toISOString() }),
          { expirationTtl: 60 * 60 * 24 * 30 }
        );
      }

      return json({ ok: true, sessionId, status: 'received' }, 200);
    }

    // Static file (has extension) — serve directly
    if (/\.[a-z0-9]{1,8}$/i.test(url.pathname)) {
      try { return await env.ASSETS.fetch(request); }
      catch (_) { return new Response('Not found', { status: 404 }); }
    }

    // SPA route — always serve index.html
    try {
      return await env.ASSETS.fetch(`${url.protocol}//${url.host}/index.html`);
    } catch (e) {
      return new Response(`Failed to load app: ${e instanceof Error ? e.message : String(e)}`, { status: 500 });
    }
  },
};

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
