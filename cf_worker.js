/**
 * cf_worker.js — Cloudflare Worker CORS Proxy
 * Deploy gratis di: https://workers.cloudflare.com
 *
 * Cara pakai dari index.html:
 *   fetch('https://NAMA_WORKER.NAMA.workers.dev/?url=https://target.com/...')
 */

const ALLOWED_ORIGINS = ['*']; // Ganti dengan domain Anda jika perlu

const CORS_HEADERS = {
  'Access-Control-Allow-Origin' : '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  // Handle preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const url    = new URL(request.url);
  const target = url.searchParams.get('url');

  if (!target) {
    return new Response(JSON.stringify({ error: 'Parameter ?url= diperlukan' }), {
      status : 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }

  // Whitelist domain yang diizinkan
  const WHITELIST = [
    'angkanet.com',
    'raw.githubusercontent.com',
    'paito.ws',
    'lotto188.net',
  ];

  let allowed = false;
  for (const domain of WHITELIST) {
    if (target.includes(domain)) { allowed = true; break; }
  }
  if (!allowed) {
    return new Response(JSON.stringify({ error: 'Domain tidak diizinkan' }), {
      status : 403,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }

  try {
    const resp = await fetch(target, {
      headers: {
        'User-Agent'     : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept'         : 'text/html,application/json,*/*',
        'Accept-Language': 'id-ID,id;q=0.9',
        'Referer'        : 'https://www.google.com/',
      }
    });

    const contentType = resp.headers.get('content-type') || 'text/plain';
    const body        = await resp.arrayBuffer();

    return new Response(body, {
      status : resp.status,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': contentType,
        'X-Proxy-By'  : 'Scanner-Pro-Worker',
      }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status : 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }
}
