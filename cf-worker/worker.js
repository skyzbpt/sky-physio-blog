/**
 * Sky 物理治療師 — 衛教文章點閱計數 Worker（Cloudflare Workers + KV）
 *
 * 端點：
 *   POST /hit   body: {"slug":"article-id"}   → 累加並回傳 {slug, count}
 *   GET  /get?slugs=a,b,c                      → 回傳 {counts:{a:1,b:2,c:0}}（唯讀，不累加）
 *   GET  /health                               → {ok:true}
 *
 * 綁定：KV namespace 綁為變數名 VIEWS
 * CORS：僅允許正式網域 https://skythephysio.com（可於 ALLOW_ORIGINS 增列）
 */
const ALLOW_ORIGINS = [
  'https://skythephysio.com',
  'https://www.skythephysio.com',
];

function corsHeaders(origin) {
  const allow = ALLOW_ORIGINS.includes(origin) ? origin : ALLOW_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
    'Cache-Control': 'no-store',
  };
}

// 只允許小寫英數與連字號，長度上限 80，與文章 slug 規則一致
const sanitize = s => (s || '').toString().toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 80);

const json = (obj, status, headers) =>
  new Response(JSON.stringify(obj), { status, headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' } });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = corsHeaders(request.headers.get('Origin') || '');

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    if (url.pathname === '/health') return json({ ok: true }, 200, cors);

    if (!env.VIEWS) return json({ error: 'KV 未綁定（請將 KV namespace 綁為變數 VIEWS）' }, 500, cors);

    // 累加單篇
    if (request.method === 'POST' && url.pathname === '/hit') {
      let slug = '';
      try { slug = (await request.json()).slug; } catch (_) { slug = url.searchParams.get('slug'); }
      slug = sanitize(slug);
      if (!slug) return json({ error: 'bad slug' }, 400, cors);
      const cur = parseInt(await env.VIEWS.get(slug), 10) || 0;
      const next = cur + 1;
      await env.VIEWS.put(slug, String(next));
      return json({ slug, count: next }, 200, cors);
    }

    // 批次讀取（唯讀）
    if (request.method === 'GET' && url.pathname === '/get') {
      const slugs = (url.searchParams.get('slugs') || '')
        .split(',').map(sanitize).filter(Boolean).slice(0, 100);
      const pairs = await Promise.all(
        slugs.map(async s => [s, parseInt(await env.VIEWS.get(s), 10) || 0])
      );
      return json({ counts: Object.fromEntries(pairs) }, 200, cors);
    }

    return json({ error: 'not found' }, 404, cors);
  },
};
