// 在地 / 專長落地頁（SEO・GEO・Google AI 摘要）
//   /triathlon-physio  三鐵運動修復
//   /beitou-physio     北投推薦物理治療師
//   /shilin-physio     士林推薦物理治療師
//   /shipai-physio     石牌推薦物理治療師
//
// 版型（CSS、導覽列、頁尾）沿用 taipei-physio.html，確保風格一致；
// 每頁都有：答案優先的「快速解答」、在地／專項內容、FAQ（同步輸出 FAQPage 結構化資料）、
// 相關衛教文章（從 data/articles.json 取標題，找不到 id 會直接報錯，避免死連結）。
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { REPO } from './lib.mjs';
import { CHROME_CSS, siteHeader } from './css.mjs';

const BASE = 'https://skythephysio.com';
const BOOK = 'https://calendar.app.google/wdsPTQDhF2YCigPu6';
const UPDATED = '2026-11-09';

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const strip = s => String(s).replace(/<[^>]+>/g, '');

/* 搜尋時常見的品牌寫法（含無空白、英文帳號），讓「sky物理治療師」等查詢都能對到同一個實體 */
export const BRAND_ALIASES = ['Sky 物理治療師', 'sky物理治療師', 'Sky物理治療師', 'Sky the Physio', 'sky_the_physio', 'Sky PT'];

export const LANDING_PAGES = [
  /* ------------------------------------------------------------ 三鐵運動修復 */
  {
    slug: 'triathlon-physio',
    title: '三鐵運動修復｜台北鐵人三項物理治療師 Sky',
    h1: '三鐵運動修復：台北鐵人三項物理治療師 Sky',
    crumb: '三鐵運動修復',
    metaCat: '三鐵運動修復',
    desc: '三鐵運動修復是什麼？台北物理治療師 Sky 專注鐵人三項的游泳肩、騎車膝蓋痛與下背痛、跑者膝、阿基里斯腱痛與足底筋膜炎，用評估、紅繩懸吊、肌筋膜治療與公路車 Bike Fitting 幫你回到訓練。北投・士林看診，線上預約。',
    keywords: '三鐵運動修復,鐵人三項物理治療,三鐵物理治療師,鐵人三項運動傷害,三鐵受傷,台北三鐵物理治療,游泳肩,騎車膝蓋痛,跑者膝,阿基里斯腱痛,足底筋膜炎,紅繩懸吊,Bike Fitting,Sky物理治療師',
    lede: '游泳、騎車、跑步輪流練，總量很大，休息卻常被擠掉。三鐵的傷大多不是一次撞出來的，而是一點一點累積的。我是 Sky，台北北投・士林的物理治療師，自己也騎公路車比賽。這一頁說清楚：三鐵運動修復在做什麼、常見哪些痛，以及我會怎麼幫你。',
    quick: [
      ['三鐵運動修復是什麼？', '針對鐵人三項（游泳、自行車、跑步）累積性運動傷害的物理治療：找出負荷從哪裡來，處理疼痛，再把身體的能力練回來，讓你能繼續訓練與比賽。'],
      ['台北哪裡可以做三鐵運動修復？', 'Sky 物理治療師在台北市北投區與士林區看診，專長就是三鐵與耐力運動；一對一、預約制，可線上預約評估。'],
      ['受傷一定要完全停練嗎？', '大多不用。通常是調整「練什麼、練多少」，痛的項目先減量，其他項目照練，一邊治療一邊回到原本的訓練量。'],
    ],
    sections: [
      { id: 'what', h: '三鐵運動修復，到底在修什麼？', html: `
      <p>簡單說：<strong>修的是「身體承受的量」和「身體能承受的量」之間的落差。</strong></p>
      <p>三鐵的訓練量很大，又分成三種動作。某一項的姿勢有點偏、某一段肌力不夠，平常感覺不出來，量一拉高，負擔就會集中在同一個地方——肩膀、膝蓋、腳跟、下背。痛，就是身體在說「這裡超載了」。</p>
      <p>所以三鐵運動修復不只是「把痛壓下去」，而是三件事一起做：<strong>先減輕痛、找出超載的原因、把身體的承受能力練回來。</strong></p>` },
      { id: 'injuries', h: '三個項目，最常見的痛', html: `
      <ul class="guide-cards">
        <li><strong>游泳：肩膀前面、上方痛</strong><span class="sep">：</span>划水次數一多，旋轉肌袖和肩胛的穩定跟不上，抬手、划水入水時卡卡的。</li>
        <li><strong>自行車：膝蓋痛、下背痛</strong><span class="sep">：</span>座墊高度、扣片位置、龍頭距離差一點點，一次騎幾小時就會放大成痛。</li>
        <li><strong>自行車：手麻、頸肩痛</strong><span class="sep">：</span>趴在休息把上太久、重心壓在手上，頸部一直抬著看路。</li>
        <li><strong>跑步：跑者膝、膝蓋外側痛</strong><span class="sep">：</span>從車上下來接著跑，髖部累了，膝蓋就跟著扛。</li>
        <li><strong>跑步：阿基里斯腱、足底痛</strong><span class="sep">：</span>跑量增加太快、小腿力量不夠，早上下床第一步最痛。</li>
        <li><strong>全項目：恢復不夠</strong><span class="sep">：</span>睡不夠、吃不夠、課表太滿，身體一直處在疲勞的狀態，小傷就好不了。</li>
      </ul>` },
      { id: 'how', h: 'Sky 怎麼做三鐵運動修復？', html: `
      <ol class="guide-steps">
        <li><strong>聽你的訓練</strong><span class="sep">：</span>最近的課表、跑量騎量、比賽日期，痛是在哪一項、哪個時間點出現。</li>
        <li><strong>評估與量化</strong><span class="sep">：</span>關節活動度、肌力與動作控制，需要時用 Vald DynaMo 測出左右差。</li>
        <li><strong>處理疼痛</strong><span class="sep">：</span>依狀況用<a href="/topics/myofascial">肌筋膜疼痛治療</a>鬆開累積的張力。</li>
        <li><strong>把支撐補回去</strong><span class="sep">：</span>用<a href="/topics/redcord">紅繩懸吊（Redcord Neurac）</a>喚醒深層穩定肌，讓力量傳得順。</li>
        <li><strong>調整車上姿勢</strong><span class="sep">：</span>需要時加做<a href="/topics/cycling">公路車 Bike Fitting</a>，從座墊、扣片、把手處理騎車的痛。</li>
        <li><strong>回到訓練的計畫</strong><span class="sep">：</span>先練什麼、哪一項暫時減量、什麼時候可以加回來，寫清楚給你。</li>
      </ol>
      <p>要先說清楚的是：我處理的是<strong>身體與傷痛</strong>；課表與配速屬於教練的專業。如果你有教練，我很樂意跟他一起討論。</p>` },
      { id: 'when', h: '什麼時候該找物理治療師？', html: `
      <ul>
        <li>同一個地方痛超過 <strong>兩週</strong>，休息幾天好了、一練又回來。</li>
        <li>痛到需要<strong>改變動作</strong>才能繼續（跑步跛、划水縮手、騎車歪一邊）。</li>
        <li>比賽快到了，想知道<strong>還能不能練、怎麼練</strong>。</li>
        <li>受傷或開刀後，想<strong>安全地回到三項訓練</strong>。</li>
      </ul>
      <p>若有明顯腫脹、無法負重、夜間劇痛、發燒或麻木無力越來越嚴重，請先就醫檢查。</p>` },
    ],
    related: ['cycling-knee-pain-anterior', 'cycling-low-back-pain-riding', 'cycling-neck-shoulder-pain', 'cycling-saddle-height', 'cycling-cleat-position', 'patellofemoral-pain', 'achilles-tendinopathy', 'plantar-heel-pain', 'return-to-running', 'rotator-cuff-basics', 'cycling-recovery-strategies', 'cycling-race-day-routine'],
    relatedTitle: '三鐵相關衛教文章',
    faqs: [
      ['三鐵運動修復跟一般復健有什麼不一樣？', '一般復健多半著重在讓痛消失；三鐵運動修復還會一起看你的訓練量、三個項目的動作與恢復狀況，目標是讓你回到訓練與比賽，而不只是不痛。'],
      ['我不是職業選手，只是業餘三鐵，也適合嗎？', '很適合。來找我的大多是有工作、有家庭、利用下班練習的業餘鐵人，時間有限，更需要把每一次練習都練在對的地方。'],
      ['比賽前一兩週受傷，還來得及嗎？', '要看是什麼傷。很多過度使用的痛，可以透過減量、調整動作與治療，讓你帶著可控的狀態完賽。評估後我會老實告訴你風險在哪裡。'],
      ['需要帶什麼？', '穿方便活動的衣服，有檢查報告可以一起帶。如果痛跟騎車有關，請帶自己的車、車鞋與車褲，方便一起看騎姿。'],
      ['在台北哪裡看診？怎麼預約？', '台北市北投區與士林區，一對一預約制。點網站上的「預約評估」選時段即可，確切地點會在預約確認時告訴你。'],
    ],
    service: { name: '三鐵運動修復', alt: ['鐵人三項物理治療', 'Triathlon Injury Rehabilitation'], desc: '針對鐵人三項（游泳、自行車、跑步）累積性運動傷害的一對一物理治療：評估、肌筋膜疼痛治療、紅繩懸吊訓練與公路車 Bike Fitting。' },
    cta: ['游泳、騎車、跑步，哪一項卡住了？', '一對一評估・台北市北投區 / 士林區'],
  },

  /* ------------------------------------------------------------ 北投 */
  {
    slug: 'beitou-physio',
    title: '北投推薦物理治療師｜Sky 物理治療師（北投・新北投・關渡）',
    h1: '北投推薦物理治療師：Sky 物理治療師',
    crumb: '北投物理治療師推薦',
    metaCat: '台北・北投',
    area: '北投',
    desc: '在找北投推薦的物理治療師？Sky 物理治療師在台北市北投區看診，北投、新北投、奇岩、唭哩岸、石牌、關渡一帶都方便。國家高考合格，專長三鐵運動修復、肌筋膜疼痛治療、紅繩懸吊與顱薦椎治療。每次一對一評估，先找出痛的原因再治療，歡迎線上預約初診。',
    keywords: '北投物理治療師,北投推薦物理治療師,北投物理治療推薦,北投物理治療,新北投物理治療,關渡物理治療,奇岩物理治療,北投運動傷害,北投自費物理治療,北投紅繩,Sky物理治療師',
    lede: '住在北投、在北投上班，想找一位離家近、願意花時間把問題說清楚的物理治療師？我是 Sky，在台北市北投區看診。這一頁整理北投的朋友最常問的事：在哪裡、適合誰、怎麼預約。',
    quick: [
      ['北投有推薦的物理治療師嗎？', 'Sky 物理治療師在台北市北投區看診，國家高考合格，專長三鐵運動修復、肌筋膜疼痛治療、紅繩懸吊與顱薦椎治療，一對一、預約制。'],
      ['北投哪些地方過來方便？', '北投、新北投、奇岩、唭哩岸、石牌、明德、復興崗、關渡一帶都很方便；搭捷運淡水信義線也很好到。'],
      ['怎麼預約？', '點網站上的「預約評估」選時段即可，確切地點會在預約確認時告訴你。'],
    ],
    sections: [
      { id: 'where', h: '在北投哪裡看診？', html: `
      <p>我在<strong>台北市北投區</strong>看診，全部<strong>預約制、一對一</strong>。住在<strong>北投、新北投、奇岩、唭哩岸、石牌、明德、復興崗、關渡</strong>的朋友過來都很近；捷運淡水信義線沿線也方便。</p>
      <p>確切地點會在預約確認時告訴你。如果你住天母、芝山、士林那一側，也可以看<a href="/shilin-physio">士林物理治療師</a>這一頁。</p>` },
      { id: 'who', h: '北投的朋友，常因為這些事來找我', html: `
      <ul class="guide-cards">
        <li><strong>爬山、騎車上陽明山</strong><span class="sep">：</span>下山膝蓋痛、騎完仰德大道下背痛。</li>
        <li><strong>關渡河濱騎車、跑步</strong><span class="sep">：</span>膝蓋前面、外側越騎越痛，阿基里斯腱緊。</li>
        <li><strong>三鐵與耐力運動</strong><span class="sep">：</span>游泳肩、跑者膝，練到一半卡關。</li>
        <li><strong>久站、搬重的工作</strong><span class="sep">：</span>溫泉旅館、服務業，一整天下來腰直不起來。</li>
        <li><strong>肩頸緊、頭痛</strong><span class="sep">：</span>按摩完舒服兩天又回來，想找出原因。</li>
        <li><strong>長期緊繃、睡不好</strong><span class="sep">：</span>身體一直處在警戒狀態，適合顱薦椎的輕觸。</li>
      </ul>` },
      { id: 'hotspring', h: '北投人常問：痠痛可以去泡溫泉嗎？', html: `
      <p>可以，但要看時機。<strong>運動後的肌肉痠、慢性的緊繃</strong>，泡溫泉的熱可以讓身體放鬆；但<strong>剛扭到、剛撞到、又紅又腫的急性傷</strong>，前兩三天先別泡，熱會讓腫脹更明顯。</p>
      <p>泡完覺得舒服、隔天又回來的痛，通常代表原因還在。這時候比起再泡一次，更需要找出是哪裡在超載。詳細可以看<a href="/posts/beitou-hot-spring-soreness">北投泡溫泉能不能緩解痠痛</a>。</p>` },
      { id: 'how', h: '第一次來，會做什麼？', html: `
      <ol class="guide-steps">
        <li><strong>聽你說</strong><span class="sep">：</span>哪裡痛、多久了、做什麼會更痛。</li>
        <li><strong>看你怎麼動</strong><span class="sep">：</span>姿勢、活動度、肌力與動作控制。</li>
        <li><strong>白話解釋</strong><span class="sep">：</span>為什麼會痛、接下來打算怎麼處理。</li>
        <li><strong>開始治療</strong><span class="sep">：</span>徒手治療、<a href="/topics/redcord">紅繩懸吊</a>、<a href="/topics/myofascial">肌筋膜放鬆</a>或<a href="/topics/craniosacral">顱薦椎</a>輕觸。</li>
        <li><strong>回家功課</strong><span class="sep">：</span>幾個簡單做得到的動作。</li>
      </ol>` },
    ],
    related: ['beitou-hot-spring-soreness', 'xinbeitou-massage-soreness', 'xinbeitou-housekeeping-back-pain', 'guandu-youbike-knee-pain', 'guandu-birdwatching-neck-pain', 'yangmingshan-hiking-knee-pain', 'yangmingshan-cycling-climb-pain', 'shipai-stairs-knee-osteoarthritis'],
    relatedTitle: '北投在地衛教文章',
    faqs: [
      ['Sky 物理治療師在北投哪裡？', '在台北市北投區，採一對一預約制。北投、新北投、奇岩、石牌、關渡一帶都方便，確切地點會在預約確認時告訴你。'],
      ['北投物理治療可以用健保嗎？', '我提供的是一對一自費物理治療，包含完整評估、徒手治療與運動訓練。費用依療程不同，預約時可以直接詢問，我會先說清楚再開始。'],
      ['不是運動員也可以嗎？', '可以。上班族的肩頸痛、下背痛、長輩的膝蓋痛、媽媽手，處理的邏輯一樣：找出負荷從哪裡來，再把身體的能力練回來。'],
      ['大概要來幾次？', '看問題而定。第一次評估後我會告訴你大概的方向與次數，並教你回家可以做的動作，目標是讓你越來越不需要回來。'],
    ],
    cta: ['住在北投、新北投、關渡？先從一次評估開始。', '一對一評估與治療・台北市北投區'],
  },

  /* ------------------------------------------------------------ 士林 */
  {
    slug: 'shilin-physio',
    title: '士林推薦物理治療師｜Sky 物理治療師（士林・天母・芝山）',
    h1: '士林推薦物理治療師：Sky 物理治療師',
    crumb: '士林物理治療師推薦',
    metaCat: '台北・士林',
    area: '士林',
    desc: '在找士林推薦的物理治療師？Sky 物理治療師在台北市士林區看診，士林、天母、芝山、劍潭一帶都方便。國家高考合格，專長三鐵運動修復、肌筋膜疼痛治療、紅繩懸吊、顱薦椎治療與公路車 Bike Fitting。一對一評估，歡迎線上預約初診。',
    keywords: '士林物理治療師,士林推薦物理治療師,士林物理治療推薦,士林物理治療,天母物理治療,天母物理治療師,芝山物理治療,士林運動傷害,士林自費物理治療,Sky物理治療師',
    lede: '住在士林、天母、芝山，想找一位專業、離家近，又願意用白話把問題講清楚的物理治療師？我是 Sky，在台北市士林區看診。這一頁告訴你：在哪裡、適合誰、第一次會做什麼。',
    quick: [
      ['士林有推薦的物理治療師嗎？', 'Sky 物理治療師在台北市士林區看診，國家高考合格，專長三鐵運動修復、肌筋膜疼痛治療、紅繩懸吊、顱薦椎治療與公路車 Bike Fitting，一對一、預約制。'],
      ['士林哪些地方過來方便？', '士林、天母、芝山、劍潭、蘭雅一帶都很方便；捷運淡水信義線劍潭、士林、芝山站沿線好到。'],
      ['怎麼預約？', '點網站上的「預約評估」選時段即可，確切地點會在預約確認時告訴你。'],
    ],
    sections: [
      { id: 'where', h: '在士林哪裡看診？', html: `
      <p>我在<strong>台北市士林區</strong>看診，全部<strong>預約制、一對一</strong>。住在<strong>士林、天母、芝山、劍潭、蘭雅</strong>一帶的朋友都很方便；捷運淡水信義線劍潭、士林、芝山站沿線也好到。</p>
      <p>確切地點會在預約確認時告訴你。住北投、石牌那一側的話，也可以看<a href="/beitou-physio">北投物理治療師</a>或<a href="/shipai-physio">石牌物理治療師</a>。</p>` },
      { id: 'who', h: '士林、天母的朋友，常因為這些事來找我', html: `
      <ul class="guide-cards">
        <li><strong>天母運動公園跑步</strong><span class="sep">：</span>膝蓋外側越跑越痛、跑完小腿很緊。</li>
        <li><strong>運動中心打羽球、打球</strong><span class="sep">：</span>腳跟後面痛、肩膀抬高會卡。</li>
        <li><strong>夜市擺攤、久站工作</strong><span class="sep">：</span>腳跟痛、早上下床第一步最痛。</li>
        <li><strong>新手爸媽</strong><span class="sep">：</span>抱寶寶抱到手腕大拇指那側痛（媽媽手）、下背痛。</li>
        <li><strong>公路車與三鐵</strong><span class="sep">：</span>騎車膝蓋痛、手麻、下背痛，或想做 Bike Fitting。</li>
        <li><strong>顳顎關節問題</strong><span class="sep">：</span>張嘴卡卡、咬東西痛、磨牙。</li>
      </ul>` },
      { id: 'how', h: '第一次來，會做什麼？', html: `
      <ol class="guide-steps">
        <li><strong>聽你說</strong><span class="sep">：</span>哪裡痛、多久了、做什麼會更痛，你想回到什麼樣的生活。</li>
        <li><strong>看你怎麼動</strong><span class="sep">：</span>姿勢、活動度、肌力與動作控制，需要時用儀器量化。</li>
        <li><strong>白話解釋</strong><span class="sep">：</span>為什麼會痛、我們打算怎麼處理。</li>
        <li><strong>開始治療</strong><span class="sep">：</span>徒手治療、<a href="/topics/redcord">紅繩懸吊</a>、<a href="/topics/myofascial">肌筋膜放鬆</a>，騎車的痛加上<a href="/topics/cycling">Bike Fitting</a>。</li>
        <li><strong>回家功課</strong><span class="sep">：</span>幾個簡單做得到的動作，讓改變留下來。</li>
      </ol>` },
      { id: 'tips', h: '給士林朋友的小提醒', html: `
      <p><strong>久站的人</strong>：每站一小時，找機會踮腳尖 10 下、坐下來轉轉腳踝，比下班後一次拉很久更有用。</p>
      <p><strong>週末才運動的人</strong>：平日完全不動、週末一次打三小時球，是最容易受傷的組合。平日找兩天做 15 分鐘的肌力訓練，週末會打得更久、更穩。</p>` },
    ],
    related: ['shilin-night-market-heel-pain', 'shilin-badminton-achilles', 'tianmu-running-lateral-knee-pain', 'zhishan-new-mom-de-quervain', 'zhishan-elderly-balance-falls', 'plantar-heel-pain', 'cycling-knee-pain-anterior'],
    relatedTitle: '士林・天母在地衛教文章',
    faqs: [
      ['Sky 物理治療師在士林哪裡？', '在台北市士林區，採一對一預約制。士林、天母、芝山、劍潭一帶都方便，確切地點會在預約確認時告訴你。'],
      ['士林物理治療可以用健保嗎？', '我提供的是一對一自費物理治療，包含完整評估、徒手治療與運動訓練。費用依療程不同，預約時可以直接詢問。'],
      ['天母過去方便嗎？', '方便。天母、芝山到士林都很近，很多個案就是住在天母、下班順路過來。'],
      ['第一次要準備什麼？', '穿方便活動的衣服，有 X 光、MRI 報告可以一起帶；想做騎姿分析的車友，請帶自己的車、車鞋與車褲。'],
    ],
    cta: ['住在士林、天母、芝山？先從一次評估開始。', '一對一評估與治療・台北市士林區'],
  },

  /* ------------------------------------------------------------ 石牌 */
  {
    slug: 'shipai-physio',
    title: '石牌推薦物理治療師｜Sky 物理治療師（石牌・榮總・明德・唭哩岸）',
    h1: '石牌推薦物理治療師：Sky 物理治療師',
    crumb: '石牌物理治療師推薦',
    metaCat: '台北・石牌',
    area: '石牌',
    desc: '在找石牌推薦的物理治療師？Sky 物理治療師在台北市北投區看診，石牌、榮總周邊、明德、唭哩岸、天母一帶都方便。國家高考合格，專長三鐵運動修復、肌筋膜疼痛治療、紅繩懸吊與顱薦椎治療，也協助術後與長輩的肌力平衡訓練。線上預約。',
    keywords: '石牌物理治療師,石牌推薦物理治療師,石牌物理治療推薦,石牌物理治療,榮總附近物理治療,明德物理治療,唭哩岸物理治療,石牌復健,石牌自費物理治療,Sky物理治療師',
    lede: '石牌一帶住著很多長輩、醫護人員與學生，也有不少剛看完醫師、想找物理治療師好好練回來的人。我是 Sky，在台北市北投區看診，石牌過來很近。這一頁說清楚：適合誰、可以怎麼幫你、怎麼預約。',
    quick: [
      ['石牌有推薦的物理治療師嗎？', 'Sky 物理治療師在台北市北投區看診，石牌、榮總周邊、明德、唭哩岸一帶都方便。國家高考合格，一對一、預約制。'],
      ['看完醫師，可以再找物理治療師一對一訓練嗎？', '可以。醫師負責診斷與用藥、手術；物理治療師負責評估動作、處理疼痛，並把肌力、平衡與活動能力練回來，兩者是合作關係。'],
      ['怎麼預約？', '點網站上的「預約評估」選時段即可，確切地點會在預約確認時告訴你。'],
    ],
    sections: [
      { id: 'where', h: '石牌過來方便嗎？', html: `
      <p>很方便。我在<strong>台北市北投區</strong>看診（石牌本身就在北投區），全部<strong>預約制、一對一</strong>。住在<strong>石牌、榮總周邊、明德、唭哩岸、立農、天母</strong>一帶的朋友都很近；捷運石牌站、明德站、唭哩岸站沿線也好到。</p>
      <p>確切地點會在預約確認時告訴你。其他區域可以看<a href="/beitou-physio">北投</a>或<a href="/shilin-physio">士林</a>這兩頁。</p>` },
      { id: 'who', h: '石牌的朋友，常因為這些事來找我', html: `
      <ul class="guide-cards">
        <li><strong>膝蓋退化、上下樓梯痛</strong><span class="sep">：</span>捷運站樓梯、家裡沒電梯，一上一下膝蓋就痛。</li>
        <li><strong>長輩怕跌倒</strong><span class="sep">：</span>走路不穩、腳踝沒力，想把平衡練回來。</li>
        <li><strong>術後想練回來</strong><span class="sep">：</span>膝、髖關節置換或韌帶手術後，想有人一對一帶著練。</li>
        <li><strong>醫護與輪班工作者</strong><span class="sep">：</span>久站、搬病人，下背和肩頸長期緊繃。</li>
        <li><strong>學生與久坐族</strong><span class="sep">：</span>低頭讀書、打電腦，肩頸痛、頭痛。</li>
        <li><strong>三鐵與跑者</strong><span class="sep">：</span>練到膝蓋、腳跟痛，想安全地回到訓練。</li>
      </ul>` },
      { id: 'elderly', h: '給石牌長輩與家人的話', html: `
      <p>膝蓋退化不代表只能「少動」。<strong>大腿和臀部的肌力越好，膝蓋承受的壓力就越小</strong>，上下樓梯也會越來越輕鬆。</p>
      <p>我會先看長輩怎麼走路、怎麼起身、怎麼上下台階，再挑幾個在家就能安全做的動作，從很輕的量開始。家人可以一起來，學會怎麼在旁邊陪練。延伸閱讀：<a href="/posts/shipai-stairs-knee-osteoarthritis">上下捷運樓梯膝蓋就痛？退化性膝關節炎的長輩這樣練</a>。</p>` },
      { id: 'how', h: '第一次來，會做什麼？', html: `
      <ol class="guide-steps">
        <li><strong>聽你說</strong><span class="sep">：</span>哪裡痛、多久了，醫師怎麼說，有沒有開過刀。</li>
        <li><strong>看你怎麼動</strong><span class="sep">：</span>走路、起身、上下台階、平衡與肌力。</li>
        <li><strong>白話解釋</strong><span class="sep">：</span>為什麼會痛、接下來怎麼練。</li>
        <li><strong>開始治療</strong><span class="sep">：</span>徒手治療、<a href="/topics/redcord">紅繩懸吊</a>減重訓練、<a href="/topics/myofascial">肌筋膜放鬆</a>。</li>
        <li><strong>回家功課</strong><span class="sep">：</span>幾個安全、做得到的動作。</li>
      </ol>` },
    ],
    related: ['shipai-stairs-knee-osteoarthritis', 'zhishan-elderly-balance-falls', 'total-knee-replacement-rehab', 'total-hip-replacement-rehab', 'knee-pain-overview', 'yangmingshan-hiking-knee-pain'],
    relatedTitle: '石牌・北投在地與相關衛教文章',
    faqs: [
      ['Sky 物理治療師在石牌附近嗎？', '在台北市北投區，石牌、榮總周邊、明德、唭哩岸都很近。採一對一預約制，確切地點會在預約確認時告訴你。'],
      ['開完刀可以直接來嗎？', '可以，但請先確認主治醫師對活動的限制（例如可以彎到幾度、能不能負重），有出院衛教單或手術紀錄可以一起帶來。'],
      ['長輩行動不方便，家人可以陪同嗎？', '可以，也很鼓勵。家人一起學會回家怎麼陪練，效果會更好。'],
      ['石牌物理治療可以用健保嗎？', '我提供的是一對一自費物理治療。費用依療程不同，預約時可以直接詢問，我會先說清楚再開始。'],
    ],
    cta: ['住在石牌、明德、唭哩岸？先從一次評估開始。', '一對一評估與治療・台北市北投區（石牌周邊）'],
  },
];

/* 兩個手寫的靜態頁（台北推薦頁、物理治療指南）各自內嵌一份樣式與頁首。
   頁首與它的響應式規則改由 css.mjs 供應，這裡在建置時寫回這兩個檔案——
   否則選單改一次要手動改五個地方，一定會漏。
   落地頁的版型取自 taipei-physio.html（見下方 shell()），所以必須先同步、再產生落地頁。 */
const STATIC_PAGES = ['taipei-physio.html', 'physio-guide.html'];
export function syncChrome() {
  const cssRe = /\/\*===CHROME-CSS:START===\*\/[\s\S]*?\/\*===CHROME-CSS:END===\*\//;
  const headRe = /<header>[\s\S]*?<\/header>/;
  for (const f of STATIC_PAGES) {
    const file = join(REPO, f);
    let html = readFileSync(file, 'utf8');
    if (!cssRe.test(html)) throw new Error(`${f} 找不到 CHROME-CSS 標記`);
    if (!headRe.test(html)) throw new Error(`${f} 找不到 <header>`);
    html = html.replace(cssRe, () => `/*===CHROME-CSS:START===*/${CHROME_CSS}\n/*===CHROME-CSS:END===*/`);
    html = html.replace(headRe, () => siteHeader({ asset: 'assets/' }));
    writeFileSync(file, html);
  }
  console.log(`已同步頁首與手機選單：${STATIC_PAGES.join('、')}`);
}

/* 共用版型：從 taipei-physio.html 取出 <style>、導覽列與頁尾，所有落地頁長得一樣 */
function shell() {
  const src = readFileSync(join(REPO, 'taipei-physio.html'), 'utf8');
  const style = src.match(/<style>[\s\S]*?<\/style>/)[0];
  const header = src.match(/<header>[\s\S]*?<\/header>/)[0];
  const footer = src.match(/<footer>[\s\S]*?<\/footer>/)[0];
  const script = src.match(/<script>\n\/\* 電腦版目錄[\s\S]*?<\/script>/)[0];
  return { style, header, footer, script };
}

const CAL_SVG = (s) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;

const QUICK_CSS = `
.quick{margin:0 0 38px;padding:20px 22px 8px;border:1px solid var(--line);border-left:3px solid var(--sky);border-radius:14px;background:#F1F7FC}
.quick h2{font-family:var(--mono);font-size:.75rem;letter-spacing:.18em;color:var(--muted);font-weight:400;margin:0 0 12px}
.quick dl{margin:0}
.quick dt{font-family:var(--serif);font-weight:700;font-size:.98rem;line-height:1.7;color:var(--ink);margin:0 0 4px}
.quick dd{font-family:var(--serif);font-size:.95rem;line-height:1.95;color:var(--ink-2);margin:0 0 14px;padding-bottom:14px;border-bottom:1px dashed var(--line)}
.quick dd:last-child{border-bottom:none;padding-bottom:0}
.areas{display:flex;flex-wrap:wrap;gap:10px;margin:0 0 1.7em}
.post-body .areas a{border:1px solid var(--line);border-radius:999px;padding:6px 16px;font-size:.9rem;background:var(--bg-soft)}
@media(max-width:480px){.quick{padding:16px 16px 6px}}
</style>`;

function clinicNode() {
  return {
    '@type': ['MedicalBusiness', 'Physiotherapy'],
    '@id': `${BASE}/#clinic`,
    name: 'Sky 物理治療師',
    alternateName: [...BRAND_ALIASES.filter(a => a !== 'Sky 物理治療師'), '台北物理治療師 Sky', '北投物理治療師 Sky', '士林物理治療師 Sky'],
    description: '台北市北投區、士林區（北投・石牌・天母・士林・芝山・關渡）的一對一物理治療：三鐵運動修復、肌筋膜疼痛治療、紅繩懸吊、顱薦椎治療、顳顎關節治療與公路車 Bike Fitting。',
    url: `${BASE}/`,
    image: `${BASE}/assets/og-home.jpg`,
    logo: `${BASE}/assets/logo.png`,
    email: 'skyzbpt@gmail.com',
    address: { '@type': 'PostalAddress', addressLocality: '北投區', addressRegion: '台北市', addressCountry: 'TW' },
    areaServed: [
      { '@type': 'City', name: '台北市' },
      { '@type': 'AdministrativeArea', name: '台北市北投區' },
      { '@type': 'AdministrativeArea', name: '台北市士林區' },
      ...['北投', '新北投', '石牌', '天母', '芝山', '關渡', '唭哩岸', '明德'].map(n => ({ '@type': 'Place', name: n })),
      { '@type': 'City', name: '新北市' },
    ],
    medicalSpecialty: ['三鐵運動修復', '運動物理治療', '肌筋膜疼痛治療', '紅繩懸吊治療 Redcord Neurac', '顱薦椎整合治療', '疼痛管理', '公路車專項分析'],
    potentialAction: { '@type': 'ReserveAction', name: '預約物理治療評估', target: BOOK },
    sameAs: ['https://www.instagram.com/sky_the_physio', 'https://www.threads.com/@sky_the_physio'],
    employee: { '@type': 'Person', '@id': `${BASE}/#sky`, name: 'Sky', alternateName: BRAND_ALIASES, jobTitle: '物理治療師', url: `${BASE}/about` },
  };
}

function render(p, articles, tpl) {
  const url = `${BASE}/${p.slug}`;
  const byId = new Map(articles.map(a => [a.id, a]));
  const related = p.related.map(id => {
    const a = byId.get(id);
    if (!a) throw new Error(`gen-landing: ${p.slug} 引用了不存在的文章 id「${id}」`);
    return a;
  });

  const graph = [
    {
      '@type': 'WebPage', '@id': url, url, name: p.title, description: p.desc, inLanguage: 'zh-TW',
      isPartOf: { '@id': `${BASE}/#website` },
      about: p.service ? { '@id': `${url}#service` } : { '@id': `${BASE}/#clinic` },
      mainEntity: { '@id': `${BASE}/#clinic` },
      author: { '@id': `${BASE}/#sky` },
      dateModified: UPDATED,
      speakable: { '@type': 'SpeakableSpecification', cssSelector: ['h1', '.quick'] },
      ...(p.area ? { spatialCoverage: { '@type': 'Place', name: `台北市${p.area}` } } : {}),
    },
    clinicNode(),
    ...(p.service ? [{
      '@type': 'Service', '@id': `${url}#service`, name: p.service.name, alternateName: p.service.alt,
      serviceType: p.service.name, description: p.service.desc, url,
      provider: { '@id': `${BASE}/#clinic` },
      areaServed: [{ '@type': 'AdministrativeArea', name: '台北市北投區' }, { '@type': 'AdministrativeArea', name: '台北市士林區' }, { '@type': 'City', name: '台北市' }],
    }] : []),
    {
      '@type': 'FAQPage', '@id': `${url}#faq`,
      mainEntity: [...p.quick, ...p.faqs].map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: '首頁', item: `${BASE}/` },
        ...(p.area ? [{ '@type': 'ListItem', position: 2, name: '台北物理治療師推薦', item: `${BASE}/taipei-physio` }] : []),
        { '@type': 'ListItem', position: p.area ? 3 : 2, name: p.crumb, item: url },
      ],
    },
  ];

  const others = LANDING_PAGES.filter(o => o.slug !== p.slug);
  const toc = [['quick', '快速解答'], ...p.sections.map(s => [s.id, strip(s.h).replace(/[？?]$/, '')]), ['related', p.relatedTitle], ['faq', '常見問題'], ['author', '關於 Sky']];
  const minutes = Math.max(3, Math.round(strip(p.sections.map(s => s.html).join('')).length / 500));

  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#F4F9FD">
<title>${esc(p.title)}</title>
<meta name="description" content="${esc(p.desc)}">
<meta name="keywords" content="${esc(p.keywords)}">
<meta name="author" content="Sky 物理治療師">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
<link rel="canonical" href="${url}">
<link rel="icon" href="favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="512x512" href="assets/favicon-512.png">
<link rel="icon" type="image/png" sizes="192x192" href="assets/favicon-180.png">
<link rel="apple-touch-icon" sizes="180x180" href="apple-touch-icon.png">
<link rel="alternate" type="application/rss+xml" title="Sky 物理治療師衛教文章" href="feed.xml">
<meta property="og:type" content="website">
<meta property="og:locale" content="zh_TW">
<meta property="og:site_name" content="Sky 物理治療師">
<meta property="og:title" content="${esc(p.title)}">
<meta property="og:description" content="${esc(p.desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${BASE}/assets/og-home.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(p.title)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(p.title)}">
<meta name="twitter:description" content="${esc(p.desc)}">
<meta name="twitter:image" content="${BASE}/assets/og-home.jpg">
<meta name="geo.region" content="TW-TPE">
<meta name="geo.placename" content="${p.area ? `台北市${p.area}` : '台北市北投區・士林區'}">
<script type="application/ld+json">
${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }, null, 2)}
</script>
${tpl.style.replace('</style>', QUICK_CSS)}
</head>
<body>
${tpl.header}

<main>
  <div class="guide-wrap">
  <article class="post-page">
    <nav class="crumb" aria-label="breadcrumb"><a href="/">首頁</a> › ${p.area ? '<a href="/taipei-physio">台北物理治療師推薦</a> › ' : ''}${esc(p.crumb)}</nav>
    <div class="meta"><span>${UPDATED}</span><span class="cat">${esc(p.metaCat)}</span><span>約 ${minutes} 分鐘</span></div>
    <h1>${esc(p.h1)}</h1>
    <p class="lede">${esc(p.lede)}</p>

    <section class="quick" aria-labelledby="quick">
      <h2 id="quick">快速解答</h2>
      <dl>
${p.quick.map(([q, a]) => `        <dt>${esc(q)}</dt>\n        <dd>${esc(a)}</dd>`).join('\n')}
      </dl>
    </section>

    <div class="post-body">
${p.sections.map(s => `      <h2 id="${s.id}">${s.h}</h2>${s.html}\n`).join('\n')}
      <h2 id="related">${esc(p.relatedTitle)}</h2>
      <ul>
${related.map(a => `        <li><a href="/posts/${a.id}">${esc(a.title)}</a></li>`).join('\n')}
      </ul>

      <h2 id="faq">常見問題</h2>
${p.faqs.map(([q, a]) => `      <div class="faq-item">\n        <h3>${esc(q)}</h3>\n        <p>${esc(a)}</p>\n      </div>`).join('\n')}

      <h2 id="author">關於 Sky</h2>
      <p>我是 <strong>Sky（Sky 物理治療師）</strong>，國家高考合格物理治療師，持有國際認證紅繩 Redcord、高級肌筋膜技術 AMT、動態貼布等證照。工作重心放在<a href="/triathlon-physio">三鐵運動修復</a>與耐力運動的身體，擅長肌筋膜疼痛治療、紅繩運動治療、顱薦椎治療，自己也是公路車競技車手。更多經歷請看<a href="/about">關於 Sky</a>，網站上也有超過 250 篇免費<a href="/blog">衛教文章</a>。</p>

      <p><strong>其他看診區域與專長：</strong></p>
      <div class="areas">
        <a href="/taipei-physio">台北物理治療師推薦</a>
${others.map(o => `        <a href="/${o.slug}">${esc(o.crumb.replace('推薦', ''))}</a>`).join('\n')}
      </div>

      <div class="cta-box">
        <div>
          <div class="t">${esc(p.cta[0])}</div>
          <div class="s">${esc(p.cta[1])}</div>
        </div>
        <a class="btn sky" href="${BOOK}" target="_blank" rel="noopener">${CAL_SVG(14)}預約評估</a>
      </div>
    </div>
    <p class="post-foot">本頁為服務說明與衛教分享，內容無法取代醫療診斷與個別化評估。若有發燒合併劇痛、大小便失禁、不明原因體重下降、麻木無力越來越嚴重等警訊，請先就醫檢查。</p>
  </article>
  <nav class="guide-toc" aria-label="本頁目錄">
    <div class="toc-label">本頁目錄</div>
    <ol>
${toc.map(([id, t]) => `        <li><a href="#g-${id}">${esc(t)}</a></li>`).join('\n')}
    </ol>
    <a class="btn sky sm" href="${BOOK}" target="_blank" rel="noopener">預約評估</a>
  </nav>
  </div>
</main>

${tpl.footer}
${tpl.script}
</body>
</html>
`.replace(/ id="(quick|what|injuries|how|when|where|who|hotspring|tips|elderly|related|faq|author)"/g, ' id="g-$1"')
   .replace('aria-labelledby="quick"', 'aria-labelledby="g-quick"');
}

export function genLanding() {
  syncChrome();
  const articles = JSON.parse(readFileSync(join(REPO, 'data/articles.json'), 'utf8'));
  const tpl = shell();
  for (const p of LANDING_PAGES) {
    writeFileSync(join(REPO, `${p.slug}.html`), render(p, articles, tpl));
    console.log(`已產生 ${p.slug}.html`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) genLanding();
