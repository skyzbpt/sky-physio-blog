// Wikimedia Commons（維基共享資源：解剖圖、醫學影像、運動照片很多）
// 授權逐張不同：只收 CC0、公眾領域、CC BY、CC BY-SA（排除 NC、ND 與其他授權）。
// CC BY／BY-SA 必須標註作者與授權 → 圖說自動加上。下載 1280px 縮圖、轉 WebP，存到 assets/photos/。
//
// 用法：
//   node tools/wikimedia.mjs search "shoulder anatomy" [--n 10]
//   node tools/wikimedia.mjs pick <文章 id> <Commons 頁面 id> [--alt "替代文字"]
// 不需要金鑰。Wikimedia 規定要帶能辨識用途的 User-Agent（已內建）；
// 匿名請求的流量較低，若常被限流（429），可到 api.wikimedia.org 申請個人 API token，
// 放進 .env.local 的 WIKIMEDIA_TOKEN 即可提高額度。
import { pathToFileURL } from 'url';
import { toWebp, setArticleFigure, link, run, usageError, PHOTO_DIR, WIKI_UA, optEnv } from './stock-lib.mjs';

const API = 'https://commons.wikimedia.org/w/api.php';

function headers() {
  const h = { 'User-Agent': WIKI_UA, 'Api-User-Agent': WIKI_UA };
  const t = optEnv('WIKIMEDIA_TOKEN');
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
}

// 被限流時照 Retry-After 等一下再試（最多 3 次）
async function wfetch(url) {
  for (let i = 0; ; i++) {
    const r = await fetch(url, { headers: headers() });
    if (r.status !== 429 || i >= 3) {
      if (!r.ok) throw new Error(r.status === 429
        ? 'Wikimedia 限流中（429）：稍後再試，或在 .env.local 設定 WIKIMEDIA_TOKEN'
        : `Wikimedia ${r.status} ${r.statusText}`);
      return r;
    }
    const wait = Math.min(60, +r.headers.get('retry-after') || 5 * (i + 1));
    console.warn(`⚠ Wikimedia 限流，${wait} 秒後重試…`);
    await new Promise(res => setTimeout(res, wait * 1000));
  }
}

const query = async params => (await wfetch(API + '?' + new URLSearchParams({
  action: 'query', format: 'json', formatversion: '2', prop: 'imageinfo',
  iiprop: 'url|size|mime|extmetadata', iiurlwidth: '1280',
  iiextmetadatafilter: 'License|LicenseShortName|LicenseUrl|Artist|ObjectName',
  ...params,
}))).json();

const meta = (ii, k) => ii.extmetadata?.[k]?.value || '';
const strip = s => String(s).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
// License 欄位是機器可讀代碼：cc0、pd、cc-by-4.0、cc-by-sa-3.0 …
const licenseOk = code => /^(cc0|pd|public domain|cc-by(-sa)?(-\d[\d.]*)?)$/i.test(code) || /^cc-by(-sa)?-\d/i.test(code);

function row(p) {
  const ii = p.imageinfo?.[0];
  if (!ii) return null;
  return {
    provider: 'wikimedia', id: String(p.pageid), desc: strip(meta(ii, 'ObjectName')) || p.title.replace(/^File:/, ''),
    w: ii.width, h: ii.height, author: strip(meta(ii, 'Artist')) || '佚名',
    license: meta(ii, 'LicenseShortName') || meta(ii, 'License'), licenseCode: meta(ii, 'License'),
    licenseUrl: meta(ii, 'LicenseUrl'), page: ii.descriptionurl, preview: ii.thumburl, file: ii.thumburl, mime: ii.mime,
  };
}

export async function search(q, n = 10) {
  const d = await query({ generator: 'search', gsrnamespace: '6', gsrsearch: `${q} filetype:bitmap`, gsrlimit: String(Math.min(50, n * 4)) });
  return (d.query?.pages || [])
    .sort((a, b) => a.index - b.index).map(row)
    .filter(r => r && /jpeg|png/.test(r.mime) && r.w >= 1000 && r.w > r.h && licenseOk(r.licenseCode))
    .slice(0, n);
}

export async function pick(articleId, pageId, { alt } = {}) {
  const p = (await query({ pageids: pageId })).query?.pages?.[0];
  const r = p && row(p);
  if (!r) throw new Error(`Wikimedia 找不到頁面 ${pageId}`);
  if (!licenseOk(r.licenseCode)) throw new Error(`這張的授權是「${r.license}」，不在可商用＋可改作範圍，不能用`);
  const buf = Buffer.from(await (await wfetch(r.file)).arrayBuffer());
  const out = `${PHOTO_DIR}/${articleId}.webp`;
  const img = await toWebp(buf, out);
  const lic = r.licenseUrl ? link(r.licenseUrl, r.license) : r.license;
  const html = setArticleFigure(articleId, {
    src: '/' + out, w: img.w, h: img.h, ...(alt ? { alt } : {}),
    credit: `圖片：${link(r.page, r.author.slice(0, 60))}／${lic}／Wikimedia Commons`,
  });
  return { out, ...img, html, license: r.license };
}

const USAGE = `用法：
  node tools/wikimedia.mjs search "<關鍵字>" [--n 10]
  node tools/wikimedia.mjs pick <文章 id> <Commons 頁面 id> [--alt "替代文字"]`;

if (import.meta.url === pathToFileURL(process.argv[1]).href) run(async ({ pos: [cmd, a, b], opt }) => {
  if (cmd === 'search' && a) {
    for (const r of await search(a, +opt.n || 10)) console.log(`${r.id}\t${r.w}×${r.h}\t${r.license}\t${r.author.slice(0, 40)}\t${r.desc.slice(0, 60)}\n\t${r.page}`);
  } else if (cmd === 'pick' && a && b) {
    const r = await pick(a, b, { alt: opt.alt });
    console.log(`✓ ${r.out}（${r.w}×${r.h}，${Math.round(r.bytes / 1024)}KB，${r.license}）已放進文章 ${a}；記得 npm run build`);
  } else throw usageError('參數不足');
}, USAGE);
