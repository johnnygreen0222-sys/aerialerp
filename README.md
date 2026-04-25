# AerialERP — 台灣高空設備整合管理系統

> **Taiwan Aerial Equipment Integrated Management Platform**  
> 整合庫存、維修工單、設備履歷與條碼掃描的 PWA 系統

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

## 🚀 線上 Demo

部署於 Render：[https://aerialerp.onrender.com](https://aerialerp.onrender.com)

## 📦 功能模組

| 模組 | 說明 |
|------|------|
| 📊 儀表板 Dashboard | KPI 卡片、工單趨勢圖、低庫存警報 |
| 🏗 設備管理 Assets | 設備身分證、QR Code、保固追蹤、維修時間軸 |
| 📦 零件庫存 Inventory | 多狀態管理、匯率換算、安全庫存預警 |
| 📋 維修工單 Work Orders | 開工單、零件領用、完工簽核、報價單 |
| 📷 掃描中心 Scanner | 相機掃描 QR/條碼、4 種掃描模式 |
| 🏷 品牌型號庫 Brands | JLG/Genie/Skyjack 規格管理 |
| 📈 報表 Reports | 庫存盤點表、維修收入、CSV 匯出 |

## 🏗 技術架構

- **前端**：Vanilla HTML + CSS + JavaScript (無框架)
- **資料庫**：IndexedDB (瀏覽器本地持久化)
- **PWA**：Service Worker + Web App Manifest
- **條碼掃描**：html5-qrcode
- **圖表**：Chart.js 4
- **匯率**：Frankfurter API (即時 USD/JPY → TWD)

## 👥 使用者角色

| 角色 | 權限 |
|------|------|
| 管理者 Administrator | 全部功能 |
| 業務 Sales | 儀表板、設備、庫存、工單、報表 |
| 技師 Technician | 儀表板、設備、工單、掃描 |

## 🖥 本地執行

直接用瀏覽器開啟 `index.html` 即可（需透過 HTTP server，不可直接 file://）：

```bash
npx serve .
# 或
python3 -m http.server 8080
```

## 📱 PWA 安裝

在 Chrome/Edge 手機瀏覽器開啟後，點選「加入主畫面」即可安裝為 App。

---

© 2026 AerialERP — 台灣高空設備代理商整合管理系統
