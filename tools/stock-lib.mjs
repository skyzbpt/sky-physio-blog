// 圖庫串接的共用工具：讀金鑰、轉 WebP、把配圖寫進 data/articles.json
//
// 金鑰放在 repo 根目錄的 .env.local（已列入 .gitignore，絕不提交）：
//   PIXABAY_API_KEY=…
//   OPENVERSE_CLIENT_ID=…　OPENVERSE_CLIENT_SECRET=…
//   UNSPLASH_ACCESS_KEY=…
//   WIKIMEDIA_TOKEN=…（選填，Wikimedia 不需金鑰；有的話額度較高）
// 也可以直接用同名的環境變數。
//
// 各圖庫的工具：tools/pixabay.mjs、tools/openverse.mjs、tools/unsplash.mjs、tools/wikimedia.mjs
// 全部一起搜：tools/images.mjs
import { readFileSync, writeFileSync, existsSync, unlinkSync, mkdirSync } from 'fs';
import { join } from 'path';
import { REPO, esc } from './lib.mjs';

export const PHOTO_DIR = 'assets/photos';   // 自行託管的配圖（Pixabay、Openverse）
export const PHOTO_W = 960;                  // 文章欄寬 700px，960 足夠高解析螢幕
const MAX_BYTES = 150 * 1024;                // verify.mjs 上限 200KB，留餘裕

/* ---------- 金鑰 ---------- */
export function optEnv(name) {
  if (!process.env.__STOCK_ENV_LOADED) {
    const f = join(REPO, '.env.local');
    if (existsSync(f)) for (const line of readFileSync(f, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
    }
    process.env.__STOCK_ENV_LOADED = '1';
  }
  return process.env[name];
}
export function env(name) {
  const v = optEnv(name);
  if (!v) throw new Error(`缺少 ${name}：請在 .env.local 設定（見 tools/stock-lib.mjs 開頭說明）`);
  return v;
}

/* ---------- 網路 ---------- */
// Wikimedia 規定要帶能辨識用途的 User-Agent
export const WIKI_UA = 'sky-physio-blog-image-tool/1.0 (https://skythephysio.com)';
export async function getJSON(url, headers = {}) {
  const r = await fetch(url, { headers });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}：${url.replace(/key=[^&]+/, 'key=***')}`);
  return r.json();
}
export async function getBuffer(url, headers = {}) {
  const r = await fetch(url, { headers });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}：下載圖片失敗`);
  return Buffer.from(await r.arrayBuffer());
}

/* ---------- 轉 WebP（用 Playwright 的 Chromium canvas，與 gen-photo.mjs 同一招） ---------- */
// 第一次用要先 npx playwright install chromium；
// 想用別處的 Chromium 就設 CHROMIUM_PATH=/path/to/chrome。
export async function toWebp(buf, outRel, width = PHOTO_W) {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  try {
    const page = await browser.newPage();
    const src = 'data:image/jpeg;base64,' + buf.toString('base64');
    await page.setContent(`<img src="${src}">`, { waitUntil: 'load' });
    let out, q = 0.8, size;
    for (;;) {
      out = await page.evaluate(({ w, q }) => {
        const img = document.querySelector('img'), c = document.createElement('canvas');
        const W = Math.min(w, img.naturalWidth);
        c.width = W; c.height = Math.round(img.naturalHeight * W / img.naturalWidth);
        const ctx = c.getContext('2d'); ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, c.width, c.height);
        return { data: c.toDataURL('image/webp', q).split(',')[1], w: c.width, h: c.height };
      }, { w: width, q });
      size = Buffer.byteLength(out.data, 'base64');
      if (size <= MAX_BYTES || q <= 0.45) break;
      q -= 0.08;
    }
    mkdirSync(join(REPO, PHOTO_DIR), { recursive: true });
    writeFileSync(join(REPO, outRel), Buffer.from(out.data, 'base64'));
    return { w: out.w, h: out.h, bytes: size };
  } finally { await browser.close(); }
}

/* ---------- 寫進文章 ---------- */
const ARTICLES = join(REPO, 'data/articles.json');
const isStockFigure = b => /^<figure>/.test(b) && /(\/assets\/photos\/|images\.unsplash\.com)/.test(b);
export const shortTitle = t => String(t).split(/[：？?！]|——/)[0].trim();

// credit 是 HTML，會原樣寫進文章：組 credit 時，圖庫回傳的任何文字都必須先經過 esc() 或 link()。
export function figureHtml({ src, alt, w, h, credit }) {
  return `<figure><img src="${esc(src)}" alt="${esc(alt)}" width="${w}" height="${h}" loading="lazy" decoding="async">`
    + `<figcaption>${credit}</figcaption></figure>`;
}
// 圖庫回傳的網址（作者頁、授權連結）有些來自上傳者可自由編輯的頁面（例如 Wikimedia 的授權欄位）。
// esc() 不會過濾 javascript: 這類網址，也不該指望各家瀏覽器替我們擋下。因此只接受 http(s)，其餘只留純文字。
const isHttpUrl = u => { try { return ['http:', 'https:'].includes(new URL(u).protocol); } catch { return false; } };
export const link = (href, text) => isHttpUrl(href)
  ? `<a href="${esc(href)}" target="_blank" rel="noopener nofollow">${esc(text)}</a>`
  : esc(text);

// 把一張配圖放進文章：已有圖庫配圖就換掉，沒有就放在第一段之後。
export function setArticleFigure(articleId, fig) {
  const list = JSON.parse(readFileSync(ARTICLES, 'utf8'));
  const a = list.find(x => x.id === articleId);
  if (!a) throw new Error(`找不到文章 id：${articleId}`);
  const html = figureHtml({ alt: `${shortTitle(a.title)}的示意照片`, ...fig });
  const blocks = a.content.split('\n\n');
  const old = blocks.findIndex(isStockFigure);
  if (old >= 0) {
    // 換成外連圖（Unsplash）時，原本自行託管的檔案就沒人用了
    const m = blocks[old].match(/src="\/(assets\/photos\/[^"]+)"/);
    if (m && !html.includes(m[1]) && existsSync(join(REPO, m[1]))) unlinkSync(join(REPO, m[1]));
    blocks[old] = html;
  } else {
    const k = blocks.findIndex(b => b.trim() && !/^\s*(##|<figure|>|- |\d+\.)/.test(b));
    blocks.splice(k + 1, 0, html);
  }
  a.content = blocks.join('\n\n');
  writeFileSync(ARTICLES, JSON.stringify(list, null, 2) + '\n');
  return html;
}

/* ---------- 指令列 ---------- */
export function parseArgs(argv) {
  const pos = [], opt = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) opt[argv[i].slice(2)] = argv[i + 1]?.startsWith('--') || argv[i + 1] === undefined ? true : argv[++i];
    else pos.push(argv[i]);
  }
  return { pos, opt };
}
export function run(main, usage) {
  main(parseArgs(process.argv.slice(2))).catch(e => {
    console.error('✗ ' + e.message);
    if (e.usage) console.error(usage);
    process.exit(1);
  });
}
export const usageError = msg => Object.assign(new Error(msg), { usage: true });
