// Pixabay 圖庫（Pixabay Content License：可商用、不強制標註；仍標出處）
// 規定：不可長期熱連結 Pixabay 的圖片網址 → 下載、轉 WebP，存到 assets/photos/<文章 id>.webp
//
// 用法：
//   node tools/pixabay.mjs search "road cycling" [--n 10]
//   node tools/pixabay.mjs pick <文章 id> <Pixabay 圖片 id> [--alt "替代文字"]
// 金鑰：.env.local 的 PIXABAY_API_KEY（每分鐘 100 次）
import { pathToFileURL } from 'url';
import { env, getJSON, getBuffer, toWebp, setArticleFigure, link, run, usageError, PHOTO_DIR } from './stock-lib.mjs';

const API = 'https://pixabay.com/api/';
const q = params => API + '?' + new URLSearchParams({ key: env('PIXABAY_API_KEY'), ...params });

export async function search(query, n = 10) {
  const d = await getJSON(q({ q: query, image_type: 'photo', orientation: 'horizontal', safesearch: 'true',
    min_width: 1200, order: 'popular', per_page: Math.max(3, Math.min(200, n)) }));
  return d.hits.slice(0, n).map(h => ({
    provider: 'pixabay', id: String(h.id), desc: h.tags, w: h.imageWidth, h: h.imageHeight,
    author: h.user, license: 'Pixabay', page: h.pageURL, preview: h.webformatURL,
  }));
}

export async function pick(articleId, imageId, { alt } = {}) {
  const h = (await getJSON(q({ id: imageId }))).hits[0];
  if (!h) throw new Error(`Pixabay 找不到圖片 ${imageId}`);
  const out = `${PHOTO_DIR}/${articleId}.webp`;
  const img = await toWebp(await getBuffer(h.largeImageURL), out);
  const html = setArticleFigure(articleId, {
    src: '/' + out, w: img.w, h: img.h, ...(alt ? { alt } : {}),
    credit: `圖片：${h.user}／${link(h.pageURL, 'Pixabay')}`,
  });
  return { out, ...img, html };
}

const USAGE = `用法：
  node tools/pixabay.mjs search "<關鍵字>" [--n 10]
  node tools/pixabay.mjs pick <文章 id> <Pixabay 圖片 id> [--alt "替代文字"]`;

if (import.meta.url === pathToFileURL(process.argv[1]).href) run(async ({ pos: [cmd, a, b], opt }) => {
  if (cmd === 'search' && a) {
    for (const r of await search(a, +opt.n || 10)) console.log(`${r.id}\t${r.w}×${r.h}\t${r.author}\t${r.desc}\n\t${r.page}`);
  } else if (cmd === 'pick' && a && b) {
    const r = await pick(a, b, { alt: opt.alt });
    console.log(`✓ ${r.out}（${r.w}×${r.h}，${Math.round(r.bytes / 1024)}KB）已放進文章 ${a}；記得 npm run build`);
  } else throw usageError('參數不足');
}, USAGE);
