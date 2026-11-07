// 圖庫串接的共用工具：讀金鑰、轉 WebP、把配圖寫進 data/articles.json
//
// 金鑰放在 repo 根目錄的 .env.local（已列入 .gitignore，絕不提交）：
//   PIXABAY_API_KEY=…
//   OPENVERSE_CLIENT_ID=…　OPENVERSE_CLIENT_SECRET=…
//   UNSPLASH_ACCESS_KEY=…
// 也可以直接用同名的環境變數。
//
// 各圖庫的工具：tools/pixabay.mjs、tools/openverse.mjs、tools/unsplash.mjs
// 三家一起搜：tools/images.mjs
import { readFileSync, writeFileSync, existsSync, unlinkSync, mkdirSync } from 'fs';
import { join } from 'path';
import { REPO, esc } from './lib.mjs';

export const PHOTO_DIR = 'assets/photos';   // 自行託管的配圖（Pixabay、Openverse）
export const PHOTO_W = 960;                  // 文章欄寬 700px，960 足夠高解析螢幕
const MAX_BYTES = 150 * 1024;                // verify.mjs 上限 200KB，留餘裕

/* ---------- 金鑰 ---------- */
export function env(name) {
  if (!process.env.__STOCK_ENV_LOADED) {
    const f = join(REPO, '.env.local');
    if (existsSync(f)) for (const line of readFileSync(f, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
    }
    process.env.__STOCK_ENV_LOADED = '1';
  }
  const v = process.env[name];
  if (!v) throw new Error(`缺少 ${name}：請在 .env.local 設定（見 tools/stock-lib.mjs 開頭說明）`);
  return v;
}

/* ---------- 網路 ---------- */
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

export function figureHtml({ src, alt, w, h, credit }) {
  return `<figure><img src="${esc(src)}" alt="${esc(alt)}" width="${w}" height="${h}" loading="lazy" decoding="async">`
    + `<figcaption>${credit}</figcaption></figure>`;
}
export const link = (href, text) => `<a href="${esc(href)}" target="_blank" rel="noopener nofollow">${esc(text)}</a>`;

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
