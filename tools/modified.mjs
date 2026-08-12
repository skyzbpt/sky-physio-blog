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
