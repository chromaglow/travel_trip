// NL Recon 2026 — Cloudflare Worker
// Handles push (editor → KV) and state (viewer ← KV)

const WRITE_KEY  = 'recon2026push';
const VIEWER_PIN = '1701';
const KV_KEY     = 'nl-recon-2026';

// Origins allowed for CORS
const ALLOWED_ORIGINS = [
  'https://recklesspeach.com',
  'https://www.recklesspeach.com',
];

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin':  allowed,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Write-Key',
    'Access-Control-Max-Age':       '86400',
  };
}

function json(data, status = 200, origin = '') {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(origin),
    },
  });
}

export default {
  async fetch(request, env) {
    const url    = new URL(request.url);
    const origin = request.headers.get('Origin') || '';

    // Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (url.pathname === '/api/push' && request.method === 'POST') {
      return handlePush(request, env, origin);
    }

    if (url.pathname === '/api/state' && request.method === 'GET') {
      return handleState(request, env, origin);
    }

    return json({ error: 'Not found' }, 404, origin);
  },
};

// ── POST /api/push ─────────────────────────────────────────────────────────
async function handlePush(request, env, origin) {
  const writeKey = request.headers.get('X-Write-Key');
  if (writeKey !== WRITE_KEY) {
    return json({ error: 'Unauthorized' }, 401, origin);
  }

  let incoming;
  try {
    incoming = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400, origin);
  }

  // Read existing document (may not exist on first push)
  const existing = await env.NL_RECON_KV.get(KV_KEY, 'json') || {};

  // Merge state: incoming is authoritative
  const merged = {
    editorId: incoming.editorId || 'nl-recon-2026',
    pushedAt: new Date().toISOString(), // server time
    state:    incoming.state || {},
    photos:   {}
  };

  // Photos: incoming array is authoritative per city; deduplicate by exact base64 match
  const cities = ['haarlem', 'rotterdam', 'utrecht', 'amersfoort'];
  for (const city of cities) {
    const incomingArr = (incoming.photos && incoming.photos[city]) || [];
    // deduplicate within incoming array
    merged.photos[city] = [...new Set(incomingArr)];
  }

  await env.NL_RECON_KV.put(KV_KEY, JSON.stringify(merged));

  return json({ ok: true, pushedAt: merged.pushedAt }, 200, origin);
}

// ── GET /api/state ─────────────────────────────────────────────────────────
async function handleState(request, env, origin) {
  const url = new URL(request.url);
  const pin = url.searchParams.get('pin');
  if (pin !== VIEWER_PIN) {
    return json({ error: 'Unauthorized' }, 401, origin);
  }

  const doc = await env.NL_RECON_KV.get(KV_KEY, 'json');

  if (!doc) {
    // No push yet — return empty state
    return json({
      editorId: 'nl-recon-2026',
      pushedAt: null,
      state:    {},
      photos:   { haarlem: [], rotterdam: [], utrecht: [], amersfoort: [] }
    }, 200, origin);
  }

  return json(doc, 200, origin);
}
