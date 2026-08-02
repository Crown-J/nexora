<!-- docs/_team/design-references.md -->
# NEXORA 設計參考清單

## 用途

執行長 / Hana / Hank 共同維護的設計靈感庫。
Hank 在做 UI（特別是登入 / 首頁 / dashboard / 動畫元件 / 行銷頁）時讀此檔找借鏡。

⚠️ 此檔只放「靈感來源」、**不是規格**。
- 業務規格仍以 CTO 的 `docs/專案/規格書/*` 為準
- 介面規格仍以 Hana 的 `docs/專案/介面規格/*` 為準
- 此檔解決的是「視覺品味 / 動效 / 排版範式」的對齊問題

## 維護慣例

- 看到喜歡的網站、直接加一條（站名 / URL / 借鏡點）
- 過時或連結失效 → 移除或標 ⚠️
- 同一站只記一次、追加觀察補在同條目下方
- 連結放公開頁、不放需登入的 dashboard 截圖
- 條目盡量寫「我們可借鏡什麼」、不只「這站很美」

---

## 🎬 動畫 / 互動敘事（Awwwards 級別）

> 用於：登入頁 hero / 鋼鐵星球 / 行銷頁 scroll story

| 站名 | URL | 借鏡點 |
|---|---|---|
| Awwwards SOTD | https://www.awwwards.com/websites/ | 每日獲獎站、靈感主源 |
| Codrops | https://tympanus.net/codrops/ | 動畫教學 + 開源 demo（含 GSAP 範例）|
| GSAP Showcase | https://gsap.com/showcase/ | GSAP 官方案例庫、ScrollTrigger / SplitText 範式 |
| Lusion | https://lusion.co/ | 互動敘事頂尖、3D + 滾動 |
| Apple 產品頁 | https://www.apple.com/iphone/ | scroll-trigger 範式範本 |

## 📊 SaaS Dashboard（密度 + 留白）

> 用於：NEXORA 各模組工作站、儀表板、列表頁

| 站名 | URL | 借鏡點 |
|---|---|---|
| Linear | https://linear.app/method | issue 高密度但不亂、字級 + 欄距控制 |
| Vercel Dashboard | https://vercel.com/home | 卡片 + 漸層 + 暗色範式 |
| Resend | https://resend.com/ | 黑底高對比、文檔 + dashboard 一體 |
| Stripe Dashboard | https://stripe.com/dashboard | 數據視覺化、空狀態 / 引導範式 |
| Notion Calendar | https://www.notion.so/product/calendar | event 排版、hover 反饋細節 |
| Raycast | https://www.raycast.com/ | command palette、快捷鍵第一範式 |

## 🏢 ERP / B2B 表單範式

> 用於：主檔詳細頁、表單密度、列表 + 詳情雙欄

| 站名 | URL | 借鏡點 |
|---|---|---|
| Tremor Blocks | https://blocks.tremor.so/ | React + Tailwind 開源 dashboard block |
| shadcn/ui | https://ui.shadcn.com/ | 高密度表單元件、Form + Table 範式 |
| Tailwind UI | https://tailwindui.com/ | 排版範式（付費、看截圖即可）|
| Untitled UI | https://www.untitledui.com/ | B2B SaaS 元件庫、Figma 主流 |

## 📄 單據 / 表格美學（執行長 2026-08-02 提供）

> 用於：v3.0.0 六支外殼——特別是**檢視殼**（單據全貌）與**清單殼**
> ⚠️ **借視覺、⛔ 不借互動模型**：這批全是滑鼠導向產品，沒有一個能純鍵盤跑完，
> 直接照抄會撞上介面規格 §1「熟手只記快捷鍵」與 §7「拔掉滑鼠做得完」

| 站名 | URL | 真正的手法（⛔ 不只是「很美」）| 對應哪支殼 |
|---|---|---|---|
| Stripe Invoicing | https://stripe.com/ | 結論放最上面（金額、狀態一眼看到），字級 / 灰階對比 / 明細間距的黃金比例 | 檢視殼 |
| AWS Billing · GCP 帳務 | https://aws.amazon.com/ | 成千上萬筆扣款明細：多層級表頭 ＋ **側邊抽屜**維持整潔，⛔ 不另開頁 | 檢視殼 |
| Shopify 訂單詳情 | https://www.shopify.com/ | **左主體右附屬並排不分頁**：商品明細 / 顧客 / 物流 / 付款同屏卻條理分明 | 檢視殼 |
| Linear | https://linear.app/ | **點擊即編輯**——⛔ 沒有「編輯模式」這個概念 ⚠️ 只可用於主檔與草稿，**過帳後單據不適用**（無稽核軌跡） | 清單殼 |
| Notion Table View | https://www.notion.so/ | 輸入框 / 下拉選單融進表格 cell，同上⚠️ | 清單殼 |
| Ant Design Table | https://ant.design/components/table | 複雜單據情境的編排規格：可摺疊 / 固定欄位 / 多級表頭 | 清單殼 |
| Refactoring UI | https://www.refactoringui.com/ | ⭐ 手法不是版型：**用間距與字重做層次、⛔ 不用線框**。六支殼通用 | 全部 |
| Formspree Library | https://formspree.io/library/ | 表單排版結構與間距靈感庫 | 開單殼 |
| Page Flows | https://pageflows.com/ | 錄製 Stripe / Airbnb / Notion 真實操作流——看**流程編排**不只看畫面 | 開單殼 |
| Mobbin | https://mobbin.com/ | 截圖庫，搜 Onboarding / Sign Up 研究表單美學 | 開單殼 |

## ✨ 動畫工具庫

| 工具 | URL | 用途 / 何時用 |
|---|---|---|
| **GSAP** | https://gsap.com/ | 主動畫引擎、複雜時間軸 / ScrollTrigger / SplitText（已裝 skill） |
| Framer Motion | https://www.framer.com/motion/ | React 元件動畫（簡單場景 / 進場退場）|
| Lottie | https://lottiefiles.com/ | 設計師導出 JSON 動畫、輕量 |
| Auto-Animate | https://auto-animate.formkit.com/ | list 增刪自動補間（一行接管）|

## 🎨 設計系統 / Token

| 系統 | URL | 借鏡點 |
|---|---|---|
| Radix Colors | https://www.radix-ui.com/colors | 暗色 token 取色範式、12 階灰階 |
| Material 3 | https://m3.material.io/ | Spacing / Type scale 系統 |
| Apple HIG | https://developer.apple.com/design/human-interface-guidelines/ | 互動細節、可達性 |
| Geist (Vercel) | https://vercel.com/geist | Vercel 自家設計系統公開規格 |

## 🇹🇼 在地 SaaS 參考（合規 / 中文排版）

| 站名 | URL | 借鏡點 |
|---|---|---|
| Pinkoi | https://www.pinkoi.com/ | 中文排版、字型 hint |
| 91APP | https://www.91app.com/ | 台灣 SaaS UI 中文範式 |
| iCHEF | https://www.ichefpos.com/ | 餐飲 POS、ERP 鄰近領域 |

---

## NEXORA 自家設計範式（給 Hank 對齊用）

> 這段是已拍板規範、不是參考。

### 視覺語彙
- **鋼鐵星球**：home 主畫面、`SharedPlanetRoot` 元件
- **金球 + 金線**：所有 section header、卡片 dot indicator
- **六角紋背景**：`HexBulgeField`、營造金屬感

### 色板（暗色基底）
| 用途 | 色號 |
|---|---|
| 背景 | `#0A0A0C` |
| 卡片 | `#131316` |
| 邊框 | `#2A2A30` |
| 主色（金 / accent）| `#E8A020` |
| 成功（綠 / 確認）| `#22D88F` |
| 警告（橘）| `#E89020` |
| 錯誤（紅）| `#E26060` |
| 主文字 | `#F0F0F3` |
| 次文字 | `#B8B8C0` |
| 弱文字 | `#5A5A60` |

### 排版
- 標題：`tracking-wide` + `font-bold`
- 副標：`text-[10px] font-semibold uppercase tracking-[0.28em] text-[#5A5A60]`
- 內文：`text-sm text-foreground`
- 卡片：`rounded-2xl` 或 `rounded-lg`、`border border-[#2A2A30]`、`p-4 ~ p-5`

### 互動反饋
- focus：金邊 + 1px ring（`focus:border-[#E8A020]/60 focus:ring-1 focus:ring-[#E8A020]/40`）
- hover：底色微亮（`hover:bg-[#22222A]`）
- disabled：`opacity-50`

詳細仍以 Hana 的介面規格 + `apps/nx-ui/src/design/*` 實作為準。
