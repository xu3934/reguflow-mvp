# Rxplain

Rxplain is an AI-native regulatory retrieval prototype for Taiwan pharma and biomedical product workflows. It helps BD, PM, RA, QA, and logistics users turn a product-introduction scenario into a grounded regulatory report, role-specific checklist, and process-flow cards.

Live demo:

https://reguflow-mvp.onrender.com/?v=20260815v17

API health check:

https://reguflow-mvp.onrender.com/api/health

## What It Does

Rxplain is designed to reduce hallucination risk in regulatory search. Instead of asking an AI model to "remember" applicable laws, the app follows a structured pipeline:

1. Extract legal facts from the user scenario.
2. Match candidate laws from a curated Taiwan regulatory index.
3. Rank laws by product type, user role, law type, and activity.
4. Assess applicability and missing facts.
5. Generate a grounded regulatory report with official source links.
6. Generate role-specific plain-language summaries and checklists.
7. Render a three-stage SaaS-style regulatory process map.

## User Guide

Open the live demo:

https://reguflow-mvp.onrender.com/?v=20260815v17

Then fill in:

- Scenario: e.g. "我是代理商 BD，要引入細胞製劑，請告訴我相關的查驗與物流規範"
- Target market: Taiwan
- Product type: prescription drug, OTC drug, general drug, or cell therapy product
- Role: R&D pharma company, CDMO, API manufacturer, import agent, or logistics provider
- Law type: GDP, GMP, registration review, supply source and flow tracking

Click:

```text
開始法規檢索與生成報告
```

The output includes:

- Regulatory applicability report
- Official source links and PCode references
- Role-specific plain-language summary
- Checklist
- Candidate-law ranking
- Three-stage regulatory and supply-chain flow cards
- Traceability table

## API Status

The app supports OpenAI API mode and local fallback mode.

Check:

```text
/api/health
```

Example successful response:

```json
{
  "apiConfigured": true,
  "model": "gpt-5.6-luna",
  "models": {
    "applicability": "gpt-5.6-luna",
    "summary": "gpt-5.6-sol",
    "flowchart": "gpt-5.6-luna",
    "answers": "gpt-5.6-luna",
    "competitors": "gpt-5.6-luna"
  },
  "mode": "pipeline_ready"
}
```

Modes:

- `pipeline_ready`: the server has an OpenAI API key and will call OpenAI.
- `local_fallback`: no API key is configured; the app uses deterministic local logic.
- `ai_failed_fallback`: an API key exists, but the AI call failed and the app returned a safe local fallback.

## For Developers

Clone the project:

```powershell
git clone https://github.com/xu3934/reguflow-mvp.git
cd reguflow-mvp
```

Create a local environment file:

```powershell
copy .env.example .env
```

Edit `.env`:

```text
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-5.6-luna
OPENAI_FAST_MODEL=gpt-5.6-luna
OPENAI_SUMMARY_MODEL=gpt-5.6-sol
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_REASONING_EFFORT=none
PORT=3000
```

Start the app:

```powershell
npm start
```

Open:

```text
http://localhost:3000
```

Run syntax checks:

```powershell
npm run check
```

## Project Structure

```text
reguflow-mvp/
  index.html      Frontend layout
  styles.css      B2B SaaS UI styling
  app.js          Browser-side interaction and fallback analysis
  server.js       Node.js server, API routes, OpenAI integration
  render.yaml     Render deployment config
  .env.example    Local environment variable template
  package.json    Scripts and project metadata
```

## API

### Health

```text
GET /api/health
```

Returns whether OpenAI API mode is configured.

### Analyze

```text
POST /api/v1/analyze
```

Request body:

```json
{
  "user_intent": "我是代理商 BD，要引入細胞製劑...",
  "market": "台灣",
  "product_type": "cell_therapy",
  "role": "進口代理商",
  "law_type": ["運輸 GDP", "生產 GMP", "查驗登記"]
}
```

Response includes:

```text
applicable_laws
summary_and_checklist
process_stages
traceability
```

## Deployment

This project is deployed on Render as a Node.js web service.

Render settings:

```text
Build command: npm install
Start command: npm start
```

Environment variables:

```text
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-5.6-luna
OPENAI_FAST_MODEL=gpt-5.6-luna
OPENAI_SUMMARY_MODEL=gpt-5.6-sol
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_REASONING_EFFORT=none
```

Do not commit `.env` or real API keys. The repository intentionally tracks `.env.example` only.

## Notes And Limitations

- This is a hackathon MVP, not legal advice.
- The current regulatory index is curated and intentionally small.
- Official law links are shown for traceability, but production use should add real-time crawling from `law.moj.gov.tw`.
- Luna 用於適用性與缺漏事實判斷、直接問答、健保競品查詢詞與精簡流程圖；Sol 僅用於摘要與待辦清單。競品品項與價格仍取自健保署資料快照，不由 AI 生成。
- All outputs should be reviewed by RA or legal professionals before business use.
