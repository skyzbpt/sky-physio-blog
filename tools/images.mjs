// 四個圖庫一次搜：Pixabay、Openverse、Unsplash、Wikimedia Commons
//
// 用法：
//   npm run img -- search "frozen shoulder" [--n 5] [--only pixabay,unsplash]
//   npm run img -- pick <pixabay|openverse|unsplash|wikimedia> <文章 id> <圖片 id> [--alt "替代文字"]
//
// 選哪一家：
//   Pixabay   免標註、存站內；照片多、商業感重
//   Openverse CC 授權、存站內；一定要標作者與授權（工具已自動加）
//   Unsplash  畫質最好；必須外連 images.unsplash.com，不可下載
//   Wikimedia 解剖圖、醫學影像多；CC 授權要標作者（工具已自動加），免金鑰
import * as pixabay from './pixabay.mjs';
import * as openverse from './openverse.mjs';
import * as unsplash from './unsplash.mjs';
import * as wikimedia from './wikimedia.mjs';
import { run, usageError } from './stock-lib.mjs';

const PROVIDERS = { pixabay, openverse, unsplash, wikimedia };
const USAGE = `用法：
  npm run img -- search "<關鍵字>" [--n 5] [--only pixabay,openverse,unsplash,wikimedia]
  npm run img -- pick <pixabay|openverse|unsplash|wikimedia> <文章 id> <圖片 id> [--alt "替代文字"]`;

run(async ({ pos: [cmd, ...rest], opt }) => {
  if (cmd === 'search' && rest[0]) {
    const names = opt.only ? String(opt.only).split(',') : Object.keys(PROVIDERS);
    const results = await Promise.allSettled(names.map(n => PROVIDERS[n].search(rest[0], +opt.n || 5)));
    results.forEach((r, i) => {
      console.log(`\n== ${names[i]} ==`);
      if (r.status === 'rejected') return console.log('  ✗ ' + r.reason.message);
      if (!r.value.length) return console.log('  （沒有結果）');
      for (const x of r.value) console.log(`  ${x.id}\t${x.w}×${x.h}\t${x.license}\t${x.author}\t${x.desc.slice(0, 60)}\n  \t${x.page}`);
    });
  } else if (cmd === 'pick' && PROVIDERS[rest[0]] && rest[1] && rest[2]) {
    await PROVIDERS[rest[0]].pick(rest[1], rest[2], { alt: opt.alt });
    console.log(`✓ 已用 ${rest[0]} ${rest[2]} 更新文章 ${rest[1]} 的配圖；記得 npm run build`);
  } else throw usageError('參數不足');
}, USAGE);
