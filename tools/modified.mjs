// 文章「真實修改日期」追蹤
//
// 為什麼需要這個檔案：
//   sitemap 的 <lastmod>、JSON-LD 的 dateModified、og 的 article:modified_time
//   都必須反映「內容真的變了」。原本的寫法是 `a.updated || a.date`，但沒有任何
//   流程會去設定 updated，結果是文章大幅改寫後 lastmod 仍停在發佈日，
//   Google 沒有任何理由回來重新檢索。
//
//   反過來把 lastmod 一律設成建置日期也不行——全站每天「假更新」是負面品質訊號。
//
// 做法：把每篇的內容雜湊記在 data/modified.json。雜湊變了才把日期更新為今天，
//   沒變就沿用上次記錄的日期。作者只要照常改 data/articles.json，日期會自己正確。
//
// data/modified.json 需要一起 commit（它是「上次內容長什麼樣」的記錄）。
import { createHash } from 'crypto';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { REPO, TODAY } from './lib.mjs';

const STATE = join(REPO, 'data/modified.json');

export const hashOf = a => createHash('sha1')
  .update(`${a.title || ''}\n${a.excerpt || ''}\n${a.content || ''}`)
  .digest('hex').slice(0, 12);

/**
 * 回傳 Map<id, 'YYYY-MM-DD'>，並把最新狀態寫回 data/modified.json。
 * - 第一次看到某篇：以它的發佈日為修改日（不要假裝今天改過）
 * - 雜湊改變：修改日更新為今天
 * - 文章自帶 updated 欄位：優先使用（手動覆寫的逃生門）
 */
export function resolveModified(articles) {
  const prev = existsSync(STATE) ? JSON.parse(readFileSync(STATE, 'utf8')) : {};
  const next = {}, out = new Map();
  let bumped = 0, seeded = 0;

  for (const a of articles) {
    const h = hashOf(a);
    const old = prev[a.id];
    let d;
    if (!old) { d = a.date; seeded++; }
    else if (old.h !== h) { d = TODAY; bumped++; }
    else d = old.d;
    next[a.id] = { h, d };
    out.set(a.id, a.updated || d);
  }

  // 依 id 排序寫回，讓 diff 穩定好讀
  const sorted = {};
  for (const k of Object.keys(next).sort()) sorted[k] = next[k];
  writeFileSync(STATE, JSON.stringify(sorted, null, 2) + '\n');

  const msg = [];
  if (seeded) msg.push(`${seeded} 篇首次記錄`);
  if (bumped) msg.push(`${bumped} 篇內容有變動 → lastmod 更新為 ${TODAY}`);
  console.log(`修改日期追蹤：${msg.length ? msg.join('｜') : '內容皆未變動，lastmod 沿用'}`);

  return out;
}

/* ---------- 非文章頁的修改日期（首頁、/blog、服務與落地頁、主題頁） ----------
   sitemap 原本把這些頁面的 lastmod 一律寫成建置當天：每部署一次就全部「更新」一次，
   等於告訴 Google 這些日期不可信。改用和文章相同的做法：記下每頁「主要內容」的指紋，
   指紋變了才把日期更新為今天，沒變就沿用上次記錄的日期。

   指紋只取主要內容：<title>、description、結構化資料，以及 <main> 裡的文字、連結與圖片。
   頁首、頁尾、樣式、腳本或標記寫法的改動不算內容更新（Google 對 lastmod 的定義也是如此）。
   主題頁列著該分類的文章、首頁有最新文章的結構化資料——新增或改寫文章標題、摘要時，
   它們的日期會跟著前進，這是正確的：那幾頁的內容確實變了。

   狀態記在 data/pages-modified.json，需要一起 commit。 */
const PAGE_STATE = join(REPO, 'data/pages-modified.json');

export function pageFingerprint(html) {
  const pick = re => (html.match(re) || [, ''])[1];
  // 結構化資料先解析再序列化：縮排或換行的差異不算內容變動
  const ld = (html.match(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g) || []).map(b => {
    const raw = b.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '');
    try { return JSON.stringify(JSON.parse(raw)); } catch { return raw.replace(/\s+/g, ' ').trim(); }
  });
  const main = pick(/<main\b[^>]*>([\s\S]*)<\/main>/)
    .replace(/<script\b[\s\S]*?<\/script>/g, ' ').replace(/<style\b[\s\S]*?<\/style>/g, ' ');
  const refs = [...main.matchAll(/\s(?:href|src|alt)="([^"]*)"/g)].map(m => m[1]);
  const text = main.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return createHash('sha1')
    .update([pick(/<title>([\s\S]*?)<\/title>/), pick(/<meta name="description" content="([^"]*)"/), ...ld, text, ...refs].join('\n'))
    .digest('hex').slice(0, 12);
}

/**
 * pages: [{ path, file }]（file 是相對於 repo 的已產生頁面）
 * 回傳 Map<path, 'YYYY-MM-DD'>，並把最新狀態寫回 data/pages-modified.json。
 * - 指紋沒變：沿用記錄的日期
 * - 指紋改變，或是第一次出現的新頁面：今天
 */
export function resolvePageModified(pages) {
  const prev = existsSync(PAGE_STATE) ? JSON.parse(readFileSync(PAGE_STATE, 'utf8')) : {};
  const next = {}, out = new Map(), bumped = [];
  for (const p of pages) {
    const h = pageFingerprint(readFileSync(join(REPO, p.file), 'utf8'));
    const old = prev[p.path];
    const d = old && old.h === h ? old.d : TODAY;
    if (d !== (old && old.d)) bumped.push(p.path);
    next[p.path] = { h, d };
    out.set(p.path, d);
  }
  const sorted = {};
  for (const k of Object.keys(next).sort()) sorted[k] = next[k];
  writeFileSync(PAGE_STATE, JSON.stringify(sorted, null, 2) + '\n');
  console.log(`非文章頁修改日期：${bumped.length ? `${bumped.length} 頁內容有變動 → lastmod 更新為 ${TODAY}（${bumped.join('、')}）` : '內容皆未變動，lastmod 沿用'}`);
  return out;
}
