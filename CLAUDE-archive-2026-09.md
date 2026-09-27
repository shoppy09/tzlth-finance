# CLAUDE.md 修改記錄全文封存（2026-09）

> RCF-175 雙層制（總部 CLAUDE.md 規則）：主檔 `CLAUDE.md`「最近修改記錄」只放 ≤300 字元摘要列，完整敘事在此。newest-first。
> 2026-09-28 首建（總部收尾檢查 `check_claude_record_bloat` 系統 repo 守門提示）。

| 日期 | 修改內容 | 狀態 |
|------|---------|------|
| 2026-09-28 | 【DEV/FIN】**三項（HQ tasks L905／L178／L586；HQ RCF-206；commit `f0c6785`）**：① **income 選填 `platform` 欄**（direct／vocus／portaly／buymeacoffee／other，舊筆視同 direct）。查照第二輪撈出 `app/api/income/route.ts` POST 為**逐欄白名單建構**交易物件，只改型別與表單會被靜默丟掉 ⇒ 實改 4 檔：`lib/github.ts` 型別、POST 白名單、`app/income/page.tsx` 下拉＋列表顯示非 direct 者、`app/api/export/route.ts` CSV 多一欄「成交平台」。② **首頁「⚠️ 本月尚未入帳的月費訂閱」**：月費自動扣款的訂閱 `renewal_date=null`，原「30 天內到期」警示結構上永遠不觸發（HQ L119 漏記 Claude Code 月費 2 個月的成因）。條件＝active＋monthly＋cost>0，且本月 expense 無 description 含訂閱名稱者，且今日 ≥ 該訂閱上次入帳的日（避免每月 1-3 日對 4 日扣款誤報）；本年檢視不顯示。以實際 ledger 模擬：09-28／10-02 不亮、10-04 未入帳即亮、補登後消失。③ **公開 `/api/version`** 回 `{commit 7 碼, node 大版本, region}`，`middleware.ts` 以**精確路徑**放行（`/api/version/x` 實測 401、`/api/income` 401、`/` 307）；部署後自報 `f0c6785`。本 repo 為 public，commit 本就可查。④ 本檔路由表 15→16 handler，`/api/expense` 註明改金額＝刪掉重建（Tim 裁決不補 PATCH）。附帶觀察：build 有既存 Turbopack 警告（middleware 載入 `lib/auth.ts` 的 Node `crypto`，2026-05-14 起即存在）| ✅ |
