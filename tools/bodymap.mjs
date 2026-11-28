// /blog 的「哪裡不舒服？」人體部位圖：建置時由 tools/inject.mjs 寫進 blog.html，
// 點選後的篩選由 assets/blog.js 處理（按鈕與圓點都帶 data-part）。
//
// 人體圖是一張固定尺寸的 SVG（寬 120、高 400，原點在身體中線），頁面上以 1:1 顯示，
// 所以圓點的 y 座標就是按鈕在圖上的高度（px）：按鈕用 top 對齊圓點，引線從圓點水平拉到圖的邊緣，
// 按鈕再從邊緣接著排出去——不論螢幕多寬，引線都剛好接到按鈕。
// 左右兩欄交錯排，同一欄相鄰兩個圓點的高度至少差 38px，按鈕（32px 高）才不會疊在一起。
import { BODY_PARTS, esc } from './lib.mjs';

export const FIG_W = 120, FIG_H = 400;

// 圓點位置：x 在 -60～60 之間（負值是畫面左側），side 決定按鈕排在哪一欄
export const DOTS = {
  'head':        { x: 9,   y: 32,  side: 'R' },
  'neck':        { x: -4,  y: 52,  side: 'L' },
  'shoulder':    { x: 33,  y: 70,  side: 'R' },
  'upper-back':  { x: -17, y: 96,  side: 'L' },
  'elbow-wrist': { x: -48, y: 166, side: 'L' },
  'lower-back':  { x: 22,  y: 140, side: 'R' },
  'hip':         { x: 25,  y: 190, side: 'R' },
  'thigh':       { x: 17,  y: 240, side: 'R' },
  'knee':        { x: -17, y: 298, side: 'L' },
  'ankle':       { x: -16, y: 358, side: 'L' },
  'foot':        { x: 18,  y: 386, side: 'R' },
};

// 身體：左半邊畫好，右半邊用鏡像（scale(-1,1)）重複使用
const FIGURE = `
      <defs>
        <g id="bm-half">
          <path d="M-7 53C-18 54-31 56-36 64C-40 71-39 86-35 99C-31 114-27 132-27 148C-27 163-32 177-33 191C-34 203-30 212-20 216L1 216L1 53Z"/>
          <path d="M-36 61C-44 68-46 88-46 106C-47 125-49 148-51 168C-52 181-53 191-53 198L-43 199C-43 191-41 177-40 167C-38 147-36 124-33 99Z"/>
          <ellipse cx="-49" cy="208" rx="6.5" ry="11"/>
          <path d="M-33 188C-33 224-30 264-26 295C-24 311-26 329-24 345C-23 357-21 366-20 373L-12 373C-12 365-12 355-11 343C-10 329-9 313-9 299C-8 279-5 248-2 214L1 214L1 188Z"/>
          <path d="M-20 370C-23 377-27 385-25 389C-23 392-13 392-11 390C-9 388-11 379-12 370Z"/>
        </g>
      </defs>
      <ellipse class="bm-floor" cx="0" cy="393" rx="44" ry="5"/>
      <g class="bm-body">
        <ellipse cx="0" cy="27" rx="15.5" ry="18.5"/>
        <rect x="-6.5" y="40" width="13" height="18" rx="4"/>
        <use href="#bm-half"/>
        <use href="#bm-half" transform="scale(-1,1)"/>
      </g>`;

export function bodyMapHtml(counts) {
  const half = FIG_W / 2;
  const dots = BODY_PARTS.map(p => {
    const d = DOTS[p.id];
    if (!d) throw new Error(`bodymap.mjs 缺少部位圓點：${p.id}`);
    const edge = d.side === 'L' ? -half : half;
    // 還沒有文章的部位：圓點淡掉、按鈕停用（點了只會得到空清單）
    return `
      <g class="bm-dot${counts[p.id] ? '' : ' off'}" data-part="${p.id}">
        <line x1="${d.x}" y1="${d.y}" x2="${edge}" y2="${d.y}"/>
        <circle class="bm-halo" cx="${d.x}" cy="${d.y}" r="10"/>
        <circle class="bm-pt" cx="${d.x}" cy="${d.y}" r="4.5"/>
      </g>`;
  }).join('');
  const btns = BODY_PARTS.map(p => {
    const d = DOTS[p.id], n = counts[p.id] || 0;
    return `
    <button class="bm-btn ${d.side}" type="button" data-part="${p.id}" aria-pressed="false" style="top:${d.y - 16}px"${n ? '' : ' disabled'}>${esc(p.label)}<span class="n" aria-label="，${n} 篇">${n}</span></button>`;
  }).join('');
  return `
    <section class="bodymap" aria-labelledby="bm-h">
      <div class="bm-head">
        <h2 id="bm-h">哪裡不舒服？</h2>
        <p class="bm-tip"><span id="bm-tip">點選身體部位，找相關的衛教文章</span><button class="bm-clear" id="bm-clear" type="button" hidden>清除選擇</button></p>
      </div>
      <div class="bm-stage">
    <svg class="bm-fig" viewBox="${-half} 0 ${FIG_W} ${FIG_H}" width="${FIG_W}" height="${FIG_H}" aria-hidden="true" focusable="false">${FIGURE}${dots}
    </svg>${btns}
      </div>
    </section>
    `;
}
