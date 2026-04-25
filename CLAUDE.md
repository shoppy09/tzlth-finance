# 財務系統（SYS-09）CLAUDE.md

## 系統概覽
- **系統名稱**：財務系統
- **短代號**：財務
- **Vercel URL**：https://tzlth-finance.vercel.app
- **自定網域**：https://finance.careerssl.com（Cloudflare CNAME 待設定）
- **GitHub repo**：shoppy09/tzlth-finance
- **本地路徑**：C:\Users\USER\Desktop\CLAUDE寫工具\tzlth-finance
- **資料位置**：shoppy09/tzlth-hq / finance/ledger/
- **決策記錄**：RCF-011

## 技術棧
- **框架**：Next.js 16 App Router
- **部署**：Vercel（手動 npx vercel --prod，GitHub 自動部署停用）
- **資料庫**：GitHub-as-database（tzlth-hq repo，GitHub API 讀寫 JSON）
- **認證**：PIN-based httpOnly cookie（7 天，verifyToken BASE64 驗證）
- **UI**：Tailwind CSS（gray-950 深色主題）

## 環境變數（Vercel 必填）
| 變數名 | 說明 |
|--------|------|
| `GITHUB_TOKEN` | GitHub PAT，同 hq-dashboard 使用的 token |
| `ACCESS_PIN` | Tim 自定登入密碼（4-8 位），不對外公開 |
| `DATA_REPO` | `shoppy09/tzlth-hq`（資料存放 repo） |

## 資料結構
```
tzlth-hq/finance/ledger/
├── income-2026.json    — 收入流水帳（IncomeTransaction[]）
└── expense-2026.json   — 支出流水帳（ExpenseTransaction[]）
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
| 路由 | 說明 | 認證 |
|------|------|------|
| `/` | Dashboard（KPI Cards + 月摘要）| 需要 |
| `/income` | 收入流水帳 CRUD | 需要 |
| `/expense` | 支出流水帳 CRUD | 需要 |
| `/login` | PIN 登入頁 | 公開 |
| `/api/auth/login` | 設定 finance_token cookie | 公開 |
| `/api/income` | GET/POST/DELETE 收入 | 需要 |
| `/api/expense` | GET/POST/DELETE 支出 | 需要 |
| `/api/summary` | GET 月份彙總（供儀表板呼叫）| **公開，無需 auth** |

## 部署流程（不可更改）
```
步驟 1：npm run build        ← 必須通過才繼續
步驟 2：git push             ← 版本控制（不觸發部署）
步驟 3：npx vercel --prod    ← 唯一合法部署方式
```

## 公開 API：/api/summary
HQ 儀表板呼叫此端點取得財務摘要，無需認證：

```
GET /api/summary?month=2026-04
```

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

## 設計決策
1. **每年度獨立 JSON**（income-2026.json / income-2027.json）：避免單檔過大，按年查詢效率佳
2. **Transaction ID 含日期**（INC-20260407-001）：人類可讀，便於追蹤
3. **`/api/summary` 無 auth**：設計為公開 endpoint，讓儀表板可跨域呼叫
4. **PIN auth 不使用 JWT**：無多用戶需求，BASE64 + ACCESS_PIN 驗證已足夠

## Phase 2 計畫
- `app/reports/page.tsx`：月報頁面 + 現金流時間軸
- HQ 儀表板 FinancePanel 整合（呼叫 `/api/summary` 替代 parseFinanceReport）
- RCF-009 整合：顯示預約系統待確認收入

## 最近修改記錄

| 日期 | 修改內容 | 狀態 |
|------|---------|------|
| 2026-04-25 | 系統建立（Phase 1）：lib/github.ts + lib/auth.ts + middleware + API routes + UI pages；Vercel 部署 https://tzlth-finance.vercel.app | ✅ |
