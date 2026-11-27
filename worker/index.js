// 文章閱讀次數 API（Cloudflare Worker，綁定 D1 資料庫 skyblog-views）
//
// 網站其餘部分仍是純靜態檔：wrangler.jsonc 的 run_worker_first 只把 /api/* 交給這支程式，
// 其他網址照舊由 Cloudflare 直接服務 dist/ 的靜態檔（_headers、_redirects 照常生效）。
//
//   GET  /api/views         → { "slug": 次數, ... } 全站文章的閱讀次數（/blog 排熱門用，快取 5 分鐘）
//   GET  /api/views/:slug   → { "n": 次數 }        只讀不加
//   POST /api/views/:slug   → { "n": 次數 }        加一後回傳（posts/*.html 載入時由 assets/post.js 呼叫）
//
// 只記「哪篇文章被讀了幾次」這一個數字：不存 IP、Cookie、裝置或任何能辨識讀者的資料。
// 同一個分頁重複整理不重算，由 post.js 用 sessionStorage 判斷（關掉分頁即清除）。
//
// 資料表（已在 D1 建立）：
//   CREATE TABLE views (slug TEXT PRIMARY KEY, n INTEGER NOT NULL DEFAULT 0, updated_at TEXT)

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,99}$/;
// 搜尋引擎、社群預覽、測速工具不算讀者
const BOT_RE = /bot|crawl|spider|slurp|preview|headless|lighthouse|pagespeed|facebookexternalhit|embedly|curl|wget|python|node-fetch|axios/i;

const HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'x-content-type-options': 'nosniff',
  'x-robots-tag': 'noindex',
};
const json = (body, status = 200, extra = {}) =>
  new Response(JSON.stringify(body), { status, headers: { ...HEADERS, ...extra } });

// 只接受站上真的存在的文章，避免有人灌入任意網址把資料表塞滿。
// 文章清單取自同一次部署的 /assets/articles-index.json，在同一個 isolate 內快取 10 分鐘。
let known = null, knownAt = 0;
async function knownSlugs(env, url) {
  if (known && Date.now() - knownAt < 600_000) return known;
  const r = await env.ASSETS.fetch(new URL('/assets/articles-index.json', url));
  if (!r.ok) return known || new Set();
  known = new Set((await r.json()).map(a => a.id));
  knownAt = Date.now();
  return known;
}

async function handleApi(request, env) {
  const url = new URL(request.url);
  const m = url.pathname.match(/^\/api\/views(?:\/([^/]+))?\/?$/);
  if (!m) return json({ error: 'not found' }, 404);
  const slug = m[1] ? decodeURIComponent(m[1]) : null;

  if (!slug) {
    if (request.method !== 'GET') return json({ error: 'method not allowed' }, 405, { allow: 'GET' });
    const { results } = await env.DB.prepare('SELECT slug, n FROM views WHERE n > 0').all();
    const out = {};
    for (const r of results) out[r.slug] = r.n;
    return json(out, 200, { 'cache-control': 'public, max-age=300' });
  }

  if (!SLUG_RE.test(slug) || !(await knownSlugs(env, url)).has(slug)) return json({ error: 'unknown article' }, 404);

  if (request.method === 'GET') {
    const row = await env.DB.prepare('SELECT n FROM views WHERE slug = ?').bind(slug).first();
    return json({ n: row ? row.n : 0 }, 200, { 'cache-control': 'no-store' });
  }
  if (request.method === 'POST') {
    // 只接受本站頁面發出的請求（瀏覽器的 fetch POST 一定帶 Origin）
    const origin = request.headers.get('origin');
    if (origin && origin !== url.origin) return json({ error: 'forbidden' }, 403);
    const ua = request.headers.get('user-agent') || '';
    if (!ua || BOT_RE.test(ua)) {
      const row = await env.DB.prepare('SELECT n FROM views WHERE slug = ?').bind(slug).first();
      return json({ n: row ? row.n : 0 }, 200, { 'cache-control': 'no-store' });
    }
    const row = await env.DB.prepare(
      `INSERT INTO views (slug, n, updated_at) VALUES (?, 1, datetime('now'))
       ON CONFLICT(slug) DO UPDATE SET n = n + 1, updated_at = datetime('now')
       RETURNING n`
    ).bind(slug).first();
    return json({ n: row.n }, 200, { 'cache-control': 'no-store' });
  }
  return json({ error: 'method not allowed' }, 405, { allow: 'GET, POST' });
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/views' || pathname.startsWith('/api/views/')) {
      try { return await handleApi(request, env); }
      catch (e) { return json({ error: 'unavailable' }, 503, { 'cache-control': 'no-store' }); }
    }
    return env.ASSETS.fetch(request);
  },
};
