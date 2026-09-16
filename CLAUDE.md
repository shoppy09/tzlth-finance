# 財務系統（SYS-09）CLAUDE.md

## 系統概覽
- **系統名稱**：財務系統
- **短代號**：財務
- **Vercel URL**：https://tzlth-finance.vercel.app
- **自定網域**：https://finance.careerssl.com（CNAME 已設定 2026-04-30）
- **GitHub repo**：shoppy09/tzlth-finance
- **本地路徑**：C:\Users\USER\Desktop\CLAUDE寫工具\tzlth-finance
- **資料位置**：shoppy09/tzlth-hq / finance/ledger/
- **決策記錄**：RCF-011

## 技術棧
- **框架**：Next.js 16 App Router
- **部署**：Vercel｜🔴 **2026-08-23 dashboard 實查更正：auto-deploy 是「開啟」的**（Deployments 證 git-source 部署存在，`a525904` 純 docs commit 亦自動部署）⇒ **push 即上線**；原記「GitHub 自動部署停用」與實際不符（總部規則零的全域「永久停用」為誤通則，見 RCF-153）
- **資料庫**：GitHub-as-database（tzlth-hq repo，GitHub API 讀寫 JSON）
- **認證**：PIN-based httpOnly cookie（7 天）｜⚠️ **2026-08-31 更正**：原記「verifyToken **BASE64** 驗證」為 stale——`lib/auth.ts` L1 逐字 `[安全修復 2026-05-14] PIN-based auth utilities — HMAC token (replacing insecure Base64)`，現況為 **HMAC-SHA256 ＋ timestamp 過期檢查 ＋ `crypto.timingSafeEqual` 常數時間比較**。⛔ **本 repo 為 public**，一份描述自身認證為 BASE64 的文件對外等同攻擊指引（實際已非如此，但文件本身是誤導）。（tzlth-hq tasks L788 橫向掃描揪出）
- **UI**：Tailwind CSS（gray-950 深色主題）

## 環境變數（Vercel 必填）

> ⚠️ **2026-09-16 由 `grep -rn "process.env.[A-Z_]*" app lib middleware.ts next.config.ts` 重新生成**。
> 原表 3 把，缺 `SUMMARY_API_KEY`（2026-05-14 即已設定，但從未登記）。⛔ 只記變數名與用途，不記值。

| 變數名 | 讀取位置 | 說明 | 未設定的後果 |
|--------|---------|------|------------|
| `ACCESS_PIN` | `lib/auth.ts` ×3 | 登入密碼 ＋ HMAC 簽章金鑰 | 完全無法登入 |
| `GITHUB_TOKEN` | `lib/github.ts:5` | GitHub PAT，同 hq-dashboard 那把 | 所有資料讀寫失敗 |
| `DATA_REPO` | `lib/github.ts:4` | `shoppy09/tzlth-hq`（資料存放 repo）| 有 fallback 預設值，可不設 |
| **`SUMMARY_API_KEY`** | `app/api/summary/route.ts:8` | 守 `/api/summary` 的 Bearer key | 端點永遠 401 ⇒ **HQ 儀表板財務卡空白** |
| `NODE_ENV` | `app/api/auth/login/route.ts:13` | cookie `secure` 旗標 | 平台注入，不需手動設定 |

> 範本見 `.env.example`（2026-09-16 補建，值全空）。

## 資料結構

> ⚠️ **2026-09-16 補全**：原圖只畫了 2 檔，漏 `subscriptions.json`（2026-04-25 即存在）與 A-03 產出的日收檔。

```
tzlth-hq/finance/
├── ledger/
│   ├── income-2026.json        — 收入流水帳（IncomeTransaction[]）
│   ├── expense-2026.json       — 支出流水帳（ExpenseTransaction[]）
│   └── subscriptions.json      — 訂閱與工具（Subscription[]）
├── 2026-MM-daily.json          — 預約系統日收（DailyBookingRecord[]）
│                                 ⚠️ 本 repo 唯讀；寫入者為 tzlth-hq 的
│                                 daily-revenue-sync.yml（週一/三/五）
└── external-revenue.json       — 外部營收，由 HQ 儀表板寫入，本 repo 不讀
```

### IncomeTransaction 欄位
```typescript
{
  id: string             // INC-YYYYMMDD-NNN
  date: string           // YYYY-MM-DD
  amount: number         // NT$
  client_code: string    // C-YYYYMM-NNN
  service_type: string   // S0/S4/S6/企業包案/課程/電子書/其他
  payment_method: string // transfer/cash/other
  status: string         // received/pending
  note: string
  created_at: string     // ISO 8601
}
```

### ExpenseTransaction 欄位
```typescript
{
  id: string                    // EXP-YYYYMMDD-NNN
  date: string                  // YYYY-MM-DD
  amount: number                // NT$
  category: string              // platform/domain/tool/certification/equipment/other
  description: string
  recurring: boolean
  recurring_frequency?: string  // monthly/yearly
  note: string
  created_at: string            // ISO 8601
}
```

## 路由架構

> ⚠️ **2026-09-16 由機器清單重新生成**（`find app -name page.tsx` ＋ `grep -c "^export async function"`）。
> 原表 8 列為人工維護，缺 5 條路由、漏 1 個 method、且 `/api/summary` 認證描述錯誤。

### 頁面（6）
| 路由 | 說明 | 認證 |
|------|------|------|
| `/` | 財務總覽（KPI + 本月/本年切換 + 預約系統日收區塊 + 訂閱到期提醒）| 需要 |
| `/income` | 收入流水帳（新增/刪除/待收⇄已收）| 需要 |
| `/expense` | 支出流水帳（新增/刪除）| 需要 |
| `/reports` | 月報總覽（近 N 月收支長條圖）| 需要 |
| `/subscriptions` | 訂閱與工具資產管理 | 需要 |
| `/login` | PIN 登入頁 | 公開 |

### API（7 檔／**15 handler**）
| 路由 | Method | 說明 | 認證 |
|------|--------|------|------|
| `/api/auth/login` | POST | 驗 PIN → 發 HMAC cookie | 公開 |
| `/api/auth/logout` | POST | 清除 cookie | cookie |
| `/api/income` | GET / POST / **PATCH** / DELETE | 讀 / 新增 / **改狀態（待收⇄已收）** / 刪除 | cookie |
| `/api/expense` | GET / POST / DELETE | 讀 / 新增 / 刪除（⚠️ **無 PATCH**）| cookie |
| `/api/subscriptions` | GET / POST / PATCH / DELETE | 訂閱 CRUD（PATCH 為部分更新）| cookie |
| `/api/export` | GET | CSV 匯出（`?year=&type=income\|expense`，含 UTF-8 BOM）| cookie |
| `/api/summary` | GET | 月份彙總（供儀表板）| **API key（見下）** |

## 部署流程（不可更改）
```
步驟 1：npm run build        ← 必須通過才繼續（⛔ 更不能跳過，見下）
步驟 2：git push             ← **會觸發 auto-deploy 上線**（2026-08-23 實查更正）
步驟 3：npx vercel --prod    ← 加速/備援（非唯一途徑）
```
> ⛔ **`npm run build` 為 HARD STOP**：本 repo 是 Next.js，build 失敗時 Vercel **靜默保留舊版**只寄信通知 ⇒ 不 build 就 push 會以為上線了其實沒有。
> ⚠️ 本機 Vercel 憑證已於 2026-08-15～08-22 間消失（`No existing credentials found`），待 Tim `vercel login`；本 repo 因 auto-deploy 開啟不受影響。

## 機器介面：/api/summary

> 🔴 **2026-09-16 更正**：本節原標題為「公開 API」、原文寫「無需認證」——**與 2026-05-14 起的實碼不符**。
> `app/api/summary/route.ts` L8-14 要求 `Bearer` token 比對 `SUMMARY_API_KEY`，不符回 401；
> `middleware.ts` 註解亦逐字記載「[安全修復 2026-05-14] /api/summary 移出公開路徑，改為 API key 認證」。
> ⛔ **本 repo 為 public** —— 一份把受保護端點描述為公開的文件，對外等同錯誤的攻擊指引。
> （同類第 2 例；第 1 例為 2026-08-31 的 BASE64→HMAC 更正，當次只改了「技術棧」一行、未掃到本節與「設計決策」節。）

**呼叫方式（需 API key）**：
```
GET /api/summary?month=2026-04
Authorization: Bearer <SUMMARY_API_KEY>
```

- **CORS**：`Access-Control-Allow-Origin` 白名單僅 `https://dashboard.careerssl.com`
- **唯一消費者**：HQ 儀表板 server-side proxy（其 Vercel env 為 `FINANCE_SUMMARY_API_KEY`，⛔ **兩把值必須相同**）
- **口徑**：`income_total` ＝ 已收＋待收；**`net` ＝ 已收 − 支出（實收制，不含待收）**
- **`last_updated`** ＝ 呼叫當下時間，**非資料更新時間**

回傳：
```json
{
  "month": "2026-04",
  "income_total": 1350,
  "income_received": 1350,
  "income_pending": 0,
  "expense_total": 3545,
  "net": -2195,
  "transactions": {
    "income_count": 1,
    "expense_count": 2
  },
  "last_updated": "2026-04-25T00:00:00.000Z"
}
```

## 安全設定（`next.config.ts`，2026-05-14 安全修復）

> ⚠️ **2026-09-16 補記**：本節原本完全缺席，但這組設定決定了前端能連什麼、頁面能被誰嵌。
> 2026-09-16 `curl -I` 實證 `X-Frame-Options: DENY` 與 HSTS 已在線上生效。

- `poweredByHeader: false`（隱藏 Next.js 版本）
- `X-Content-Type-Options: nosniff`／`X-Frame-Options: DENY`／`X-XSS-Protection`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy`：camera / microphone / geolocation / payment 全關
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- **CSP**：`default-src 'self'`；**`connect-src 'self' https://api.github.com`**（⛔ 前端只能打 GitHub API，加任何外部 API 呼叫都會被 CSP 擋）；`frame-ancestors 'none'`

## 設計決策
1. **每年度獨立 JSON**（income-2026.json / income-2027.json）：避免單檔過大，按年查詢效率佳
2. **Transaction ID 含日期**（INC-20260407-001）：人類可讀，便於追蹤
3. **`/api/summary` 無 auth**：設計為公開 endpoint，讓儀表板可跨域呼叫
4. **PIN auth 不使用 JWT**：無多用戶需求，**HMAC-SHA256 簽章 token（`timestamp.hmac`）＋ 7 天過期 ＋ `crypto.timingSafeEqual` 常數時間比較**已足夠
   > 🔴 **2026-09-16 更正**：本行原寫「BASE64 + ACCESS_PIN 驗證已足夠」。2026-08-31 那次更正只改了「技術棧」節，
   > 同一份文件下方這句仍留著舊描述 —— **修正的有效範圍等於當次的掃描範圍**（RCF-155）。

## Phase 2 計畫（✅ 已全數完成，2026-07-06 盤點補記）
- `app/reports/page.tsx`：月報頁面 ✅（2026-04-25 v3）
- HQ 儀表板 FinancePanel 整合 ✅（2026-05-24 驗收）
- RCF-009 整合：預約系統每日收入區塊 ✅（2026-04-25 v5）

## ⚠️ 文件分工（2026-07-06 起）
本 repo CLAUDE.md 只記「系統架構＋本 repo 程式碼變更」；**營運層記錄（帳務規則/client_code/月報流程）以 `tzlth-hq/finance/CLAUDE.md` 為 SoT**，系統狀態以 `tzlth-hq/hr/inventory.json` SYS-09 為準——避免雙軌漂移（全系統盤點 G-09-1）。

## 最近修改記錄

| 日期 | 修改內容 | 狀態 |
|------|---------|------|
| 2026-09-16 | 🔴 **文件層全覆蓋修正**（tzlth-hq tasks L51 說明書 pilot 第 2 樣本）：① `/api/summary` 由「公開，無需 auth」更正為 **API key（Bearer）**——本 repo 為 public，該錯誤描述對外等同攻擊指引；② 設計決策 #4 仍寫「BASE64」→ HMAC-SHA256（**2026-08-31 同類修正的漏網句**，同檔不同節）；③ 路由表 8 列 → 機器重生成（6 頁面＋15 handler，補 `/reports` `/subscriptions` `/api/export` `/api/subscriptions` `/api/auth/logout`、補 `/api/income` PATCH）；④ env 3 → **5 把**（補 `SUMMARY_API_KEY`，2026-05-14 即設定卻從未登記）；⑤ 資料結構補 `subscriptions.json` 與日收檔；⑥ 新增安全設定節（原零記載）。⚠️ 零 `.ts` 改動。詳見 tzlth-hq `projects/SYS-09-finance.md` | ✅ |
| 2026-07-06 | 全系統盤點 G-09-1 修正：Phase 2 三項補標 ✅（實際 4-5 月已完成，文件停滯 72 天）＋ CNAME 記載更新＋新增「文件分工」節（營運層指針化到 tzlth-hq，杜絕雙軌）。程式碼近況：Next.js 16.2.6（05-14 CVE 修補）、訂閱功能 subscriptions.json（04-25）| ✅ |
| 2026-04-25 | 系統建立（Phase 1）：lib/github.ts + lib/auth.ts + middleware + API routes + UI pages；Vercel 部署 https://tzlth-finance.vercel.app | ✅ |

## 收尾七件事（每次對話結束前必做）
收尾完整規則詳見**總部 CLAUDE.md →「核心原則零：收尾七件事」**（7 步驟：git push / 最近修改記錄 / tasks.md / inventory.json / daily-log / reflection-log / 品質自查 HARD STOP / 未完成清單 HARD STOP，均對總部檔案執行）。
> 部署特例：本 repo 修改後 build → push（**push 即 auto-deploy 上線**，2026-08-23 實查）→ `npx vercel --prod` 為加速/備援。
