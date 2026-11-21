// Vecteezy 圖庫（V2 API）
// 授權：免費內容可商用，但必須標註出處（圖說自動加「Vecteezy」連結）；請勿轉售或單獨散布原檔。
// 規定：圖片要下載後自行託管 → 下載 large 尺寸、轉 WebP，存到 assets/photos/<文章 id>.webp
// 注意：下載（pick）會消耗帳號的下載額度（API 帳號每月 500 次），搜尋則只看浮水印縮圖、不扣額度。
// 只用 license_type=commercial 的圖（editorial 只限新聞報導，不能拿來當衛教配圖），並排除 AI 生成圖。
//
// 用法：
//   node tools/vecteezy.mjs search "road cycling" [--n 10]
//   node tools/vecteezy.mjs pick <文章 id> <Vecteezy 資源 id> [--alt "替代文字"]
// 金鑰：.env.local 的 VECTEEZY_ACCOUNT_ID、VECTEEZY_SECRET_KEY
import { pathToFileURL } from 'url';
import { env, getJSON, getBuffer, toWebp, setArticleFigure, link, run, usageError, PHOTO_DIR } from './stock-lib.mjs';

const base = () => `https://api.vecteezy.com/v2/${env('VECTEEZY_ACCOUNT_ID')}`;
const auth = () => ({ Authorization: `Bearer ${env('VECTEEZY_SECRET_KEY')}`, Accept: 'application/json' });
const page = id => `https://www.vecteezy.com/photo/${id}`;

export async function search(query, n = 10) {
  const d = await getJSON(`${base()}/resources?` + new URLSearchParams({
    term: query, content_type: 'photo', license_type: 'commercial', ai_generated: 'false',
    per_page: String(Math.min(100, Math.max(n, 3))) }), auth());
  return (d.resources || []).slice(0, n).map(r => {
    const big = (r.file_metadata?.available_download_sizes || []).find(s => s.id === 'original')
      || (r.file_metadata?.available_download_sizes || [])[0] || {};
    return { provider: 'vecteezy', id: String(r.id), desc: r.title || '', w: big.width || 0, h: big.height || 0,
      author: 'Vecteezy', license: 'Vecteezy', page: page(r.id), preview: r.thumbnail_2x_url || r.thumbnail_url };
  });
}

export async function pick(articleId, resId, { alt } = {}) {
  const meta = await getJSON(`${base()}/resources/${resId}`, auth());
  if (meta.content_type !== 'photo') throw new Error(`Vecteezy ${resId} 不是照片（${meta.content_type}）`);
  if (meta.license_type !== 'commercial') throw new Error(`Vecteezy ${resId} 的授權是「${meta.license_type}」（editorial 只限新聞報導），不能用`);
  if (meta.ai_generated) throw new Error(`Vecteezy ${resId} 是 AI 生成圖，衛教文章不用`);
  const dl = await getJSON(`${base()}/resources/${resId}/download?size=large`, auth());
  if (!dl.url) throw new Error('Vecteezy 沒有回傳下載網址（可能是額度用完或需要 Pro 授權）');
  const out = `${PHOTO_DIR}/${articleId}.webp`;
  const img = await toWebp(await getBuffer(dl.url), out);
  const html = setArticleFigure(articleId, {
    src: '/' + out, w: img.w, h: img.h, ...(alt ? { alt } : {}),
    credit: `圖片：${link(page(resId), 'Vecteezy')}`,
  });
  return { out, ...img, html };
}

const USAGE = `用法：
  node tools/vecteezy.mjs search "<關鍵字>" [--n 10]
  node tools/vecteezy.mjs pick <文章 id> <Vecteezy 資源 id> [--alt "替代文字"]`;

if (import.meta.url === pathToFileURL(process.argv[1]).href) run(async ({ pos: [cmd, a, b], opt }) => {
  if (cmd === 'search' && a) {
    for (const r of await search(a, +opt.n || 10)) console.log(`${r.id}\t${r.w}×${r.h}\t${r.desc.slice(0, 80)}\n\t${r.page}`);
  } else if (cmd === 'pick' && a && b) {
    const r = await pick(a, b, { alt: opt.alt });
    console.log(`✓ ${r.out}（${r.w}×${r.h}，${Math.round(r.bytes / 1024)}KB）已放進文章 ${a}；記得 npm run build`);
  } else throw usageError('參數不足');
}, USAGE);
