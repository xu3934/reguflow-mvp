const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

loadDotEnv();

const PORT = Number(process.env.PORT || 3000);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

const LAW_INDEX = [
  {
    id: "regen-act",
    pcode: "L0030142",
    level: "母法",
    title: "再生醫療製劑條例",
    url: "https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=L0030142",
    productTypes: ["cell_therapy", "prescription_drug"],
    roles: ["進口代理商", "研發藥廠", "代工藥廠"],
    lawTypes: ["查驗登記", "生產 GMP", "供應來源與流向"],
    activities: ["引入", "輸入", "上市", "治療", "製造", "查驗登記"],
    article: "第5條",
    articleText:
      "再生醫療製劑之販賣業者及製造業者，為藥事法所稱之藥品販賣業者及藥品製造業者；製造業者應配置專任藥師與具細胞學、微生物學或免疫學專門知識之專任人員。",
    plain:
      "如果要在台灣引入或製造細胞、基因等再生醫療製劑，業者身分、藥師監製與專業人員配置都要先確認。",
    checklist: ["確認業者身分與許可", "確認是否需要專任藥師監製", "確認細胞學或免疫學專任人員配置"],
  },
  {
    id: "regen-review",
    pcode: "L0030148",
    level: "授權子法",
    parentId: "regen-act",
    title: "再生醫療製劑查驗登記審查辦法",
    url: "https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=L0030148",
    productTypes: ["cell_therapy", "prescription_drug"],
    roles: ["進口代理商", "研發藥廠"],
    lawTypes: ["查驗登記"],
    activities: ["上市", "查驗登記", "審查"],
    article: "查驗登記資料",
    articleText:
      "申請查驗登記時，應檢附品質、非臨床、臨床與風險管理等資料，以供主管機關審查。",
    plain:
      "上市前不能只說產品有效，還要準備完整的品質、非臨床、臨床和風險管理資料包。",
    checklist: ["整理品質資料", "整理非臨床資料", "整理臨床資料", "建立風險管理摘要"],
  },
  {
    id: "regen-source",
    pcode: "L0030146",
    level: "授權子法",
    parentId: "regen-act",
    title: "再生醫療製劑供應來源及流向資料保存辦法",
    url: "https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=L0030146",
    productTypes: ["cell_therapy"],
    roles: ["進口代理商", "供應鏈物流", "研發藥廠"],
    lawTypes: ["供應來源與流向", "運輸 GDP"],
    activities: ["供應", "物流", "流向", "保存", "追蹤"],
    article: "供應來源與流向資料",
    articleText:
      "再生醫療製劑相關供應來源、流向資料、保存期限與紀錄管理，應足以支援上市後追蹤與稽核。",
    plain:
      "代理商和物流角色要能說清楚產品從哪裡來、送到哪裡、資料保存多久，以及出問題時如何追溯。",
    checklist: ["建立供應來源紀錄", "建立流向紀錄", "確認資料保存期限", "定義召回與追蹤流程"],
  },
  {
    id: "regen-gmp",
    pcode: "L0030147",
    level: "授權子法",
    parentId: "regen-act",
    title: "再生醫療製劑製造及品質管理辦法",
    url: "https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=L0030147",
    productTypes: ["cell_therapy"],
    roles: ["代工藥廠", "研發藥廠", "進口代理商"],
    lawTypes: ["生產 GMP"],
    activities: ["製造", "品質", "批次", "放行", "GMP"],
    article: "製造與品質管理",
    articleText:
      "再生醫療製劑製造場所、品質系統、批次紀錄、放行標準與變更管理應符合主管機關要求。",
    plain:
      "若產品涉及在地製造或委託製造，需要確認工廠、批次紀錄、放行標準和品質系統是否完整。",
    checklist: ["確認製造場所資格", "建立批次紀錄", "確認放行標準", "建立變更管理流程"],
  },
  {
    id: "drug-act",
    pcode: "L0030001",
    level: "母法",
    title: "藥事法",
    url: "https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=L0030001",
    productTypes: ["prescription_drug", "otc_drug", "general_drug", "cell_therapy"],
    roles: ["進口代理商", "研發藥廠", "代工藥廠", "原料藥廠"],
    lawTypes: ["查驗登記", "生產 GMP", "運輸 GDP"],
    activities: ["製造", "輸入", "販賣", "上市", "查驗登記"],
    article: "藥品管理原則",
    articleText:
      "藥品之製造、輸入、販賣與查驗登記應符合主管機關規範；上市前需提出品質、安全性及有效性資料。",
    plain:
      "只要是藥品的製造、輸入或販賣，就要回到藥事法確認業者資格、查驗登記和品質安全有效性要求。",
    checklist: ["確認藥商資格", "確認輸入或製造許可", "盤點品質安全有效性資料"],
  },
  {
    id: "drug-registration",
    pcode: "L0030057",
    level: "授權子法",
    parentId: "drug-act",
    title: "藥品查驗登記審查準則",
    url: "https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=L0030057",
    productTypes: ["prescription_drug", "otc_drug", "general_drug"],
    roles: ["進口代理商", "研發藥廠"],
    lawTypes: ["查驗登記"],
    activities: ["上市", "查驗登記", "審查"],
    article: "送審資料",
    articleText:
      "藥品申請查驗登記應依品項檢附行政、品質、藥理毒理、臨床試驗與標示仿單資料。",
    plain:
      "藥品上市前要把送審資料分門別類準備好，尤其是品質、藥理毒理、臨床和仿單。",
    checklist: ["準備行政資料", "準備品質資料", "準備藥理毒理資料", "準備仿單與標示"],
  },
  {
    id: "gmp",
    pcode: "L0030074",
    level: "授權子法",
    parentId: "drug-act",
    title: "藥物優良製造準則",
    url: "https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=L0030074",
    productTypes: ["prescription_drug", "otc_drug", "general_drug", "cell_therapy"],
    roles: ["代工藥廠", "原料藥廠", "研發藥廠"],
    lawTypes: ["生產 GMP"],
    activities: ["製造", "品質", "GMP", "原料"],
    article: "GMP",
    articleText:
      "藥品製造與品質管理需符合 GMP，涵蓋人員、廠房、設備、文件、製程與品質管制。",
    plain:
      "只要涉及生產或委託製造，就要檢查 GMP：人員、廠房、設備、文件和品質管制都不能缺。",
    checklist: ["確認 GMP 符合性", "檢查廠房與設備", "檢查製程文件", "確認品質管制紀錄"],
  },
  {
    id: "gdp",
    pcode: "TFDA-GDP",
    level: "實務規範",
    title: "藥品優良運銷規範 GDP",
    url: "https://www.fda.gov.tw/",
    productTypes: ["prescription_drug", "otc_drug", "general_drug", "cell_therapy"],
    roles: ["進口代理商", "供應鏈物流"],
    lawTypes: ["運輸 GDP"],
    activities: ["運輸", "物流", "倉儲", "配送", "冷鏈"],
    article: "GDP",
    articleText:
      "藥品運銷應確保儲存、運輸、配送與追溯過程維持品質，包含溫控、紀錄、委外管理與異常處理。",
    plain:
      "代理商和物流團隊要證明運輸過程不破壞品質，尤其是冷鏈、溫度紀錄、委外物流和異常處理。",
    checklist: ["確認倉儲與運輸條件", "建立溫度紀錄", "確認委外物流責任", "建立異常與召回流程"],
  },
];

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (req.method === "GET" && url.pathname === "/api/health") {
      return sendJson(res, 200, {
        apiConfigured: Boolean(OPENAI_API_KEY),
        model: OPENAI_API_KEY ? OPENAI_MODEL : null,
        mode: OPENAI_API_KEY ? "pipeline_ready" : "local_fallback",
        pipeline: "A→Scrape→B→Scrape→C+D",
      });
    }

    if (req.method === "POST" && (url.pathname === "/api/v1/analyze" || url.pathname === "/api/analyze")) {
      const payload = await readJson(req);
      const report = await analyzeWithPipeline(payload);
      return sendJson(res, 200, report);
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      return sendText(res, 405, "Method not allowed");
    }

    const filePath = safeStaticPath(url.pathname);
    if (!filePath) return sendText(res, 404, "Not found");
    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
    if (req.method === "HEAD") return res.end();
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    sendJson(res, 500, { error: "server_error", message: error.message });
  }
});

server.listen(PORT, () => {
  console.log(`ReguFlow MVP running at http://localhost:${PORT}`);
  console.log(OPENAI_API_KEY ? `AI mode enabled with ${OPENAI_MODEL}` : "AI mode disabled. Using local fallback.");
});

// ---------------------------------------------------------------------------
// Pipeline orchestrator
// ---------------------------------------------------------------------------

async function analyzeWithPipeline(payload) {
  // Step 1: always compute local data first (used as fallback at every stage)
  const facts = extractFacts(payload);
  const candidates = retrieveCandidateLaws(facts);
  const assessments = assessApplicability(facts, candidates).slice(0, 6);
  const localReport = buildLocalReport(facts, candidates, assessments);

  if (!OPENAI_API_KEY) return localReport;

  try {
    // Step 3a: Prompt A — identify mother law PCode
    let pcode;
    let motherLawName;
    try {
      const promptAResult = await runPromptA(payload);
      pcode = promptAResult.pcode;
      motherLawName = promptAResult.law_name || "";
    } catch (err) {
      // Fallback to top assessment law
      const topAssessment = assessments[0];
      if (!topAssessment) throw new Error("No candidate laws found and Prompt A failed: " + err.message);
      pcode = topAssessment.law.pcode;
      motherLawName = topAssessment.law.title;
    }

    // Step 3b: Fetch mother law text
    const motherLawText = await fetchLawText(pcode);

    // Step 3c: Prompt B — extract sub-law authorization phrases
    let subLawRefs = [];
    try {
      subLawRefs = await runPromptB(motherLawText, motherLawName || pcode);
    } catch {
      subLawRefs = [];
    }

    // Step 3d: For each sub-law tag (max 3), find PCode and fetch text — run in parallel
    const subLawTags = subLawRefs.slice(0, 3).map((ref) => ref.search_tag).filter(Boolean);
    const subLawResults = await Promise.allSettled(
      subLawTags.map(async (tag) => {
        const subPcode = await findPcodeByName(tag);
        if (!subPcode) return null;
        const text = await fetchLawText(subPcode);
        return { tag, pcode: subPcode, text };
      })
    );
    const subLawTexts = subLawResults
      .filter((r) => r.status === "fulfilled" && r.value && r.value.text)
      .map((r) => r.value);

    // Step 3e: Build combined law text string (cap at 20000 chars)
    let allLawTexts = `【母法: ${motherLawName || pcode}】\n${motherLawText}`;
    for (const sub of subLawTexts) {
      allLawTexts += `\n\n【子法: ${sub.tag} (${sub.pcode})】\n${sub.text}`;
    }
    if (allLawTexts.length > 20000) allLawTexts = allLawTexts.slice(0, 20000);

    const role = facts.role;
    const scenario = facts.rawScenario;

    // Step 3f: Run Prompt C and Prompt D in parallel
    const [resultC, resultD] = await Promise.allSettled([
      runPromptC(allLawTexts, role, scenario),
      runPromptD(allLawTexts, role, scenario),
    ]);

    const promptCData = resultC.status === "fulfilled" ? resultC.value : null;
    const promptDData = resultD.status === "fulfilled" ? resultD.value : null;

    // Step 3g: Merge AI results with local fallbacks
    const applicable_laws =
      promptCData && Array.isArray(promptCData.applicable_laws) && promptCData.applicable_laws.length > 0
        ? promptCData.applicable_laws
        : localReport.applicable_laws;

    const summary_and_checklist = normalizeSummary(
      promptCData
        ? {
            role: promptCData.role || role,
            summary_points: promptCData.summary_points,
            checklist: promptCData.checklist,
            missing_facts: promptCData.missing_facts,
          }
        : null,
      localReport.summary_and_checklist
    );

    const process_stages = normalizeStages(
      Array.isArray(promptDData) && promptDData.length > 0 ? promptDData : null,
      localReport.process_stages
    );

    return {
      mode: "pipeline",
      model: OPENAI_MODEL,
      analyzedAt: new Date().toISOString(),
      facts,
      candidates: candidates.slice(0, 7),
      assessments,
      confidence: calculateOverallConfidence(assessments),
      applicable_laws,
      summary_and_checklist,
      process_stages,
      traceability: buildTraceability(assessments),
    };
  } catch (err) {
    return { ...localReport, mode: "ai_failed_fallback", aiError: err.message };
  }
}

// ---------------------------------------------------------------------------
// Prompt A — identify mother law PCode from user intent + role + law_type
// ---------------------------------------------------------------------------

async function runPromptA(payload) {
  const motherLaws = LAW_INDEX.filter((l) => l.level === "母法");
  const lawListText = motherLaws
    .map((l) => `- ${l.title} (PCode: ${l.pcode})`)
    .join("\n");

  const userIntent = payload.user_intent || payload.scenario || "";
  const role = payload.role || "進口代理商";
  const lawType = Array.isArray(payload.law_type) ? payload.law_type.join("、") : (payload.law_type || "查驗登記");

  const input = `請分析使用者的情境：'${userIntent}'，並參考其角色定位 '${role}' 與法規類型 '${lawType}'，判斷其對應的台灣生醫法規 PCode。請嚴格以 JSON 格式輸出：{"pcode": "法規代碼", "law_name": "母法名稱"}。

以下為已知母法清單供參考：
${lawListText}`;

  const text = await callOpenAI({
    instructions:
      "你是台灣生醫法規專家。請根據使用者情境判斷最相關的母法 PCode，只輸出 JSON，不要有其他說明。",
    input,
  });

  const result = parseJsonObject(text);
  if (!result.pcode || result.pcode.trim() === "") {
    throw new Error("Prompt A returned empty pcode");
  }
  return result;
}

// ---------------------------------------------------------------------------
// Prompt B — extract sub-law authorization phrases from mother law text
// ---------------------------------------------------------------------------

async function runPromptB(motherLawText, lawName) {
  const input = `以下是母法「${lawName}」的全文：

${motherLawText}

請找出其中授權訂定子法的條文，例如含有「由中央主管機關定之」、「另以辦法定之」、「依法訂定」等授權語句的條文，並以 JSON 陣列格式輸出，每筆包含：
- source_law: 母法名稱
- article: 條文編號
- search_tag: 被授權子法的可能名稱或關鍵字（用於搜尋）

只輸出 JSON 陣列，不要有其他說明。`;

  const text = await callOpenAI({
    instructions:
      "你是台灣法規文本分析專家。請從母法條文中識別授權子法的條款，嚴格以 JSON 陣列格式輸出，不要有任何其他說明。",
    input,
  });

  const result = parseJsonSafe(text);
  if (!Array.isArray(result)) return [];
  return result.slice(0, 4);
}

// ---------------------------------------------------------------------------
// Prompt C — applicable laws + summary + checklist + missing facts
// ---------------------------------------------------------------------------

async function runPromptC(allLawTexts, role, scenario) {
  const input = `以下是使用者實際描述的情境與需求：
${scenario || "（使用者未提供詳細描述）"}

以下是與本案相關的法規全文：

${allLawTexts}

請根據以上法規內容，並緊扣使用者描述的實際情境與需求，針對角色「${role}」，輸出以下 JSON 格式的分析結果：
{
  "applicable_laws": [
    {
      "law_name": "法規名稱",
      "pcode": "法規代碼",
      "article": "相關條文",
      "article_text": "條文內容摘要",
      "applicability": "likely_applicable | potentially_applicable | needs_more_information"
    }
  ],
  "summary_points": ["重點摘要1", "重點摘要2"],
  "checklist": ["查核項目1", "查核項目2"],
  "missing_facts": ["尚缺資訊1", "尚缺資訊2"]
}

只輸出 JSON，不要有其他說明。`;

  const text = await callOpenAI({
    instructions:
      "你是台灣生醫法規顧問，專為 BD、PM、RA、QA 及物流人員撰寫法規摘要。只根據提供的法規內容作答，不得虛構法條或引用，但摘要與 Checklist 必須針對使用者描述的具體情境客製化，不要只是複述通用法規概要。只輸出 JSON。",
    input,
  });

  return parseJsonObject(text);
}

// ---------------------------------------------------------------------------
// Prompt D — process stages (exactly 3 stages)
// ---------------------------------------------------------------------------

async function runPromptD(allLawTexts, role, scenario) {
  const input = `以下是使用者實際描述的情境與需求：
${scenario || "（使用者未提供詳細描述）"}

以下是與本案相關的法規全文：

${allLawTexts}

請根據以上法規內容，並緊扣使用者描述的實際情境與需求，針對角色「${role}」，輸出恰好 3 個作業階段的 JSON 陣列，每個階段包含：
- stage_title: 階段名稱（例如「【源頭管理】供應來源確認」）
- law_name: 該階段依據的主要法規名稱
- control_points: 該階段的查核重點（字串陣列）
- owner: 負責單位或角色

只輸出 JSON 陣列，不要有其他說明。`;

  const text = await callOpenAI({
    instructions:
      "你是台灣生醫法規顧問。請根據提供的法規內容規劃 3 個作業階段，嚴格以 JSON 陣列格式輸出，不要有任何其他說明。",
    input,
  });

  const result = parseJsonSafe(text);
  if (!Array.isArray(result)) return null;
  return result;
}

// ---------------------------------------------------------------------------
// Web scraper helpers
// ---------------------------------------------------------------------------

async function httpGet(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8",
      },
      redirect: "follow",
    });
    if (!response.ok) throw new Error(`HTTP ${response.status} from ${url}`);
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

function parseLawHtml(html) {
  // Remove script and style blocks
  let text = html.replace(/<script[\s\S]*?<\/script>/gi, "");
  text = text.replace(/<style[\s\S]*?<\/style>/gi, "");
  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, " ");
  // Decode HTML entities
  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
  // Collapse whitespace into newlines
  text = text.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  // Filter lines to only those with 3+ chars
  const lines = text.split("\n").filter((line) => line.trim().length >= 3);
  const result = lines.join("\n");
  return result.slice(0, 10000);
}

async function fetchLawText(pcode) {
  try {
    const url = findSourceUrl(pcode);
    const html = await httpGet(url);
    return parseLawHtml(html);
  } catch {
    // Fallback to static index
    const entry = LAW_INDEX.find((l) => l.pcode === pcode);
    if (entry) {
      return `【${entry.title}】\n${entry.article}: ${entry.articleText}`;
    }
    return "";
  }
}

async function findPcodeByName(lawName) {
  if (!lawName || !lawName.trim()) return null;
  const trimmed = lawName.trim();

  // Check static LAW_INDEX first
  const found = LAW_INDEX.find(
    (l) => l.title.includes(trimmed) || trimmed.includes(l.title)
  );
  if (found) return found.pcode;

  // Try search endpoint
  try {
    const searchUrl = `https://law.moj.gov.tw/Law/LawSearchResult.aspx?p=NI&t=E1&k=${encodeURIComponent(trimmed)}`;
    const html = await httpGet(searchUrl);
    const match = html.match(/pcode=([A-Z][0-9A-Z]{7})/i);
    if (match) return match[1];
  } catch {
    // Search failed, return null
  }
  return null;
}

// ---------------------------------------------------------------------------
// New helper functions
// ---------------------------------------------------------------------------

function findSourceUrl(pcode) {
  const entry = LAW_INDEX.find((l) => l.pcode === pcode);
  if (entry) return entry.url;
  return `https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=${pcode}`;
}

function parseJsonSafe(text) {
  try {
    const trimmed = text.trim();
    try {
      return JSON.parse(trimmed);
    } catch {
      const objMatch = trimmed.match(/\{[\s\S]*\}/);
      const arrMatch = trimmed.match(/\[[\s\S]*\]/);
      if (arrMatch) return JSON.parse(arrMatch[0]);
      if (objMatch) return JSON.parse(objMatch[0]);
      return null;
    }
  } catch {
    return null;
  }
}

function buildLocalReport(facts, candidates, assessments) {
  return {
    mode: "local_fallback",
    model: null,
    analyzedAt: new Date().toISOString(),
    facts,
    candidates: candidates.slice(0, 7),
    assessments,
    confidence: calculateOverallConfidence(assessments),
    applicable_laws: buildApplicableLaws(assessments),
    summary_and_checklist: buildSummaryChecklist(facts, assessments),
    process_stages: buildProcessStages(facts, assessments),
    traceability: buildTraceability(assessments),
  };
}

// ---------------------------------------------------------------------------
// OpenAI caller
// ---------------------------------------------------------------------------

async function callOpenAI({ instructions, input }) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: OPENAI_MODEL, instructions, input, temperature: 0 }),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.error?.message || `OpenAI request failed: ${response.status}`);
  return extractOutputText(json);
}

// ---------------------------------------------------------------------------
// Local analysis functions
// ---------------------------------------------------------------------------

function extractFacts(payload) {
  const text = `${payload.user_intent || payload.scenario || ""}`.toLowerCase();
  const selectedType = payload.product_type || payload.selectedType || "auto";
  const productType =
    selectedType !== "auto"
      ? selectedType
      : matchAny(text, ["細胞", "再生醫療", "基因", "cell"])
        ? "cell_therapy"
        : matchAny(text, ["指示藥", "otc"])
          ? "otc_drug"
          : matchAny(text, ["成藥"])
            ? "general_drug"
            : "prescription_drug";

  const activities = [];
  addIf(activities, "引入", matchAny(text, ["引入", "輸入", "進口", "代理"]));
  addIf(activities, "上市", matchAny(text, ["上市", "販售", "銷售", "藥證"]));
  addIf(activities, "查驗登記", matchAny(text, ["查驗", "登記", "審查", "送審"]));
  addIf(activities, "製造", matchAny(text, ["製造", "生產", "代工", "gmp"]));
  addIf(activities, "物流", matchAny(text, ["物流", "運輸", "配送", "倉儲", "gdp", "冷鏈"]));
  addIf(activities, "供應來源與流向", matchAny(text, ["來源", "流向", "保存", "追蹤"]));
  if (activities.length === 0) activities.push("引入", "上市", "查驗登記");

  const missingFacts = [];
  if (productType === "cell_therapy" && !matchAny(text, ["自體", "異體"])) {
    missingFacts.push("尚未說明細胞來源為自體或異體");
  }
  if (!matchAny(text, ["品質", "非臨床", "臨床", "gmp", "cmc"])) {
    missingFacts.push("尚未提供品質、非臨床或臨床資料狀態");
  }
  if ((payload.law_type || []).includes("運輸 GDP") && !matchAny(text, ["冷鏈", "溫度", "倉儲", "物流"])) {
    missingFacts.push("尚未說明倉儲、溫控、配送或委外物流條件");
  }

  return {
    jurisdiction: payload.market || "台灣",
    productType,
    productTypeLabel: translateProductType(productType),
    role: payload.role || "進口代理商",
    lawTypes: payload.law_type || ["查驗登記"],
    activities,
    missingFacts,
    rawScenario: payload.user_intent || payload.scenario || "",
  };
}

function retrieveCandidateLaws(facts) {
  return LAW_INDEX.map((law) => {
    let score = 0;
    const reasons = [];
    if (law.productTypes.includes(facts.productType)) {
      score += 24;
      reasons.push("產品類型符合");
    }
    if (law.roles.includes(facts.role)) {
      score += 14;
      reasons.push("角色定位符合");
    }
    const lawTypeMatches = facts.lawTypes.filter((type) => law.lawTypes.includes(type));
    if (lawTypeMatches.length) {
      score += lawTypeMatches.length * 10;
      reasons.push(`法規類型符合: ${lawTypeMatches.join("、")}`);
    }
    const activityMatches = facts.activities.filter((activity) => law.activities.includes(activity));
    if (activityMatches.length) {
      score += activityMatches.length * 7;
      reasons.push(`情境活動符合: ${activityMatches.join("、")}`);
    }
    if (law.level === "母法") {
      score += 5;
      reasons.push("母法優先");
    }
    if (law.parentId) {
      score += 4;
      reasons.push("母子法關係符合");
    }
    return { law, score, reasons };
  })
    .filter((item) => item.score >= 18)
    .sort((a, b) => b.score - a.score);
}

function assessApplicability(facts, candidates) {
  return candidates.map((candidate) => {
    const missingFacts = [];
    let applicability = "potentially_applicable";
    if (candidate.score >= 52) applicability = "likely_applicable";
    if (candidate.score < 30) applicability = "needs_more_information";

    if (candidate.law.lawTypes.includes("查驗登記") && !facts.activities.includes("查驗登記")) {
      missingFacts.push("需確認是否已進入查驗登記或上市申請階段");
    }
    if (candidate.law.lawTypes.includes("生產 GMP") && !facts.activities.includes("製造")) {
      missingFacts.push("需確認是否涉及在地製造、委託製造或批次放行");
    }
    if (candidate.law.lawTypes.includes("運輸 GDP") && !facts.activities.includes("物流")) {
      missingFacts.push("需確認倉儲、運輸、冷鏈與委外物流安排");
    }

    return {
      ...candidate,
      applicability,
      confidence: Math.min(0.95, Math.max(0.45, candidate.score / 82)),
      missingFacts,
      conclusion: `${translateApplicability(applicability)}: ${candidate.law.title} (${candidate.law.pcode}) 應納入 ${facts.role} 的法規盤點。`,
    };
  });
}

function buildApplicableLaws(assessments) {
  return assessments.slice(0, 5).map((item) => ({
    law_name: item.law.title,
    pcode: item.law.pcode,
    source_url: item.law.url,
    article: item.law.article,
    article_text: item.law.articleText,
    applicability: item.applicability,
    score: item.score,
  }));
}

function buildSummaryChecklist(facts, assessments) {
  return {
    role: facts.role,
    summary_points: assessments.slice(0, 4).map((item) => item.law.plain),
    checklist: Array.from(new Set(assessments.flatMap((item) => item.law.checklist))).slice(0, 10),
    missing_facts: facts.missingFacts,
  };
}

function buildProcessStages(facts, assessments) {
  const sourceLaw = assessments.find((item) => item.law.id.includes("source"))?.law;
  const gmpLaw = assessments.find((item) => item.law.id.includes("gmp"))?.law;
  const reviewLaw = assessments.find((item) => item.law.id.includes("review") || item.law.id.includes("registration"))?.law;
  return [
    {
      stage_title: "【源頭管理】供應來源與資格確認",
      law_name: sourceLaw?.title || "再生醫療製劑供應來源及流向資料保存辦法",
      control_points: ["供應來源確認", "來源與流向紀錄", "追溯與召回準備"],
      owner: facts.role === "供應鏈物流" ? "供應鏈 / 物流" : "進口代理商與 RA",
    },
    {
      stage_title: "【廠內製造】GMP 與品質管理",
      law_name: gmpLaw?.title || "藥物優良製造準則",
      control_points: ["製造場所資格", "批次紀錄", "放行標準", "品質系統"],
      owner: facts.role.includes("藥廠") ? facts.role : "製造商 / 代工藥廠",
    },
    {
      stage_title: "【上市審查】查驗登記與運銷",
      law_name: reviewLaw?.title || "藥品查驗登記審查準則",
      control_points: ["品質資料", "非臨床與臨床資料", "GDP 運輸與配送", "官方來源留存"],
      owner: "RA、BD 與 QA",
    },
  ];
}

function buildTraceability(assessments) {
  return assessments.slice(0, 6).map((item) => ({
    conclusion: item.conclusion,
    source: item.law,
    applicability: item.applicability,
    confidence: item.confidence,
  }));
}

function calculateOverallConfidence(assessments) {
  if (!assessments.length) return 0;
  const top = assessments.slice(0, 3);
  return Math.round((top.reduce((sum, item) => sum + item.confidence, 0) / top.length) * 100);
}

// ---------------------------------------------------------------------------
// Normalizers
// ---------------------------------------------------------------------------

function normalizeSummary(value, fallback) {
  if (!value || typeof value !== "object") return fallback;
  return {
    role: typeof value.role === "string" ? value.role : fallback.role,
    summary_points: sanitizeList(value.summary_points, fallback.summary_points),
    checklist: sanitizeList(value.checklist, fallback.checklist),
    missing_facts: sanitizeList(value.missing_facts, fallback.missing_facts),
  };
}

function normalizeStages(value, fallback) {
  if (!Array.isArray(value) || value.length === 0) return fallback;
  return value.slice(0, 3).map((stage, index) => ({
    stage_title: String(stage.stage_title || fallback[index]?.stage_title || `階段 ${index + 1}`),
    law_name: String(stage.law_name || fallback[index]?.law_name || "待確認法規"),
    control_points: sanitizeList(stage.control_points, fallback[index]?.control_points || []),
    owner: String(stage.owner || fallback[index]?.owner || "RA / PM"),
  }));
}

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

function safeStaticPath(urlPath) {
  const normalized = urlPath === "/" ? "/index.html" : decodeURIComponent(urlPath);
  const filePath = path.resolve(__dirname, `.${normalized}`);
  if (!filePath.startsWith(__dirname)) return null;
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return null;
  return filePath;
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) reject(new Error("Request too large"));
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
  });
}

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function sendText(res, status, text) {
  res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(text);
}

function extractOutputText(response) {
  if (typeof response.output_text === "string") return response.output_text;
  const parts = [];
  for (const item of response.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && content.text) parts.push(content.text);
    }
  }
  return parts.join("\n");
}

function parseJsonObject(text) {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("AI did not return JSON");
    return JSON.parse(match[0]);
  }
}

function sanitizeList(value, fallback) {
  if (!Array.isArray(value)) return fallback;
  const cleaned = value.map((item) => String(item).trim()).filter(Boolean);
  return cleaned.length ? cleaned : fallback;
}

function addIf(list, value, condition) {
  if (condition && !list.includes(value)) list.push(value);
}

function matchAny(text, terms) {
  return terms.some((term) => text.includes(term.toLowerCase()));
}

function translateProductType(type) {
  return {
    prescription_drug: "處方藥",
    otc_drug: "指示藥",
    general_drug: "成藥",
    cell_therapy: "細胞製劑 / 再生醫療製劑",
  }[type] || "自動判斷";
}

function translateApplicability(value) {
  return {
    likely_applicable: "高度可能適用",
    potentially_applicable: "可能適用",
    needs_more_information: "需更多資訊",
  }[value] || value;
}

function loadDotEnv() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim().replace(/^["']|["']$/g, "");
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}
