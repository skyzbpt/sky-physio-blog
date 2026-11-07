// Unsplash 圖庫（Unsplash License：可商用）
// API 條款（與 Pixabay 相反）：
//   1. 必須直接引用 Unsplash 回傳的圖片網址（images.unsplash.com），不可下載自行託管
//   2. 每用一張，要呼叫該圖的 download_location 回報
//   3. 標註攝影師與 Unsplash，並連回去（帶 utm 參數）
//   4. 人工挑圖使用，不可大量自動批次搜尋
// 網站 CSP 已放行 https://images.unsplash.com（見 _headers）。
//
// 用法：
//   node tools/unsplash.mjs search "cyclist" [--n 10]
//   node tools/unsplash.mjs pick <文章 id> <Unsplash 圖片 id> [--alt "替代文字"]
// 金鑰：.env.local 的 UNSPLASH_ACCESS_KEY（Demo 每小時 50 次）
import { pathToFileURL } from 'url';
import { env, getJSON, setArticleFigure, link, run, usageError, PHOTO_W } from './stock-lib.mjs';

const API = 'https://api.unsplash.com';
const APP = 'sky-physio-blog';
const auth = () => ({ Authorization: `Client-ID ${env('UNSPLASH_ACCESS_KEY')}`, 'Accept-Version': 'v1' });
const utm = url => `${url}${url.includes('?') ? '&' : '?'}utm_source=${APP}&utm_medium=referral`;

export async function search(query, n = 10) {
  const d = await getJSON(`${API}/search/photos?` + new URLSearchParams({
    query, orientation: 'landscape', content_filter: 'high', per_page: Math.min(30, n),
  }), auth());
  // Unsplash+ 的付費圖不在免費授權內，排除
  return d.results.filter(r => !r.premium && !r.plus).slice(0, n).map(r => ({
    provider: 'unsplash', id: r.id, desc: r.alt_description || r.description || '', w: r.width, h: r.height,
    author: r.user.name, license: 'Unsplash', page: r.links.html, preview: r.urls.small,
  }));
}

export async function pick(articleId, imageId, { alt } = {}) {
  const h = auth();
  const r = await getJSON(`${API}/photos/${imageId}`, h);
  if (r.premium || r.plus) throw new Error('這張是 Unsplash+ 付費圖，不能用');
  await getJSON(r.links.download_location, h);   // 條款 2：回報使用
  const src = `${r.urls.raw}&w=${PHOTO_W}&q=75&fm=webp&fit=max`;   // 條款 1：保留 ixid 熱連結
  const html = setArticleFigure(articleId, {
    src, w: PHOTO_W, h: Math.round(r.height * PHOTO_W / r.width), ...(alt ? { alt } : {}),
    credit: `圖片：${link(utm(r.user.links.html), r.user.name)}／${link(utm('https://unsplash.com/'), 'Unsplash')}`,
  });
  return { src, html };
}

const USAGE = `用法：
  node tools/unsplash.mjs search "<關鍵字>" [--n 10]
  node tools/unsplash.mjs pick <文章 id> <Unsplash 圖片 id> [--alt "替代文字"]`;

if (import.meta.url === pathToFileURL(process.argv[1]).href) run(async ({ pos: [cmd, a, b], opt }) => {
  if (cmd === 'search' && a) {
    for (const r of await search(a, +opt.n || 10)) console.log(`${r.id}\t${r.w}×${r.h}\t${r.author}\t${r.desc}\n\t${r.page}`);
  } else if (cmd === 'pick' && a && b) {
    await pick(a, b, { alt: opt.alt });
    console.log(`✓ 已把 Unsplash ${b} 放進文章 ${a}（外連圖，已回報 download）；記得 npm run build`);
  } else throw usageError('參數不足');
}, USAGE);
