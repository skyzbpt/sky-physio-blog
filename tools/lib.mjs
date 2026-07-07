// 共用工具：常數、markdown 渲染、OG 卡模板
// 資料來源一律為 data/articles.json（唯一真實來源），不再從 index.html 解析。
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

export const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
export const BASE = 'https://skythephysio.com';
export const TODAY = new Date().toISOString().slice(0, 10);

export const esc = s => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const plain = t => String(t).replace(/[#>*`]/g, '').replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
export const readMins = content => Math.max(1, Math.round(((String(content).match(/[一-鿿]/g) || []).length) / 320));

// 分類 → 主題頁 slug
export const CAT_SLUG = {
  '下背痛': 'lower-back-pain',
  '肩膀痛': 'shoulder-pain',
  '顱薦椎': 'craniosacral',
  '身心靈': 'mind-body',
  '公路車': 'cycling',
  '紅繩懸吊': 'redcord',
  '疼痛科學': 'pain-science'
};

export const loadArticles = () => JSON.parse(readFileSync(join(REPO, 'data/articles.json'), 'utf8'));
export const loadSite = () => JSON.parse(readFileSync(join(REPO, 'data/site.json'), 'utf8'));
export const logoDataURI = () => 'data:image/png;base64,' + readFileSync(join(REPO, 'assets/logo.png')).toString('base64');

/* ---------- markdown → HTML（與 index.html 後台預覽 admRenderTextBlock 對齊） ---------- */
export const inlineFormat = s => esc(s)
  .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  .replace(/\*([^\s*][^*\n]*?)\*/g, '<em>$1</em>');

// 連續「- 」→ <ul>、連續「N. 」→ <ol>，其餘為段落（以 <br> 相接）
export function renderTextBlock(b) {
  const out = [];
  let para = [], items = [], listType = null;
  const flushPara = () => { if (para.length) { out.push(`<p>${para.map(inlineFormat).join('<br>')}</p>`); para = []; } };
  const flushList = () => { if (items.length) { out.push(`<${listType}>${items.map(li => `<li>${inlineFormat(li)}</li>`).join('')}</${listType}>`); items = []; listType = null; } };
  for (const line of b.split('\n')) {
    const mUl = line.match(/^- +(.*)$/);
    const mOl = line.match(/^\d+\.\s+(.*)$/);
    if (mUl) { if (listType === 'ol') flushList(); flushPara(); listType = 'ul'; items.push(mUl[1]); }
    else if (mOl) { if (listType === 'ul') flushList(); flushPara(); listType = 'ol'; items.push(mOl[1]); }
    else { flushList(); if (line.trim() !== '') para.push(line.trim()); }
  }
  flushList(); flushPara();
  return out.join('\n');
}

export function renderBody(text) {
  const figures = [];
  const protectedText = String(text).replace(/<figure[\s\S]*?<\/figure>/g, m => {
    figures.push(m); return `\n\n%%FIG${figures.length - 1}%%\n\n`;
  });
  return protectedText.trim().split(/\n\s*\n/).map(block => {
    const b = block.trim();
    if (b.startsWith('## ')) return `<h2>${inlineFormat(b.slice(3))}</h2>`;
    if (b.startsWith('> ')) return `<blockquote>${inlineFormat(b.slice(2))}</blockquote>`;
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(b)) return '<hr>';
    if (/^%%FIG(\d+)%%$/.test(b)) return figures[+b.match(/\d+/)[0]];
    const imgM = b.match(/^!\[([^\]]*)\]\((data:[^\)]+|https?:[^\)]+)\)$/);
    if (imgM) { const cap = imgM[1], src = imgM[2];
      return `<figure><img src="${src}" alt="${esc(cap)}" loading="lazy">${cap ? `<figcaption>${esc(cap)}</figcaption>` : ''}</figure>`; }
    return renderTextBlock(b);
  }).join('\n');
}

/* ---------- OG 分享卡（1200×630） ---------- */
export const ogCard = ({ eyebrow, title, footer, logo }) => `<!doctype html><html><head><meta charset="utf-8">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:1200px;height:630px;overflow:hidden}
  body{font-family:"Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif;
    background:linear-gradient(135deg,#E0F0FB 0%,#DCEEEB 100%);color:#232A50;
    padding:80px 90px;display:flex;flex-direction:column;justify-content:space-between;position:relative}
  body::before{content:"";position:absolute;left:0;top:0;bottom:0;width:14px;background:#149A8A}
  .eyebrow{font-family:"SF Mono",Menlo,Consolas,monospace;font-size:26px;letter-spacing:.22em;color:#C2402E;margin-bottom:30px}
  h1{font-family:"Noto Serif TC","Songti TC",serif;font-weight:700;font-size:74px;line-height:1.32;
    max-width:1000px;letter-spacing:.01em;overflow:hidden;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical}
  .foot{display:flex;align-items:center;gap:20px}
  .foot img{width:64px;height:64px;border-radius:50%;background:#fff}
  .foot .n{font-family:"Noto Serif TC",serif;font-weight:700;font-size:34px}
  .foot .n small{display:block;font-family:"SF Mono",monospace;font-size:19px;letter-spacing:.16em;color:#54708C;font-weight:400;margin-top:4px}
</style></head><body>
  <div><div class="eyebrow">${esc(eyebrow)}</div><h1>${esc(title)}</h1></div>
  <div class="foot"><img src="${logo}"><div class="n">Sky 物理治療師<small>${esc(footer)}</small></div></div>
</body></html>`;

export async function shot(page, html, outPath) {
  await page.setViewportSize({ width: 1200, height: 630 });
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.screenshot({ path: outPath, type: 'jpeg', quality: 84 });
}
