// 全站建置：data/articles.json →（注入 index.html）→ 靜態頁／OG 卡／sitemap／主題頁／RSS／404／llms
// 用法：node tools/build.mjs
//
// 部署：本腳本最後會把可部署的靜態檔組裝到 dist/，供 Cloudflare（Git 連動）直接部署。
//   Cloudflare 設定 → 建置指令：npm run build｜輸出目錄：dist
//
// OG 分享卡圖片需要 Chromium（Playwright）。Cloudflare 的建置環境沒有 Chromium，
// 因此當無法啟動時會「略過 OG 圖片產生」，改沿用 repo 內已提交的圖片——
// HTML／sitemap／feed／llms 皆為純 Node 產生，不需瀏覽器，仍會照常重建。
import { rmSync, mkdirSync, cpSync, existsSync } from 'fs';
import { join } from 'path';
import { REPO } from './lib.mjs';
import { injectArticles } from './inject.mjs';
import { genPosts } from './gen-posts.mjs';
import { genExtras } from './gen-extras.mjs';
import { genLlms } from './gen-llms.mjs';

console.log('=== 1/5 注入 index.html ===');
injectArticles();

// 嘗試啟動 Chromium；失敗則以 page=null 繼續（略過 OG 圖片產生）
let browser = null, page = null;
try {
  const { chromium } = await import('playwright');
  browser = await chromium.launch();
  page = await browser.newPage();
} catch (e) {
  console.warn('⚠ 無法啟動 Chromium，略過 OG 分享卡圖片產生（沿用 repo 內已提交的圖片）。');
  console.warn('  原因：' + (e && e.message ? e.message.split('\n')[0] : e));
}

console.log('=== 2/5 文章頁 + OG + sitemap ===');
await genPosts(page);

console.log('=== 3/5 主題頁 + RSS + 404 ===');
await genExtras(page);

if (browser) await browser.close();

console.log('=== 4/5 llms（GEO / AI 摘要）===');
genLlms();

/* ---------- 5/5 組裝 dist/（供 Cloudflare 部署，只含可對外的靜態檔） ---------- */
console.log('=== 5/5 組裝 dist/（供 Cloudflare 部署）===');
const DIST = join(REPO, 'dist');
rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });
const rootFiles = [
  'index.html', 'physio-guide.html', '404.html',
  'sitemap.xml', 'feed.xml', 'robots.txt',
  'llms.txt', 'llms-full.txt',
  'favicon.ico', 'apple-touch-icon.png', '.nojekyll', 'CNAME',
  '_headers'  // Cloudflare 靜態資產：安全性回應標頭（CSP、HSTS、nosniff 等）
];
let copiedFiles = 0;
for (const f of rootFiles) {
  const src = join(REPO, f);
  if (existsSync(src)) { cpSync(src, join(DIST, f)); copiedFiles++; }
}
for (const d of ['posts', 'topics', 'assets']) {
  const src = join(REPO, d);
  if (existsSync(src)) cpSync(src, join(DIST, d), { recursive: true });
}
console.log(`dist/ 組裝完成（${copiedFiles} 個根目錄檔 + posts/ topics/ assets/）`);

console.log('=== 建置完成 ===');
