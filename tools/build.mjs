// 全站建置：data/articles.json →（注入 index.html）→ 靜態頁／OG 卡／sitemap／主題頁／RSS／404／llms
// 用法：node tools/build.mjs
// 這是「發佈」的唯一路徑——後台把 data/articles.json 推上 GitHub 後，
// GitHub Actions 會跑這支腳本重建全站，再由 GitHub Pages 部署。
import { chromium } from 'playwright';
import { injectArticles } from './inject.mjs';
import { genPosts } from './gen-posts.mjs';
import { genExtras } from './gen-extras.mjs';
import { genLlms } from './gen-llms.mjs';

console.log('=== 1/4 注入 index.html ===');
injectArticles();

const browser = await chromium.launch();
const page = await browser.newPage();

console.log('=== 2/4 文章頁 + OG + sitemap ===');
await genPosts(page);

console.log('=== 3/4 主題頁 + RSS + 404 ===');
await genExtras(page);

await browser.close();

console.log('=== 4/4 llms（GEO / AI 摘要）===');
genLlms();

console.log('=== 建置完成 ===');
