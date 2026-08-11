// 後台端對端驗證：首頁瘦身後（內文改為延遲載入）確保編輯器仍能正常運作
// 用法：node tools/build.mjs && node tools/verify-admin.mjs
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';

const ROOT = new URL('../dist', import.meta.url).pathname;
const MIME = { html: 'text/html; charset=utf-8', json: 'application/json; charset=utf-8', xml: 'application/xml', txt: 'text/plain; charset=utf-8', ico: 'image/x-icon', png: 'image/png', jpg: 'image/jpeg' };

const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/') p = '/index.html';
  else if (!/\.[a-z0-9]+$/i.test(p) && existsSync(ROOT + p + '.html')) p += '.html';
  const f = ROOT + p;
  if (!existsSync(f)) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[f.split('.').pop().toLowerCase()] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const O = `http://127.0.0.1:${server.address().port}`;

const b = await chromium.launch();
const ctx = await b.newContext();
// 點閱 Worker 在測試環境不可達，以空回應 stub
await ctx.route('https://views.skythephysio.com/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"counts":{}}' }));
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push(e.message));
const out = [];
const ok = (n, c) => out.push([c ? '✅' : '❌', n]);

await page.goto(O + '/', { waitUntil: 'networkidle' });
ok('首頁載入無 JS 例外', errs.length === 0);
ok('首頁文章列表渲染', (await page.locator('#post-list .post-row').count()) > 0);
ok('首頁未內嵌內文（已瘦身）', await page.evaluate(() => !('content' in ARTICLES[0])));

// 開啟後台（隱藏入口 #admin + 密碼）
await page.evaluate(() => { location.hash = '#admin'; });
await page.waitForTimeout(200);
await page.fill('#pw-input', '318');
await page.evaluate(() => pwSubmit());
await page.waitForTimeout(1200); // 等待內文 fetch
ok('後台開啟', await page.locator('#adm-overlay').evaluate(e => e.classList.contains('show')));
const total = await page.evaluate(() => ARTICLES.length);
const n = await page.locator('#adm-article-list .adm-article-item').count();
ok(`後台列出全部文章（${n}/${total}）`, n === total && total > 0);
ok('內文已延遲載入', await page.evaluate(() => typeof ARTICLES[0].content === 'string'));

// 關鍵回歸點：點文章後內文要帶進編輯器
await page.locator('#adm-article-list .adm-article-item').first().click();
await page.waitForTimeout(300);
const body = await page.inputValue('#af-body');
ok(`編輯器帶入內文（${body.length} 字元）`, body.length > 100);
ok('編輯器帶入標題', (await page.inputValue('#af-title')).length > 0);

// 預覽渲染
await page.evaluate(() => admTab('preview'));
await page.waitForTimeout(300);
ok('預覽渲染出小標', (await page.locator('#adm-preview-wrap .body-h2').count()) > 0);

// 還原預設所用的快照必須含內文
ok('DEFAULT_ARTICLES 含內文', await page.evaluate(() => typeof DEFAULT_ARTICLES[0].content === 'string'));

await page.evaluate(() => { try { localStorage.removeItem('sky_articles_v1'); } catch (e) {} });
out.forEach(([s, name]) => console.log(s, name));
console.log('JS 例外:', errs.length ? errs.join(' | ') : '無');
const fail = out.filter(o => o[0] === '❌').length;
console.log('-'.repeat(40));
console.log(fail ? `❌ ${fail} 項失敗` : `✅ 後台功能完整（${out.length} 項）`);

await b.close();
server.close();
process.exit(fail ? 1 : 0);
