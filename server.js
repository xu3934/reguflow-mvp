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
    level: "mother",
    title: "再生醫療製劑條例",
    url: "https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=L0030142",
    jurisdiction: "台灣",
    productTypes: ["cell", "drug"],
    activities: ["上市", "輸入", "製造", "治療使用", "查驗登記"],
    topics: ["再生醫療", "細胞製劑", "基因治療", "組織工程", "上市後管理"],
    article: "母法",
    text:
      "規範再生醫療製劑之研發、製造、查驗登記、輸入、上市後管理及相關事項，並授權中央主管機關訂定相關管理辦法。",
    authorizedSubLawIds: ["regen-source", "regen-manufacturing", "regen-review"],
  },
  {
    id: "regen-source",
    pcode: "L0030146",
    level: "sub",
    parentId: "regen-act",
    title: "再生醫療製劑供應來源及流向資料保存辦法",
    url: "https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=L0030146",
    jurisdiction: "台灣",
    productTypes: ["cell", "drug"],
    activities: ["上市後管理", "供應", "紀錄保存", "追蹤"],
    topics: ["供應來源", "流向資料", "保存期限", "稽核", "上市後追蹤"],
    article: "授權子法",
    text:
      "要求再生醫療製劑相關供應來源、流向資料、保存期限與紀錄管理，以支援上市後追蹤與稽核。",
  },
  {
    id: "regen-manufacturing",
    pcode: "L0030147",
    level: "sub",
    parentId: "regen-act",
    title: "再生醫療製劑製造及品質管理辦法",
    url: "https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=L0030147",
    jurisdiction: "台灣",
    productTypes: ["cell", "drug"],
    activities: ["製造", "品質管理", "放行", "變更管理"],
    topics: ["GMP", "製造場所", "批次紀錄", "品質系統", "放行標準"],
    article: "授權子法",
    text:
      "規範再生醫療製劑製造場所、品質系統、批次紀錄、放行標準與變更管理要求。",
  },
  {
    id: "regen-review",
    pcode: "L0030148",
    level: "sub",
    parentId: "regen-act",
    title: "再生醫療製劑查驗登記審查辦法",
    url: "https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=L0030148",
    jurisdiction: "台灣",
    productTypes: ["cell", "drug"],
    activities: ["查驗登記", "上市", "審查"],
    topics: ["品質資料", "非臨床", "臨床試驗", "風險管理", "審查資料"],
    article: "授權子法",
    text:
      "規範申請查驗登記時應檢附之品質、非臨床、臨床與風險管理資料。",
  },
  {
    id: "pharma-act",
    pcode: "L0030001",
    level: "mother",
    title: "藥事法",
    url: "https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=L0030001",
    jurisdiction: "台灣",
    productTypes: ["drug"],
    activities: ["製造", "輸入", "販賣", "上市", "查驗登記"],
    topics: ["新藥", "藥品", "藥證", "品質", "安全性", "有效性"],
    article: "母法",
    text:
      "藥品之製造、輸入、販賣與查驗登記應符合主管機關規範；新藥上市前需提出品質、安全性及有效性資料。",
    authorizedSubLawIds: ["drug-registration", "gmp"],
  },
  {
    id: "drug-registration",
    pcode: "L0030057",
    level: "sub",
    parentId: "pharma-act",
    title: "藥品查驗登記審查準則",
    url: "https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=L0030057",
    jurisdiction: "台灣",
    productTypes: ["drug"],
    activities: ["查驗登記", "上市", "審查"],
    topics: ["行政資料", "品質資料", "藥理毒理", "臨床試驗", "仿單"],
    article: "授權子法",
    text:
      "藥品申請查驗登記應依品項檢附行政、品質、藥理毒理、臨床試驗與標示仿單資料。",
  },
  {
    id: "gmp",
    pcode: "L0030074",
    level: "sub",
    parentId: "pharma-act",
    title: "藥物優良製造準則",
    url: "https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=L0030074",
    jurisdiction: "台灣",
    productTypes: ["drug"],
    activities: ["製造", "品質管理"],
    topics: ["GMP", "廠房", "設備", "文件", "製程", "品質管制"],
    article: "授權子法",
    text:
      "藥品製造與品質管理需符合 GMP，涵蓋人員、廠房、設備、文件、製程與品質管制。",
  },
  {
    id: "device-act",
    pcode: "L0030106",
    level: "mother",
    title: "醫療器材管理法",
    url: "https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=L0030106",
    jurisdiction: "台灣",
    productTypes: ["device"],
    activities: ["上市", "輸入", "製造", "查驗登記"],
    topics: ["醫療器材", "分類分級", "安全", "效能", "品質系統", "軟體醫材"],
    article: "母法",
    text:
      "醫療器材上市前應依風險等級完成分類分級、品質管理與查驗登記或登錄。",
    authorizedSubLawIds: ["device-registration"],
  },
  {
    id: "device-registration",
    pcode: "L0030110",
    level: "sub",
    parentId: "device-act",
    title: "醫療器材查驗登記審查準則",
    url: "https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=L0030110",
    jurisdiction: "台灣",
    productTypes: ["device"],
    activities: ["查驗登記", "上市", "審查"],
    topics: ["分類分級", "安全性", "效能", "臨床評估", "軟體驗證"],
    article: "授權子法",
    text:
      "醫療器材上市前需依分類分級提交安全、效能、品質與必要臨床評估資料。",
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
        mode: OPENAI_API_KEY ? "openai_ready" : "local_fallback",
      });
    }

    if (req.method === "POST" && url.pathname === "/api/analyze") {
      const payload = await readJson(req);
      const report = await analyzeWithOptionalAi(payload);
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
    sendJson(res, 500, {
      error: "server_error",
      message: error.message,
    });
  }
});

server.listen(PORT, () => {
  console.log(`ReguFlow MVP running at http://localhost:${PORT}`);
  console.log(OPENAI_API_KEY ? `AI mode enabled with ${OPENAI_MODEL}` : "AI mode disabled. Using local fallback.");
});

async function analyzeWithOptionalAi(payload) {
  const scenario = String(payload.scenario || "").trim();
  const selectedType = payload.selectedType || "auto";
  const localFacts = extractFacts(scenario, selectedType);

  if (!OPENAI_API_KEY) {
    return buildReport(localFacts, "local_fallback");
  }

  try {
    const aiFacts = await extractFactsWithOpenAI(scenario, selectedType, localFacts);
    const normalizedFacts = normalizeFacts(aiFacts, localFacts, scenario);
    const candidates = retrieveCandidateLaws(normalizedFacts);
    const aiAssessments = await assessApplicabilityWithOpenAI(normalizedFacts, candidates.slice(0, 6));
    return buildReport(normalizedFacts, "openai", aiAssessments);
  } catch (error) {
    const report = buildReport(localFacts, "ai_failed_fallback");
    report.aiError = error.message;
    return report;
  }
}

async function extractFactsWithOpenAI(scenario, selectedType, localFacts) {
  const prompt = `User scenario:
${scenario}

Selected product type: ${selectedType}
Local fallback facts:
${JSON.stringify(localFacts, null, 2)}

Return only JSON:
{
  "jurisdiction": "台灣",
  "productType": "cell" | "drug" | "device",
  "activities": string[],
  "riskKeywords": string[],
  "missingFacts": string[]
}`;

  const text = await callOpenAI({
    instructions:
      "You extract structured regulatory facts for Taiwan pharma/medical product scenarios. Do not identify laws. Do not invent legal citations. Return strict JSON only.",
    input: prompt,
  });
  return parseJsonObject(text);
}

async function assessApplicabilityWithOpenAI(facts, candidates) {
  const compactCandidates = candidates.map(({ law, score, reasons }) => ({
    id: law.id,
    title: law.title,
    pcode: law.pcode,
    level: law.level,
    article: law.article,
    text: law.text,
    score,
    retrievalReasons: reasons,
  }));

  const prompt = `Structured facts:
${JSON.stringify(facts, null, 2)}

Retrieved candidate laws:
${JSON.stringify(compactCandidates, null, 2)}

Assess only these retrieved laws. Return only JSON:
{
  "assessments": [
    {
      "lawId": string,
      "applicability": "likely_applicable" | "potentially_applicable" | "needs_more_information",
      "confidence": number,
      "reason": string,
      "missingFacts": string[]
    }
  ]
}`;

  const text = await callOpenAI({
    instructions:
      "You are a regulatory applicability reviewer. You may only assess the provided candidate laws. Never add laws not in the candidate list. Return strict JSON only.",
    input: prompt,
  });
  return parseJsonObject(text).assessments || [];
}

async function callOpenAI({ instructions, input }) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      instructions,
      input,
      temperature: 0,
    }),
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.error?.message || `OpenAI request failed: ${response.status}`);
  }

  return extractOutputText(json);
}

function buildReport(facts, mode, aiAssessments = null) {
  const candidates = retrieveCandidateLaws(facts);
  const assessments = mergeAssessments(facts, candidates, aiAssessments).slice(0, 5);
  const gaps = buildGaps(facts, assessments);
  const actions = buildActions(facts, assessments);

  return {
    mode,
    model: mode === "openai" ? OPENAI_MODEL : null,
    analyzedAt: new Date().toISOString(),
    facts,
    candidates: candidates.slice(0, 6),
    assessments,
    confidence: calculateOverallConfidence(assessments),
    gaps,
    actions,
    mermaid: buildMermaid(facts, assessments),
    traceability: buildTraceability(assessments),
  };
}

function mergeAssessments(facts, candidates, aiAssessments) {
  const local = assessApplicability(facts, candidates);
  if (!Array.isArray(aiAssessments)) return local;

  const byId = new Map(aiAssessments.map((item) => [item.lawId, item]));
  return local.map((assessment) => {
    const ai = byId.get(assessment.law.id);
    if (!ai) return assessment;
    return {
      ...assessment,
      applicability: ai.applicability || assessment.applicability,
      confidence:
        typeof ai.confidence === "number"
          ? Math.max(0, Math.min(0.95, ai.confidence))
          : assessment.confidence,
      missingFacts: Array.isArray(ai.missingFacts) ? ai.missingFacts : assessment.missingFacts,
      conclusion: `${translateApplicability(ai.applicability || assessment.applicability)}: ${assessment.law.title} (${assessment.law.pcode}) - ${ai.reason || assessment.conclusion}`,
    };
  });
}

function extractFacts(scenario, selectedType) {
  const text = scenario.toLowerCase();
  const productType =
    selectedType !== "auto"
      ? selectedType
      : matchAny(text, ["細胞", "再生醫療", "基因治療", "組織工程"])
        ? "cell"
        : matchAny(text, ["醫材", "醫療器材", "軟體醫材", "samd", "ai醫材"])
          ? "device"
          : "drug";

  const activities = [];
  addIf(activities, "輸入", matchAny(text, ["引入", "輸入", "進口"]));
  addIf(activities, "上市", matchAny(text, ["上市", "藥證", "許可證", "販售"]));
  addIf(activities, "查驗登記", matchAny(text, ["查驗登記", "審查", "送審"]));
  addIf(activities, "製造", matchAny(text, ["製造", "生產", "批次", "gmp"]));
  addIf(activities, "臨床試驗", matchAny(text, ["臨床", "試驗", "phase", "人體試驗"]));
  addIf(activities, "上市後管理", matchAny(text, ["流向", "追蹤", "保存", "上市後"]));
  if (activities.length === 0) activities.push("上市", "查驗登記");

  const riskKeywords = [];
  addIf(riskKeywords, "癌症", matchAny(text, ["癌症", "腫瘤", "oncology"]));
  addIf(riskKeywords, "人體細胞", matchAny(text, ["細胞", "自體", "異體"]));
  addIf(riskKeywords, "高風險治療", matchAny(text, ["治療", "病人", "患者"]));
  addIf(riskKeywords, "AI/軟體", matchAny(text, ["ai", "演算法", "軟體", "模型"]));

  const missingFacts = [];
  if (productType === "cell" && !matchAny(text, ["自體", "異體"])) {
    missingFacts.push("尚未說明細胞來源為自體或異體");
  }
  if (!matchAny(text, ["台灣", "tw", "臺灣"])) {
    missingFacts.push("目標管轄地目前由系統預設為台灣");
  }
  if (!matchAny(text, ["臨床", "非臨床", "品質", "gmp", "cmc"])) {
    missingFacts.push("尚未提供品質、非臨床或臨床證據狀態");
  }

  return { jurisdiction: "台灣", productType, activities, riskKeywords, missingFacts, rawScenario: scenario };
}

function retrieveCandidateLaws(facts) {
  return LAW_INDEX.map((law) => {
    let score = 0;
    const reasons = [];
    if (law.jurisdiction === facts.jurisdiction) {
      score += 12;
      reasons.push("管轄地符合");
    }
    if (law.productTypes.includes(facts.productType)) {
      score += 24;
      reasons.push("產品類型符合");
    }
    const activityMatches = facts.activities.filter((activity) => law.activities.includes(activity));
    if (activityMatches.length > 0) {
      score += activityMatches.length * 8;
      reasons.push(`活動符合: ${activityMatches.join("、")}`);
    }
    const topicMatches = facts.riskKeywords.filter((keyword) =>
      law.topics.some((topic) => topic.includes(keyword) || keyword.includes(topic))
    );
    if (topicMatches.length > 0) {
      score += topicMatches.length * 7;
      reasons.push(`風險主題符合: ${topicMatches.join("、")}`);
    }
    if (law.level === "mother") {
      score += 4;
      reasons.push("母法優先");
    }
    const parent = law.parentId ? LAW_INDEX.find((item) => item.id === law.parentId) : null;
    if (parent?.productTypes.includes(facts.productType)) {
      score += 6;
      reasons.push("母子法關係符合");
    }
    return { law, score, reasons };
  })
    .filter((item) => item.score >= 18)
    .sort((a, b) => b.score - a.score);
}

function assessApplicability(facts, candidates) {
  return candidates.map((candidate) => {
    const { law, score, reasons } = candidate;
    const missingFacts = [];
    let applicability = "potentially_applicable";
    let confidence = Math.min(0.92, score / 72);
    if (score >= 48) applicability = "likely_applicable";
    if (score < 30) {
      applicability = "needs_more_information";
      confidence = Math.min(confidence, 0.55);
    }
    if (law.id.includes("review") || law.id.includes("registration")) {
      if (!facts.activities.includes("查驗登記")) missingFacts.push("需確認是否已進入查驗登記或上市申請階段");
      if (!facts.rawScenario.includes("臨床") && !facts.rawScenario.includes("品質")) {
        missingFacts.push("需補充品質、非臨床、臨床資料狀態");
      }
    }
    if (law.id === "regen-source" && !facts.activities.includes("上市後管理")) {
      missingFacts.push("需確認是否已有供應來源、流向與上市後追蹤設計");
    }
    if (law.id === "regen-manufacturing" && !facts.activities.includes("製造")) {
      missingFacts.push("需確認製造場所、批次紀錄與品質系統是否納入引入範圍");
    }
    return {
      law,
      score,
      reasons,
      applicability,
      confidence,
      missingFacts,
      conclusion: `${translateApplicability(applicability)}: ${law.title} (${law.pcode}) 應納入本案法規盤點。`,
    };
  });
}

function normalizeFacts(aiFacts, localFacts, scenario) {
  const productTypes = ["cell", "drug", "device"];
  return {
    jurisdiction: aiFacts.jurisdiction === "台灣" ? "台灣" : localFacts.jurisdiction,
    productType: productTypes.includes(aiFacts.productType) ? aiFacts.productType : localFacts.productType,
    activities: sanitizeList(aiFacts.activities, localFacts.activities),
    riskKeywords: sanitizeList(aiFacts.riskKeywords, localFacts.riskKeywords),
    missingFacts: sanitizeList(aiFacts.missingFacts, localFacts.missingFacts),
    rawScenario: scenario,
  };
}

function buildGaps(facts, assessments) {
  const gaps = new Set(facts.missingFacts);
  assessments.forEach((assessment) => assessment.missingFacts.forEach((fact) => gaps.add(fact)));
  if (facts.productType === "cell") gaps.add("需建立母法、查驗登記、製造品質、供應來源與流向資料的完整 traceability。");
  if (facts.productType === "drug") gaps.add("需盤點藥品查驗登記資料、GMP 與品質安全有效性證據。");
  if (facts.productType === "device") gaps.add("需確認醫材分類分級、安全效能、品質系統與必要臨床評估資料。");
  return Array.from(gaps);
}

function buildActions(facts, assessments) {
  const topLawTitles = assessments.slice(0, 3).map((item) => item.law.title);
  return [
    `RA 先審核前三個候選法規: ${topLawTitles.join("、")}。`,
    "PM 將缺漏事實轉成問題清單，補齊產品來源、開發階段、品質與臨床資料狀態。",
    "後端下一步可接法務部爬蟲，用 PCode 抓取即時條文並更新索引版本。",
    "AI 只做 facts extraction 與 applicability rationale，候選法規仍由檢索層提供。",
  ];
}

function buildTraceability(assessments) {
  return assessments.map((assessment) => ({
    conclusion: assessment.conclusion,
    source: assessment.law,
    applicability: assessment.applicability,
    confidence: assessment.confidence,
  }));
}

function calculateOverallConfidence(assessments) {
  if (assessments.length === 0) return 0;
  const topThree = assessments.slice(0, 3);
  return Math.round((topThree.reduce((sum, item) => sum + item.confidence, 0) / topThree.length) * 100);
}

function buildMermaid(facts, assessments) {
  const top = assessments.slice(0, 4);
  const candidateNodes = top.map((item, index) => `  B --> C${index + 1}["${item.law.title}"]`).join("\n");
  const assessmentNodes = top
    .map((item, index) => `  C${index + 1} --> D["適用性判斷: ${translateApplicability(item.applicability)}"]`)
    .join("\n");
  return `graph LR
  A["情境輸入"] --> B["法律事實: ${translateProductType(facts.productType)} / ${facts.activities.join("、")}"]
${candidateNodes}
${assessmentNodes}
  D --> E["官方來源 Traceability"]
  E --> F["合規缺口與 Action Plan"]`;
}

function safeStaticPath(urlPath) {
  const normalized = urlPath === "/" ? "/index.html" : decodeURIComponent(urlPath);
  const filePath = path.join(__dirname, normalized);
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
      } catch (error) {
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
  return cleaned.length > 0 ? cleaned : fallback;
}

function addIf(list, value, condition) {
  if (condition && !list.includes(value)) list.push(value);
}

function matchAny(text, terms) {
  return terms.some((term) => text.includes(term.toLowerCase()));
}

function translateProductType(type) {
  return {
    cell: "細胞製劑 / 再生醫療製劑",
    drug: "新藥 / 藥品",
    device: "醫療器材",
  }[type] || "未分類";
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
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}
