// Openverse（集合 Flickr、Wikimedia 等的 CC 授權與公眾領域圖片）
// 授權逐張不同：只搜「可商用＋可改作」（排除 NC、ND）；CC BY／BY-SA 必須標註作者與授權。
// 原圖散在各網站，下載一律走 Openverse 自己的縮圖服務（full_size），再轉 WebP 存到 assets/photos/。
//
// 用法：
//   node tools/openverse.mjs search "physiotherapy" [--n 10]
//   node tools/openverse.mjs pick <文章 id> <Openverse 圖片 id> [--alt "替代文字"]
// 金鑰：.env.local 的 OPENVERSE_CLIENT_ID、OPENVERSE_CLIENT_SECRET（每次執行換一次約 12 小時的存取權杖）
import { pathToFileURL } from 'url';
import { env, getJSON, getBuffer, toWebp, setArticleFigure, link, run, usageError, PHOTO_DIR, WIKI_UA } from './stock-lib.mjs';

const API = 'https://api.openverse.org/v1';
const OK_LICENSES = new Set(['cc0', 'pdm', 'by', 'by-sa']);   // 可商用、可改作

let token;
async function auth() {
  if (token) return token;
  const r = await fetch(`${API}/auth_tokens/token/`, {
    method: 'POST',
    body: new URLSearchParams({ grant_type: 'client_credentials',
      client_id: env('OPENVERSE_CLIENT_ID'), client_secret: env('OPENVERSE_CLIENT_SECRET') }),
  });
  if (!r.ok) throw new Error(`Openverse 換權杖失敗：${r.status}`);
  token = { Authorization: `Bearer ${(await r.json()).access_token}` };
  return token;
}

const licenseName = r => r.license === 'cc0' ? 'CC0' : r.license === 'pdm' ? '公眾領域'
  : `CC ${r.license.toUpperCase()} ${r.license_version || ''}`.trim();

export async function search(query, n = 10) {
  const d = await getJSON(`${API}/images/?` + new URLSearchParams({
    q: query, license_type: 'commercial,modification', mature: 'false',
    aspect_ratio: 'wide', size: 'large', page_size: Math.min(50, n * 2),
  }), await auth());
  return d.results.filter(r => OK_LICENSES.has(r.license)).slice(0, n).map(r => ({
    provider: 'openverse', id: r.id, desc: r.title || '', w: r.width, h: r.height,
    author: r.creator || '佚名', license: `${licenseName(r)}（${r.source}）`, page: r.foreign_landing_url, preview: r.thumbnail,
  }));
}

// 下載順序：Openverse 縮圖服務（全尺寸）→ 來源網站原圖。
// Wikimedia 的圖 Openverse 縮圖服務常回 424，改向 Wikimedia 自己的縮圖服務拿 1280px 版
// （需要能連 upload.wikimedia.org；Wikimedia 規定要帶能辨識用途的 User-Agent）。
async function download(r, h) {
  try { return await getBuffer(`${API}/images/${r.id}/thumb/?full_size=true`, h); } catch {}
  let url = r.url;
  const wm = url.match(/^https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/(\w\/\w\w)\/([^/]+)$/);
  if (wm && r.width > 1280) url = `https://upload.wikimedia.org/wikipedia/commons/thumb/${wm[1]}/${wm[2]}/1280px-${wm[2]}`;
  try { return await getBuffer(url, { 'User-Agent': WIKI_UA }); }
  catch (e) { throw new Error(`下載失敗（Openverse 縮圖服務與來源網站都失敗）：${e.message}`); }
}

export async function pick(articleId, imageId, { alt } = {}) {
  const h = await auth();
  const r = await getJSON(`${API}/images/${imageId}/`, h);
  if (!OK_LICENSES.has(r.license)) throw new Error(`這張是 ${licenseName(r)}，禁止商用或改作，不能用`);
  const out = `${PHOTO_DIR}/${articleId}.webp`;
  const img = await toWebp(await download(r, h), out);
  const lic = link(r.license_url, licenseName(r));   // 沒有（或不是 http(s)）授權網址時，link() 只輸出跳脫後的純文字
  const html = setArticleFigure(articleId, {
    src: '/' + out, w: img.w, h: img.h, ...(alt ? { alt } : {}),
    credit: `圖片：${link(r.foreign_landing_url, r.creator || '佚名')}／${lic}／經 Openverse`,
  });
  return { out, ...img, html, license: licenseName(r) };
}

const USAGE = `用法：
  node tools/openverse.mjs search "<關鍵字>" [--n 10]
  node tools/openverse.mjs pick <文章 id> <Openverse 圖片 id> [--alt "替代文字"]`;

if (import.meta.url === pathToFileURL(process.argv[1]).href) run(async ({ pos: [cmd, a, b], opt }) => {
  if (cmd === 'search' && a) {
    for (const r of await search(a, +opt.n || 10)) console.log(`${r.id}\t${r.w}×${r.h}\t${r.license}\t${r.author}\t${r.desc}\n\t${r.page}`);
  } else if (cmd === 'pick' && a && b) {
    const r = await pick(a, b, { alt: opt.alt });
    console.log(`✓ ${r.out}（${r.w}×${r.h}，${Math.round(r.bytes / 1024)}KB，${r.license}）已放進文章 ${a}；記得 npm run build`);
  } else throw usageError('參數不足');
}, USAGE);
