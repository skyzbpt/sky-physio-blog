// 形象照網頁版產生器：assets/sky-photo.jpeg（3854×5781／3.2MB，OG 卡用的原始檔）
// → 縮成頁面實際需要的尺寸，避免首頁 LCP 下載 3.2MB 只為了顯示 340px 寬。
// 用法：node tools/gen-photo.mjs（需要 Chromium／Playwright；產出已提交進 repo）
import { readFileSync } from 'fs';
import { join } from 'path';
import { REPO } from './lib.mjs';

// 原始比例 3854×5781 ≈ 2:3
const SIZES = [
  { w: 680, h: 1020, out: 'assets/sky-photo-680.jpg', q: 82 }, // 首頁形象照（340px 版位 @2x）
  { w: 360, h: 540,  out: 'assets/sky-photo-360.jpg', q: 82 }, // 手機首頁／關於我圓形頭像（168px @2x）
];

export async function genPhoto(page) {
  if (!page) { console.warn('⚠ 無 Chromium，略過形象照網頁版產生（沿用 repo 內已提交的圖片）。'); return; }
  const src = 'data:image/jpeg;base64,' + readFileSync(join(REPO, 'assets/sky-photo.jpeg')).toString('base64');
  for (const { w, h, out, q } of SIZES) {
    await page.setViewportSize({ width: w, height: h });
    await page.setContent(
      `<html><body style="margin:0">
         <img src="${src}" style="display:block;width:${w}px;height:${h}px;object-fit:cover">
       </body></html>`,
      { waitUntil: 'networkidle' });
    await page.screenshot({ path: join(REPO, out), type: 'jpeg', quality: q });
    console.log(`  ${out} — ${w}×${h}`);
  }
}

// 直接執行時自行啟動瀏覽器
if (import.meta.url === `file://${process.argv[1]}`) {
  const { chromium } = await import('playwright');
  // CHROMIUM_PATH：建置環境已自備 Chromium 時指定執行檔，省去重新下載
  const browser = await chromium.launch(
    process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage();
  await genPhoto(page);
  await browser.close();
}
