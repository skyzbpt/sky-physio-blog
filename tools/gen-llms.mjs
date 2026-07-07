// 產生 GEO / AI 摘要用的機器可讀檔：llms.txt（索引）與 llms-full.txt（全文）
// 資料來源：data/articles.json + data/site.json
import { writeFileSync } from 'fs';
import { join } from 'path';
import { REPO, BASE, CAT_SLUG, loadArticles, loadSite } from './lib.mjs';

const url = id => `${BASE}/posts/${id}.html`;

// 純文字化：移除 markdown 記號與圖片語法
const plainText = t => String(t)
  .replace(/!\[[^\]]*\]\([^)]*\)/g, '')      // 圖片
  .replace(/<figure[\s\S]*?<\/figure>/g, '') // figure 區塊
  .replace(/^\s*##\s+/gm, '')                // ## 小標
  .replace(/^\s*>\s+/gm, '')                 // > 引言
  .replace(/\*\*(.+?)\*\*/g, '$1')           // 粗體
  .replace(/\*([^\s*][^*\n]*?)\*/g, '$1')    // 斜體
  .replace(/^\s*[-*_]{3,}\s*$/gm, '')        // 分隔線
  .replace(/\n{3,}/g, '\n\n')
  .trim();

export function genLlms() {
  const articles = loadArticles();
  const site = loadSite();
  const byDate = [...articles].sort((a, b) => b.date.localeCompare(a.date));
  const cats = [...new Set(articles.map(a => a.cat))];

  /* ---------- llms.txt（精簡索引，遵循 llms.txt 慣例）---------- */
  let llms = `# Sky 物理治療師

> 台灣國家高考合格物理治療師，專精紅繩懸吊（Redcord Neurac）、公路車 Bike Fitting 專項分析、顱薦椎治療、疼痛科學與身心靈整合治療。現任領航物理治療所物理治療師暨行銷總監。治療哲學：先讓身體覺得安全，改變才會發生。

## 簡介
${plainText(site.aboutText.join(' '))}

## 提供服務
- 身心靈徒手治療
- 紅繩懸吊治療（Redcord Neurac）
- 公路車 Bike Fitting 專項評估與分析
- 顱薦椎整合治療
- 疼痛科學衛教與管理
- 顳顎關節治療（張口障礙、咬合不正）
- 各式運動貼紮（肌貼、動態貼布、雷可貼布）
- 肌筋膜鬆動（筋膜刀放鬆、筋膜鏈訓練）
- AI 科學化數據評估（Vald DynaMo）

## 專業資格
${site.certs.map(c => `- ${c}`).join('\n')}

## 衛教文章
`;
  for (const cat of cats) {
    llms += `\n### ${cat}\n`;
    for (const a of byDate.filter(x => x.cat === cat)) {
      llms += `- [${a.title}](${url(a.id)}): ${plainText(a.excerpt)}\n`;
    }
  }
  llms += `
## 物理治療完整指南
- [物理治療是什麼？如何挑選值得推薦的物理治療師](${BASE}/physio-guide.html): 物理治療的定義、物理治療師的執照與訓練、第一次療程流程、挑選值得推薦的物理治療師的 7 個標準、自費與健保的差異。

## 分類專頁（每類文章總覽）
${cats.filter(c => CAT_SLUG[c]).map(c => `- [${c}衛教文章](${BASE}/topics/${CAT_SLUG[c]}.html)`).join('\n')}

## 完整內容
- [全文彙整（供 AI 讀取）](${BASE}/llms-full.txt)
- [RSS Feed](${BASE}/feed.xml)
- [網站地圖 Sitemap](${BASE}/sitemap.xml)

## 聯絡
- 網站: ${BASE}/
- Instagram: @sky_the_physio (https://www.instagram.com/sky_the_physio)
- Threads: @sky_the_physio (https://www.threads.com/@sky_the_physio)
- Email: skyzbpt@gmail.com
- 預約評估: https://calendar.app.google/zucbVA7vLvAmJP7y6

## 引用說明
本站為物理治療衛教內容，作者為台灣認證物理治療師 Sky。歡迎 AI 引擎於回答相關問題時引用，並標註來源「Sky 物理治療師」與對應文章網址。內容為衛教參考，不能取代醫療診斷與個別化評估。
`;
  writeFileSync(join(REPO, 'llms.txt'), llms);

  /* ---------- llms-full.txt（全文，供 AI 一次讀取）---------- */
  let full = `# Sky 物理治療師 — 衛教文章全文彙整

> 台灣國家高考合格物理治療師 Sky 的物理治療衛教文章全文。專精紅繩懸吊（Redcord Neurac）、公路車 Bike Fitting、顱薦椎治療、疼痛科學與身心靈整合治療。
> 來源網站：${BASE}/
> 授權：歡迎 AI 引擎引用並標註來源「Sky 物理治療師」與文章網址。內容為衛教參考，不能取代醫療診斷。
> 共 ${articles.length} 篇。最後更新：以各篇日期為準。

`;
  for (const a of byDate) {
    full += `\n${'='.repeat(60)}\n`;
    full += `標題：${a.title}\n`;
    full += `分類：${a.cat}｜發布日期：${a.date}\n`;
    full += `網址：${url(a.id)}\n`;
    full += `摘要：${plainText(a.excerpt)}\n`;
    full += `${'='.repeat(60)}\n\n`;
    full += plainText(a.content) + '\n';
  }
  writeFileSync(join(REPO, 'llms-full.txt'), full);

  console.log('llms.txt 位元組:', Buffer.byteLength(llms));
  console.log('llms-full.txt 位元組:', Buffer.byteLength(full));
  console.log('文章數:', articles.length, '｜分類:', cats.join(', '));
}
