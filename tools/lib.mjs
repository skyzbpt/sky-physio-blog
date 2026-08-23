// 共用工具：常數、markdown 渲染、OG 卡模板
// 資料來源一律為 data/articles.json（唯一真實來源），不再從 index.html 解析。
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

export const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
export const BASE = 'https://skythephysio.com';
export const TODAY = new Date().toISOString().slice(0, 10);

export const esc = s => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// JSON-LD 序列化：跳脫字面 </script> 以免內容跳出 <script type="application/ld+json"> 區塊
export const ldJson = obj => JSON.stringify(obj, null, 2).replace(/<\/script/gi, '<\\/script');
export const plain = t => String(t).replace(/[#>*`]/g, '').replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
export const readMins = content => Math.max(1, Math.round(((String(content).match(/[一-鿿]/g) || []).length) / 320));

// 分類 → 主題頁 slug
export const CAT_SLUG = {
  '下背痛': 'lower-back-pain',
  '肩膀痛': 'shoulder-pain',
  '顳顎關節': 'tmj',
  '高級筋膜技術': 'myofascial',
  '顱薦椎': 'craniosacral',
  '三鐵運動修復': 'triathlon',
  '公路車': 'cycling',
  '紅繩懸吊': 'redcord',
  '疼痛科學': 'pain-science'
};

// ---------- SEO / GEO 共用實體與設定 ----------
// robots：允許大圖預覽與完整摘要，利於搜尋結果 rich preview 與 AI 引擎引用
export const ROBOTS = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';

// 社群連結（E-E-A-T sameAs）
export const SOCIAL = [
  'https://www.instagram.com/sky_the_physio',
  'https://www.threads.com/@sky_the_physio'
];

// 可跨頁重用的作者實體（與首頁 #sky 同一 @id，補齊 E-E-A-T）
export const AUTHOR = {
  '@type': 'Person',
  '@id': BASE + '/#sky',
  'name': 'Sky',
  'alternateName': ['Sky 物理治療師', 'Sky PT'],
  'url': BASE + '/',
  'jobTitle': '物理治療師',
  'sameAs': SOCIAL
};

// 發佈者實體（與首頁 #clinic 同一 @id）
export const PUBLISHER = {
  '@type': 'Organization',
  '@id': BASE + '/#clinic',
  'name': 'Sky 物理治療師',
  'logo': { '@type': 'ImageObject', 'url': BASE + '/assets/logo.png' },
  'sameAs': SOCIAL
};

// 分類 → 主題實體（供 schema.org about，強化醫療語意與 GEO）
export const CAT_ABOUT = {
  '下背痛':   { '@type': 'MedicalCondition', 'name': '下背痛', 'alternateName': 'Low Back Pain' },
  '肩膀痛':   { '@type': 'MedicalCondition', 'name': '肩膀疼痛', 'alternateName': 'Shoulder Pain' },
  '顳顎關節': { '@type': 'MedicalCondition', 'name': '顳顎關節障礙', 'alternateName': 'Temporomandibular Disorders (TMD)' },
  '高級筋膜技術': { '@type': 'MedicalTherapy', 'name': '肌筋膜放鬆', 'alternateName': 'Myofascial Release' },
  '顱薦椎':   { '@type': 'MedicalTherapy',  'name': '顱薦椎治療', 'alternateName': 'Craniosacral Therapy' },
  '三鐵運動修復': { '@type': 'MedicalCondition', 'name': '鐵人三項運動傷害', 'alternateName': 'Triathlon Sports Injuries' },
  '公路車':   { '@type': 'Thing',           'name': '公路車 Bike Fitting', 'alternateName': 'Bike Fitting' },
  '紅繩懸吊': { '@type': 'MedicalTherapy',  'name': '紅繩懸吊治療', 'alternateName': 'Redcord Neurac' },
  '疼痛科學': { '@type': 'Thing', 'name': '疼痛科學', 'alternateName': 'Pain Science' }
};

// 中文字數（供 wordCount）
export const wordCountOf = content => (String(content).match(/[一-鿿]/g) || []).length;

// 每篇 keywords：標題 + 分類 + 主題實體名 + 通用詞
export const keywordsFor = a => {
  const about = CAT_ABOUT[a.cat];
  const ks = [a.title, a.cat];
  if (about) { ks.push(about.name); if (about.alternateName) ks.push(about.alternateName); }
  ks.push('物理治療', '復健', '衛教', 'Sky 物理治療師');
  return [...new Set(ks.filter(Boolean))].join(',');
};

// 從文章內容抽出「## 問句？」→ 後續段落作為答案，產生高品質 FAQ（SEO rich result / GEO 問答抽取）
const faqAnswerText = md => md.split('\n')
  .map(l => l.replace(/^\s*[-*]\s+/, '').replace(/^\s*\d+\.\s+/, '').replace(/^\s*>\s+/, ''))
  .join(' ')
  .replace(/\*\*(.+?)\*\*/g, '$1')
  .replace(/\*([^\s*][^*\n]*?)\*/g, '$1')
  .replace(/\s+/g, ' ')
  .trim();

// 由標題取「乾淨的名詞主題」：切在首個標點，再切在首個系詞／疑問詞前，
// 只接受無連接詞的短名詞短語，否則回傳空字串（寧可不補，也不要造出病句）。
export const subjectOf = title => {
  const seg = String(title).split(/[：:？?—－(（,，。!！]/)[0];
  const m = seg.match(/^.*?(?=是|怎|為|如何|有|該|到底|還是|哪|需|會|要不要|能不能|可不可以)/);
  const s = ((m && m[0]) || seg).trim();
  const len = [...s].length;
  if (len < 3 || len > 12) return '';
  if (/[，、和與或及]/.test(s)) return '';         // 含連接詞 → 非單一名詞
  if (/[不勝再讓把別做用給幫從對]/.test(s)) return ''; // 含動詞／副詞 → 像子句而非名詞
  return s;
};

// 讓問句能獨立成立（利於 FAQ rich result 與 AI 問答抽取）
function qualifyQuestion(q, subject) {
  if (!subject || q.includes(subject)) return q;
  if (/^(它|這|其|該)[們個某]?/.test(q)) return subject + q.replace(/^(它|這|其|該)[們個某]?/, '');
  if ([...q].length <= 7 || /^(要|會|該|怎|為|如何|多|有沒有|需不需要|什麼|哪)/.test(q)) return subject + q;
  return q;
}

export function extractFaqs(content, title) {
  const subject = title ? subjectOf(title) : '';
  const blocks = String(content).trim().split(/\n\s*\n/).map(b => b.trim());
  const faqs = [];
  for (let i = 0; i < blocks.length; i++) {
    const m = blocks[i].match(/^##\s+(.+[？?])\s*$/);
    if (!m) continue;
    const ans = [];
    for (let j = i + 1; j < blocks.length; j++) {
      if (/^##\s+/.test(blocks[j])) break;
      if (/^%%FIG\d+%%$/.test(blocks[j])) continue;
      ans.push(blocks[j]);
    }
    const answer = faqAnswerText(ans.join('\n'));
    if (answer && answer.length >= 8) faqs.push({ q: qualifyQuestion(m[1].trim(), subject), a: answer });
  }
  return faqs;
}

// 臨床主題詞：用來找出「不同分類但談同一主題」的文章，
// 讓這些文章互相連結並標示彼此角度不同（避免搜尋引擎誤判為重複內容）
export const TOPIC_TERMS = [
  '五十肩', '冰凍肩', '旋轉肌袖', '肩夾擠', '肩滑囊', '肩關節不穩', '肩胛',
  '坐骨神經', '椎間盤', '椎管狹窄', '薦髂', '梨狀肌', '腰大肌', '胸腰筋膜', '髖鉸鏈',
  '足底筋膜', '足弓', '跟腱', '腳踝', '錘狀趾', '膕旁肌', '大腿後肌',
  '顳顎', '咀嚼肌', '咬肌', '磨牙', '關節盤', '翼狀肌',
  '激痛點', '緊帶', '轉移痛', '中樞敏感化', '乾針',
  '橫膈', '呼吸', '核心', '骨盆底', '腹內壓',
  '揮鞭', '枕下', '斜角肌', '胸廓出口', '腕隧道', '大魚際',
  '紅繩', '懸吊', 'Bike Fitting', '顱薦椎', '迷走神經', '筋膜線',
];

// 取出一篇文章（標題優先，其次內文）涉及的主題詞
export const topicsOf = a => {
  const t = a.title || '', c = a.content || '';
  return TOPIC_TERMS.filter(k => t.includes(k) || (c.split(k).length - 1) >= 3);
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

// 文章小標（## ）清單：供文章頁目錄與段落錨點使用。
// id 用 sec-N（依出現順序），標題改寫時錨點才不會失效。
export const headingsOf = content => String(content)
  .replace(/<figure[\s\S]*?<\/figure>/g, '')
  .split(/\n\s*\n/)
  .map(b => b.trim())
  .filter(b => b.startsWith('## '))
  .map((b, i) => ({ id: `sec-${i + 1}`, text: plain(b.slice(3)) }));

export function renderBody(text) {
  const figures = [];
  let hn = 0;
  const protectedText = String(text).replace(/<figure[\s\S]*?<\/figure>/g, m => {
    figures.push(m); return `\n\n%%FIG${figures.length - 1}%%\n\n`;
  });
  return protectedText.trim().split(/\n\s*\n/).map(block => {
    const b = block.trim();
    // 小標帶 id 與可複製的段落錨點：讀者能直接分享某一段，AI 也更容易引用到正確段落
    if (b.startsWith('## ')) { const id = `sec-${++hn}`;
      return `<h2 id="${id}">${inlineFormat(b.slice(3))}<a class="hash" href="#${id}" aria-label="複製這個段落的連結">#</a></h2>`; }
    if (b.startsWith('> ')) return `<blockquote>${inlineFormat(b.slice(2))}</blockquote>`;
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(b)) return '<hr>';
    if (/^%%FIG(\d+)%%$/.test(b)) return figures[+b.match(/\d+/)[0]];
    const imgM = b.match(/^!\[([^\]]*)\]\((data:[^\)]+|https?:[^\)]+)\)$/);
    if (imgM) { const cap = imgM[1], src = imgM[2];
      return `<figure><img src="${esc(src)}" alt="${esc(cap)}" loading="lazy">${cap ? `<figcaption>${esc(cap)}</figcaption>` : ''}</figure>`; }
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
  <div class="foot"><img src="${logo}" alt="Sky 物理治療師 logo"><div class="n">Sky 物理治療師<small>${esc(footer)}</small></div></div>
</body></html>`;

export async function shot(page, html, outPath) {
  await page.setViewportSize({ width: 1200, height: 630 });
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.screenshot({ path: outPath, type: 'jpeg', quality: 84 });
}
