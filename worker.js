const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-SW1FT-Key',
};

const SESSIONS_KEY = 'sessions_list';
const MAX_STORED   = 200;

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

      const sessionId = body.session_id || body.sessionId || ('ses_' + Date.now().toString(36));
      const record = { ...body, session_id: sessionId, receivedAt: new Date().toISOString() };

      if (env.SW1FT_SESSIONS) {
        // Store individual session for direct lookup
        await env.SW1FT_SESSIONS.put(
          `ses:${sessionId}`,
          JSON.stringify(record),
          { expirationTtl: 60 * 60 * 24 * 30 },
        );
        // Update rolling list (read-modify-write; fine at demo scale)
        const existing = await env.SW1FT_SESSIONS.get(SESSIONS_KEY, { type: 'json' }) ?? [];
        const updated = [record, ...existing.filter(s => s.session_id !== sessionId)].slice(0, MAX_STORED);
        await env.SW1FT_SESSIONS.put(SESSIONS_KEY, JSON.stringify(updated), { expirationTtl: 60 * 60 * 24 * 30 });
      }

      return json({ ok: true, sessionId, status: 'received' }, 200);
    }

    // GET /api/sessions — return stored sessions (dashboard polling)
    if (request.method === 'GET' && url.pathname === '/api/sessions') {
      const sessions = (env.SW1FT_SESSIONS
        ? await env.SW1FT_SESSIONS.get(SESSIONS_KEY, { type: 'json' })
        : null) ?? [];
      const limit = parseInt(url.searchParams.get('limit') ?? '50', 10);
      return json({ sessions: sessions.slice(0, limit), total: sessions.length }, 200);
    }

    // DELETE /api/sessions/:id — remove a single session
    if (request.method === 'DELETE' && url.pathname.startsWith('/api/sessions/')) {
      const id = url.pathname.split('/').pop();
      if (env.SW1FT_SESSIONS && id) {
        await env.SW1FT_SESSIONS.delete(`ses:${id}`);
        const existing = await env.SW1FT_SESSIONS.get(SESSIONS_KEY, { type: 'json' }) ?? [];
        const updated = existing.filter(s => s.session_id !== id);
        await env.SW1FT_SESSIONS.put(SESSIONS_KEY, JSON.stringify(updated));
      }
      return json({ ok: true }, 200);
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
