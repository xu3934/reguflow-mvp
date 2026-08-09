# ReguFlow MVP

ReguFlow 是一個醫藥法規自動化檢索系統 MVP。此版本根據 PRD 的核心流程，做成可直接開啟的本地 Web prototype：

- PM / BD 輸入新藥或細胞製劑引入情境
- 系統判斷母法與 PCode
- 追蹤授權子法
- 產出合規缺口、下一步 action plan、官方來源 traceability table
- 產生 Mermaid.js 法規準備流程圖

## 如何執行

直接用瀏覽器開啟：

```text
index.html
```

或用任一靜態伺服器 serving 這個資料夾。

## MVP 設計取捨

PRD 原本設計為 Streamlit + FastAPI + Bedrock + 法務部爬蟲。本 MVP 為 hackathon 一日開發做了三個縮小：

1. 前後端先合併成單頁 Web app，降低整合風險。
2. 法務部爬蟲先用內建法規索引模擬，保留官方 PCode URL。
3. AI pipeline 先用 deterministic analyzer + golden fallback，之後可替換成 LLM structured output。
4. 檢索邏輯改成「法律事實抽取 -> 候選法規排序 -> 適用性判斷 -> traceability」，避免單純讓 AI 模型憑記憶搜尋法條。

## 目前是否需要 AI API

不一定需要。這個版本支援兩種模式：

- 直接開 `index.html`：完全本地 fallback，不會呼叫 OpenAI、Bedrock 或其他付費 API。
- 用 `server.js` 啟動：若設定 `OPENAI_API_KEY`，會呼叫 OpenAI API；若沒有 key 或 API 失敗，會自動回到本地 fallback。

目前的本地函式：

- `extractFacts(scenario, selectedType)`：把使用者情境轉成產品類型、活動、管轄地、風險關鍵字、缺漏事實。
- `retrieveCandidateLaws(facts)`：用產品類型、活動、主題、母子法關係排序候選法規。
- `assessApplicability(facts, candidates)`：判斷 likely / possible / needs more information，並列出缺漏事實。

## 啟動 AI API 模式

PowerShell:

```powershell
node server.js
```

然後開啟：

```text
http://localhost:3000
```

API key 只存在本機後端環境變數，不會出現在前端程式碼。

也可以複製 `.env.example` 成 `.env`，填入自己的 key：

```text
OPENAI_API_KEY=你的 API key
OPENAI_MODEL=gpt-4.1-mini
PORT=3000
```

## 後續接真後端

目前已新增 `server.js` 作為本機後端。後續若要接正式 FastAPI / Bedrock，可把以下兩段替換掉：

- `extractFacts`
- `assessApplicability`
- `buildMermaid`

其中 `retrieveCandidateLaws` 建議保留為 deterministic retrieval，或改成後端 hybrid search，不建議完全交給 LLM。

後端可實作：

```text
POST /analyze
  -> LLM: scenario to structured legal facts
  -> retrieval: keyword + topic + PCode + law hierarchy search
  -> crawler: law.moj.gov.tw by PCode
  -> LLM/reranker: applicability assessment only against retrieved laws
  -> response: grounded report JSON + Mermaid
```

請把 `.env`、AWS credentials、OpenAI API key 或 Bedrock credentials 加入 `.gitignore`。

## 雲端部署給組員使用

最簡單的方式是部署到 Render，因為本專案是 Node.js server，且需要在後端保存 `OPENAI_API_KEY`。

1. 到 Render 建立帳號並連接 GitHub。
2. 選擇 `xu3934/reguflow-mvp` repository。
3. 建立 Web Service。
4. Render 會讀取 `render.yaml`，使用：
   - Build command: `npm install`
   - Start command: `npm start`
5. 在 Render 的 Environment Variables 設定：

```text
OPENAI_API_KEY=你的 OpenAI API key
OPENAI_MODEL=gpt-4.1-mini
```

部署成功後，Render 會給一個公開網址。組員只要打開該網址即可使用，不需要 clone repo，也不需要知道你的 API key。

注意：雲端部署後，所有組員的 API 使用量會算在你設定的 `OPENAI_API_KEY` 上，建議在 OpenAI Billing 設定用量上限。
