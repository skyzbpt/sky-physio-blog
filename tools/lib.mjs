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

/* ---------- meta description ----------
   摘要（excerpt）平均只有 60 字，低於 Ahrefs 的 110 字門檻，所以需要補字。
   舊做法是把內文前 N 個字直接接上去，結果 260 篇裡有 241 篇斷在半句——
   而這段文字 Google 會原樣顯示在搜尋結果上，斷句等於白白損失點閱。
   改成以「完整句子」為單位補；補不滿才退到最近的句讀（先逗號、頓號次之）收尾並補上句號。 */
export const DESC_MIN = 110, DESC_MAX = 155;
const cLen = s => [...s].length;
const isListBlock = b => /^\s*([-*]\s+|\d+\.\s+)/.test(b);

// 內文可用區塊：跳過小標、引言、圖片與分隔線（接進描述會讀起來像斷句）
const descBlocks = content => String(content).trim().split(/\n\s*\n/).map(b => b.trim())
  .filter(b => b && !b.startsWith('##') && !b.startsWith('>') && !/^%%FIG/.test(b)
            && !/^!\[/.test(b) && !/^<figure/.test(b) && !/^(-{3,}|\*{3,}|_{3,})$/.test(b));

// 條列編號（一、／1.／（2））是版面結構，不是句子的一部分；
// 留在描述裡會變成「一、現代生活。」這種讀不通的殘句。
const ENUM = /^[（(]?[一二三四五六七八九十百\d]+[、）)．.]\s*/;

// 區塊 → 句子。逐區塊切，不把區塊接起來再切——否則「……當其中任何一個環節不足：」
// 這種引出清單的殘句，會和下一段的第一句黏成一句讀不通的話。
// 清單整塊以「、」串成一句，讓需要截斷時永遠有標點可退。
const sentencesOf = blocks => blocks.flatMap(b => {
  if (isListBlock(b)) {
    const items = plain(b.split('\n').map(l => l.replace(/^\s*([-*]\s+|\d+\.\s+)/, '').replace(ENUM, '').trim())
      .filter(Boolean).join('、')).replace(/[、，：]+$/, '');
    return items ? [items + '。'] : [];
  }
  const parts = plain(b).split(/(?<=[。！？])/).map(x => x.trim().replace(ENUM, '')).filter(Boolean);
  // 區塊結尾若不是完整句子（多半是引出清單的「……：」），丟掉，不要接到下一段去
  if (parts.length && !/[。！？]$/.test(parts[parts.length - 1])) parts.pop();
  return parts;
});

// 描述能不能就這樣收尾：結尾若是「很少。」這種孤零零的短句，
// 讀者在搜尋結果上看到的就是一個沒頭沒尾的殘句，寧可再多接一句。
const okTail = d => {
  const last = d.split(/(?<=[。！？])/).filter(Boolean).pop() || '';
  return [...last].length >= 8;
};

export function metaDescription(a) {
  const seed = plain(a.excerpt).trim();
  const blocks = descBlocks(a.content);
  // 先只用散文（讀起來最自然）；湊不到下限時才把清單內容也納入
  const pools = [sentencesOf(blocks.filter(b => !isListBlock(b))), sentencesOf(blocks)];
  let best = seed;
  for (const pool of pools) {
    let desc = seed, i = 0;
    // 補到下限為止；若結尾是殘句，只要還放得下就再接一句
    while (i < pool.length && (cLen(desc) < DESC_MIN || !okTail(desc))
           && cLen(desc) + cLen(pool[i]) <= DESC_MAX) desc += pool[i++];
    if (cLen(desc) >= DESC_MIN && okTail(desc)) return desc.trim();
    if (cLen(desc) > cLen(best)) best = desc;

    // 整句補不滿下限 → 取下一句的前半，切在句讀處再補上句號。
    // 先找真正的子句邊界「，；」；切在頓號上會留下說到一半的並列，讀起來較差，故為次選。
    if (i < pool.length) {
      let d = desc;
      const room = DESC_MAX - cLen(d) - 1;               // 保留 1 字給補上的句號
      const head = [...pool[i]].slice(0, room);
      let cut = -1;
      for (const marks of ['，；', '、：']) {
        for (let k = head.length - 1; k >= DESC_MIN - cLen(d); k--)
          if (marks.includes(head[k])) { cut = k; break; }
        if (cut > 0) break;
      }
      if (cut > 0) {
        const tail = head.slice(0, cut).join('').replace(/[，、；：—－·／]+$/, '');
        if (tail) d += tail + '。';
        if (cLen(d) >= DESC_MIN && okTail(d)) return d.trim();
        if (cLen(d) > cLen(best)) best = d;
      }
    }
  }
  return best.trim();
}

// 標題主題詞：切出乾淨的名詞短語當關鍵字。
// 含「得／地」的是副詞結構（「騎得快」不是關鍵字），排除。
const titleTerm = title => {
  const s = subjectOf(title);
  return s && !/[得地]/.test(s) ? s : '';
};

// 每篇 keywords：文章真正談到的實體優先，其次標題主題詞、分類實體與站台通用詞。
// 舊版把「整個標題」當成一個關鍵字（例如「FTP 是什麼？公路車訓練最重要的那一個數字」）——
// 那不是關鍵字，只是把標題再抄一次。
export const keywordsFor = a => {
  const about = CAT_ABOUT[a.cat];
  const entities = topicsOf(a);
  const subj = titleTerm(a.title);
  const ks = [
    ...(subj && subj !== a.cat ? [subj] : []),
    ...entities,
    a.cat,
    ...(about ? [about.name, about.alternateName].filter(Boolean) : []),
  ];
  // 實體最多取 6 個再接通用詞——關鍵字堆到 20 個不會更好，只會稀釋主題
  const head = [...new Set(ks.filter(Boolean))].slice(0, 6 + (about ? 3 : 1));
  return [...new Set([...head, '物理治療', '復健', '衛教', 'Sky 物理治療師'])].join(',');
};

// JSON-LD mentions：把文章實際談到的實體標成具名節點，
// 讓搜尋引擎與 AI 引擎知道這篇涉及哪些主題（GEO 的實體訊號）。
export const mentionsFor = a => topicsOf(a).slice(0, 8).map(name => ({ '@type': 'Thing', 'name': name }));

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

// 臨床／訓練主題詞：一篇文章「實際在談的東西」。三個地方用到它——
//   1. 找出不同分類但談同一主題的文章，互相連結並標示角度不同（避免被判為重複內容）
//   2. 每篇的 keywords
//   3. JSON-LD 的 mentions（讓搜尋與 AI 引擎知道這篇涉及哪些實體）
// 選詞原則：夠具體，兩篇同時命中才代表真的在談同一件事。
// 「恢復」「訓練」這種泛用詞不收；「把手」「減量」這類會誤中一般語句的詞也不收
// （「把手放在胸口」出現在顱薦椎文章裡，會和公路車把手文章假連結），改用 Taper 這類無歧義的寫法。
export const TOPIC_TERMS = [
  // 肩
  '五十肩', '冰凍肩', '旋轉肌袖', '肩夾擠', '肩滑囊', '肩關節不穩', '肩胛',
  // 腰・骨盆・髖
  '坐骨神經', '椎間盤', '椎管狹窄', '薦髂', '梨狀肌', '腰大肌', '胸腰筋膜', '髖鉸鏈',
  '骨盆', '臀肌', '髖關節活動度',
  // 下肢
  '足底筋膜', '足弓', '跟腱', '腳踝', '錘狀趾', '膕旁肌', '大腿後肌', '髂脛束', '後側鏈',
  // 顳顎
  '顳顎', '咀嚼肌', '咬肌', '磨牙', '關節盤', '翼狀肌',
  // 疼痛科學
  '激痛點', '緊帶', '轉移痛', '中樞敏感化', '乾針', '肌腱病變', '本體感覺', '動作控制', '神經滑動',
  // 呼吸・核心
  '橫膈', '呼吸', '核心', '骨盆底', '腹內壓',
  // 頸・上肢・胸廓
  '揮鞭', '枕下', '斜角肌', '胸廓出口', '腕隧道', '大魚際', '胸椎',
  // 治療取向
  '紅繩', '懸吊', 'Bike Fitting', '顱薦椎', '迷走神經', '筋膜線',
  // 自行車與耐力訓練（公路車是站上最大的分類，需要對應的實體詞才不會只剩分類名可用）
  'FTP', '功率計', '正規化功率', '強度係數', 'VO2max', '乳酸閾值', '換氣閾',
  '能量系統', '騎乘經濟性', '心率漂移', 'HRV', '無氧',
  '週期化', '基礎期', 'Taper', '極化訓練', 'Sweet Spot', '間歇', '訓練台', '過度訓練',
  '熱適應', '補給', '迴轉速', '踩踏', '曲柄長度', '座墊高度', '卡踏', '空力姿勢',
  '閉鎖鏈', '離車訓練',
];

// 取出一篇文章（標題優先，其次內文）涉及的主題詞
export const topicsOf = a => {
  const t = a.title || '', c = a.content || '';
  return TOPIC_TERMS.filter(k => t.includes(k) || (c.split(k).length - 1) >= 3);
};

export const loadArticles = () => JSON.parse(readFileSync(join(REPO, 'data/articles.json'), 'utf8'));
export const loadSite = () => JSON.parse(readFileSync(join(REPO, 'data/site.json'), 'utf8'));
export const logoDataURI = () => 'data:image/png;base64,' + readFileSync(join(REPO, 'assets/logo.png')).toString('base64');
export const photoDataURI = () => 'data:image/jpeg;base64,' + readFileSync(join(REPO, 'assets/sky-photo.jpeg')).toString('base64');
export const roundedFontDataURI = () => 'data:font/ttf;base64,' + readFileSync(join(REPO, 'assets/jf-openhuninn.ttf')).toString('base64');

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
  h1{font-family:"Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif;font-weight:700;font-size:74px;line-height:1.32;
    max-width:1000px;letter-spacing:.01em;overflow:hidden;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical}
  .foot{display:flex;align-items:center;gap:20px}
  .foot img{width:64px;height:64px;border-radius:50%;background:#fff}
  .foot .n{font-family:"Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif;font-weight:700;font-size:34px}
  .foot .n small{display:block;font-family:"SF Mono",monospace;font-size:19px;letter-spacing:.16em;color:#54708C;font-weight:400;margin-top:4px}
</style></head><body>
  <div><div class="eyebrow">${esc(eyebrow)}</div><h1>${esc(title)}</h1></div>
  <div class="foot"><img src="${logo}" alt="Sky 物理治療師 logo"><div class="n">Sky 物理治療師<small>${esc(footer)}</small></div></div>
</body></html>`;

/* ---------- 首頁 OG 分享卡（含人像照，1200×630） ---------- */
export const ogHomeCard = ({ eyebrow, titleLines, footer, logo, photo, roundedFont }) => `<!doctype html><html><head><meta charset="utf-8">
<style>
  @font-face{font-family:"OpenHuninn";src:url(${roundedFont}) format("truetype");font-weight:400;font-display:block}
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:1200px;height:630px;overflow:hidden}
  body{font-family:"OpenHuninn","Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif;
    background:linear-gradient(135deg,#E0F0FB 0%,#DCEEEB 100%);color:#232A50;
    padding:80px 90px;display:flex;justify-content:space-between;align-items:stretch;position:relative;overflow:hidden}
  body::before{content:"";position:absolute;left:0;top:0;bottom:0;width:14px;background:#149A8A}
  .glow{position:absolute;right:-60px;top:50%;transform:translateY(-50%);width:560px;height:560px;border-radius:50%;
    background:radial-gradient(circle,rgba(20,154,138,.22) 0%,rgba(20,154,138,0) 70%)}
  .left{display:flex;flex-direction:column;justify-content:center;gap:64px;align-self:stretch;flex:1;min-width:0;position:relative;z-index:1}
  .eyebrow{font-family:"OpenHuninn","Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif;font-size:26px;letter-spacing:.1em;color:#54708C;
    margin-bottom:30px;display:flex;align-items:center;gap:11px}
  .eyebrow::before{content:"";width:11px;height:11px;border-radius:50%;background:#149A8A;flex:none}
  .eyebrow::after{content:"";height:1px;flex:1;max-width:90px;background:#BAD7EA}
  h1{font-family:"OpenHuninn","Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif;font-weight:400;font-size:68px;line-height:1.45;
    letter-spacing:0}
  h1 .line{white-space:nowrap}
  .foot{display:flex;align-items:center;gap:20px}
  .foot img{width:64px;height:64px;border-radius:50%;background:#fff}
  .foot .n{font-family:"OpenHuninn","Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif;font-weight:400;font-size:34px}
  .foot .n .sky{color:#149A8A}
  .foot .n small{display:block;font-family:"OpenHuninn","Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif;font-size:19px;letter-spacing:.05em;color:#54708C;font-weight:400;margin-top:4px}
  .photo-wrap{flex:0 0 auto;width:300px;border-radius:24px;overflow:hidden;margin-left:56px;position:relative;z-index:1;
    box-shadow:0 20px 50px rgba(20,50,60,.18),0 0 0 3px rgba(20,154,138,.35);border:5px solid #fff}
  .photo-wrap img{width:100%;height:100%;object-fit:cover;object-position:top center}
</style></head><body>
  <div class="glow"></div>
  <div class="left">
    <div><div class="eyebrow">${esc(eyebrow)}</div><h1>${titleLines.map(l => `<div class="line">${esc(l)}</div>`).join('')}</h1></div>
    <div class="foot"><img src="${logo}" alt="Sky 物理治療師 logo"><div class="n"><span class="sky">Sky</span> 物理治療師<small>${esc(footer)}</small></div></div>
  </div>
  <div class="photo-wrap"><img src="${photo}" alt="Sky 物理治療師"></div>
</body></html>`;

export async function shot(page, html, outPath) {
  await page.setViewportSize({ width: 1200, height: 630 });
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.screenshot({ path: outPath, type: 'jpeg', quality: 84 });
}
