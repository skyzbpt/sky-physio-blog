# 衛教文章點閱計數 — Cloudflare Worker 部署說明

前台（文章頁、首頁列表、分類專頁）會呼叫這個 Worker 來累加／讀取每篇文章的瀏覽次數。
資料存在 Cloudflare KV。前台預設呼叫的端點是 **`https://views.skythephysio.com`**。

只需部署一次，約 5 分鐘。以下兩種方式擇一。

---

## 方式 A：Cloudflare Dashboard（不用裝工具，推薦）

1. **建立 KV**：Dashboard → Storage & Databases → KV → **Create namespace**，名稱填 `sky-views`。
2. **建立 Worker**：Workers & Pages → **Create** → Worker → 命名 `sky-views` → Deploy（先用預設範本）。
3. **貼上程式**：進入該 Worker → **Edit code** → 把 `worker.js` 全部內容貼上 → **Deploy**。
4. **綁定 KV**：Worker → Settings → **Bindings** → Add → KV namespace
   - Variable name：`VIEWS`
   - KV namespace：選剛才的 `sky-views` → Save。
5. **設固定網址**：Worker → Settings → **Domains & Routes** → Add → **Custom Domain**
   → 輸入 `views.skythephysio.com` → Add。（Cloudflare 會自動建立並代理這個子網域）
6. 完成。開 `https://views.skythephysio.com/health` 應回傳 `{"ok":true}`。

## 方式 B：Wrangler CLI

```bash
cd cf-worker
npx wrangler kv namespace create VIEWS   # 複製回傳的 id
# 把 id 貼進 wrangler.toml 的 [[kv_namespaces]] id
npx wrangler deploy
# 再到 Dashboard 幫這個 Worker 加 Custom Domain：views.skythephysio.com
```

---

## 若你想用不同網址

前台端點寫在兩個地方，改成你的 Worker 網址即可（例如 workers.dev 子網域）：

- `tools/lib.mjs` 的 `VIEWS_API`
- `index.html` 內的 `VIEWS_API`

改完在專案根目錄跑 `npm run build` 重新產生文章頁，即可套用。

## 說明

- 端點：`POST /hit {slug}` 累加、`GET /get?slugs=a,b,c` 批次讀取、`GET /health` 健康檢查。
- 同一瀏覽器同一次工作階段（session）對同一篇只累加一次，避免重新整理灌數。
- CORS 僅允許 `https://skythephysio.com`（可在 `worker.js` 的 `ALLOW_ORIGINS` 增列）。
- KV 免費額度：每日 10 萬次讀取、1 千次寫入，對一般衛教網站綽綽有餘。
- Worker 未部署前，前台會靜默略過（不顯示數字、也不影響頁面）。
