/**
 * POST /api/sessions
 * Receives behavioral capture payloads from the SW1FT SDK.
 */
export async function onRequestPost(context) {
  const { request, env } = context;

  // CORS headers — allow any origin so the SDK can POST from any site
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-SW1FT-Key',
  };

  // Validate API key header
  const apiKey = request.headers.get('X-SW1FT-Key') || '';
  if (!apiKey.startsWith('sw1ft_live_')) {
    return new Response(
      JSON.stringify({ error: 'Invalid or missing API key' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const sessionId = body.sessionId || ('ses_' + Date.now().toString(36));

  // If a KV namespace SW1FT_SESSIONS is bound, persist the payload
  if (env.SW1FT_SESSIONS) {
    await env.SW1FT_SESSIONS.put(
      sessionId,
      JSON.stringify({ ...body, receivedAt: new Date().toISOString() }),
      { expirationTtl: 60 * 60 * 24 * 30 } // 30 days
    );
  }

  return new Response(
    JSON.stringify({ ok: true, sessionId, status: 'received' }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Handle CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-SW1FT-Key',
    },
  });
}
