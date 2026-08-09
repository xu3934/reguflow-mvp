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

const GOLDEN_SCENARIO =
  "我想引入細胞製劑，用於癌症病人的再生醫療治療。請協助判斷台灣上市前需要符合哪些母法與授權子法，並產出可給 PM 和 RA 使用的合規準備報告。";

const pipelineSteps = [
  "正在抽取產品類型、活動、管轄地與風險關鍵字...",
  "正在用關鍵字、主題與母子法關係排序候選法規...",
  "正在判斷 likely / possible / insufficient information...",
  "正在生成官方來源對照表與 Mermaid 流程圖...",
];

const scenarioInput = document.querySelector("#scenario");
const productTypeInput = document.querySelector("#productType");
const demoModeInput = document.querySelector("#demoMode");
const analyzeButton = document.querySelector("#analyze");
const loadDemoButton = document.querySelector("#loadDemo");
const progressSection = document.querySelector("#progressSection");
const progressText = document.querySelector("#progressText");
const progressBar = document.querySelector("#progressBar");
const results = document.querySelector("#results");
const modeBadge = document.querySelector("#modeBadge");
const apiStatus = document.querySelector("#apiStatus");

if (window.mermaid) {
  window.mermaid.initialize({
    startOnLoad: false,
    theme: "base",
    securityLevel: "loose",
    themeVariables: {
      primaryColor: "#e8f4f1",
      primaryTextColor: "#17201c",
      primaryBorderColor: "#0f766e",
      lineColor: "#53645d",
      secondaryColor: "#fff4d6",
      tertiaryColor: "#f8faf8",
    },
  });
}

loadDemoButton.addEventListener("click", () => {
  scenarioInput.value = GOLDEN_SCENARIO;
  productTypeInput.value = "cell";
});

checkApiHealth();

analyzeButton.addEventListener("click", async () => {
  const scenario = scenarioInput.value.trim();
  if (!scenario) {
    scenarioInput.focus();
    scenarioInput.placeholder = "請先輸入情境，例如：我想引入細胞製劑...";
    return;
  }

  analyzeButton.disabled = true;
  results.classList.add("hidden");
  progressSection.classList.remove("hidden");

  for (let index = 0; index < pipelineSteps.length; index += 1) {
    setProgress(index);
    await wait(360);
  }

  const report =
    demoModeInput.value === "fallback"
      ? analyzeScenario(GOLDEN_SCENARIO, "cell", "local_fallback")
      : await analyzeScenarioWithApiFallback(scenario, productTypeInput.value);

  renderReport(report);
  progressSection.classList.add("hidden");
  results.classList.remove("hidden");
  analyzeButton.disabled = false;
});

document.querySelector("#copyMermaid").addEventListener("click", async () => {
  const source = document.querySelector("#mermaidSource").textContent;
  await navigator.clipboard.writeText(source);
  document.querySelector("#copyMermaid").textContent = "已複製";
  setTimeout(() => {
    document.querySelector("#copyMermaid").textContent = "複製 Mermaid";
  }, 1200);
});

async function analyzeScenarioWithApiFallback(scenario, selectedType) {
  if (location.protocol === "file:") {
    return analyzeScenario(scenario, selectedType, "local_fallback");
  }

  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenario, selectedType }),
    });
    if (!response.ok) throw new Error(`API failed: ${response.status}`);
    return await response.json();
  } catch (error) {
    const report = analyzeScenario(scenario, selectedType, "api_failed_fallback");
    report.aiError = error.message;
    return report;
  }
}

function analyzeScenario(scenario, selectedType, mode = "local_fallback") {
  const facts = extractFacts(scenario, selectedType);
  const candidates = retrieveCandidateLaws(facts);
  const assessments = assessApplicability(facts, candidates);
  const topAssessments = assessments.slice(0, 5);
  const gaps = buildGaps(facts, topAssessments);
  const actions = buildActions(facts, topAssessments);

  return {
    mode,
    facts,
    candidates: candidates.slice(0, 6),
    assessments: topAssessments,
    confidence: calculateOverallConfidence(topAssessments),
    gaps,
    actions,
    mermaid: buildMermaid(facts, topAssessments),
    traceability: buildTraceability(topAssessments),
  };
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

  return {
    jurisdiction: "台灣",
    productType,
    activities,
    riskKeywords,
    missingFacts,
    rawScenario: scenario,
  };
}

function retrieveCandidateLaws(facts) {
  const scored = LAW_INDEX.map((law) => {
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
  });

  return scored
    .filter((item) => item.score >= 18)
    .sort((a, b) => b.score - a.score);
}

function assessApplicability(facts, candidates) {
  return candidates.map((candidate) => {
    const { law, score, reasons } = candidate;
    const missingFacts = [];
    let applicability = "potentially_applicable";
    let confidence = Math.min(0.92, score / 72);

    if (score >= 48) {
      applicability = "likely_applicable";
    }
    if (score < 30) {
      applicability = "needs_more_information";
      confidence = Math.min(confidence, 0.55);
    }

    if (law.id.includes("review") || law.id.includes("registration")) {
      if (!facts.activities.includes("查驗登記")) {
        missingFacts.push("需確認是否已進入查驗登記或上市申請階段");
      }
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
      conclusion: buildConclusion(law, applicability),
    };
  });
}

function buildConclusion(law, applicability) {
  const label = {
    likely_applicable: "高度可能適用",
    potentially_applicable: "可能適用",
    needs_more_information: "需更多事實確認",
  }[applicability];

  return `${label}: ${law.title} (${law.pcode}) 應納入本案法規盤點。`;
}

function buildGaps(facts, assessments) {
  const gaps = new Set(facts.missingFacts);
  assessments.forEach((assessment) => {
    assessment.missingFacts.forEach((fact) => gaps.add(fact));
  });

  if (facts.productType === "cell") {
    gaps.add("需建立母法、查驗登記、製造品質、供應來源與流向資料的完整 traceability。");
  }
  if (facts.productType === "drug") {
    gaps.add("需盤點藥品查驗登記資料、GMP 與品質安全有效性證據。");
  }
  if (facts.productType === "device") {
    gaps.add("需確認醫材分類分級、安全效能、品質系統與必要臨床評估資料。");
  }

  return Array.from(gaps);
}

function buildActions(facts, assessments) {
  const topLawTitles = assessments.slice(0, 3).map((item) => item.law.title);
  return [
    `RA 先審核前三個候選法規: ${topLawTitles.join("、")}。`,
    "PM 將缺漏事實轉成問題清單，補齊產品來源、開發階段、品質與臨床資料狀態。",
    "後端下一步可接法務部爬蟲，用 PCode 抓取即時條文並更新索引版本。",
    "AI API 上線後，只讓模型做 facts extraction 與 applicability rationale，不讓模型自行發明法條。",
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
  const average =
    topThree.reduce((sum, item) => sum + item.confidence, 0) / topThree.length;
  return Math.round(average * 100);
}

function buildMermaid(facts, assessments) {
  const top = assessments.slice(0, 4);
  const candidateNodes = top
    .map((item, index) => `  B --> C${index + 1}["${item.law.title}"]`)
    .join("\n");
  const assessmentNodes = top
    .map(
      (item, index) =>
        `  C${index + 1} --> D["適用性判斷: ${translateApplicability(item.applicability)}"]`
    )
    .join("\n");

  return `graph LR
  A["情境輸入"] --> B["法律事實: ${translateProductType(facts.productType)} / ${facts.activities.join("、")}"]
${candidateNodes}
${assessmentNodes}
  D --> E["官方來源 Traceability"]
  E --> F["合規缺口與 Action Plan"]`;
}

function renderReport(report) {
  document.querySelector("#confidenceScore").textContent = `${report.confidence}% grounded`;
  const modeLabel = {
    openai: "OpenAI API",
    local_fallback: "Local fallback",
    api_failed_fallback: "API failed - local fallback",
    ai_failed_fallback: "AI failed - local fallback",
  }[report.mode] || "Local fallback";
  setModeBadge(modeLabel, report.mode);
  const modelText = report.model ? `模型: ${escapeHtml(report.model)}。` : "未使用付費 AI API。";
  const timeText = report.analyzedAt ? `分析時間: ${new Date(report.analyzedAt).toLocaleString()}。` : "";

  document.querySelector("#reportSummary").innerHTML = `
    <p><strong>目前分析來源: ${escapeHtml(modeLabel)}</strong>。${modelText} ${timeText}${report.aiError ? `API 備援原因: ${escapeHtml(report.aiError)}` : ""}</p>
    <p>這版不直接讓模型搜尋法規，而是先抽取法律事實，再用法規索引排序候選法規，最後標示適用性與缺漏事實。</p>
    <div>
      <strong>主要缺口</strong>
      <ul>${report.gaps.map((gap) => `<li>${escapeHtml(gap)}</li>`).join("")}</ul>
    </div>
    <div>
      <strong>建議下一步</strong>
      <ul>${report.actions.map((action) => `<li>${escapeHtml(action)}</li>`).join("")}</ul>
    </div>
  `;

  document.querySelector("#factsPanel").innerHTML = renderFacts(report.facts);
  document.querySelector("#candidateList").innerHTML = report.candidates
    .map((candidate) => renderCandidate(candidate))
    .join("");
  document.querySelector("#assessmentList").innerHTML = report.assessments
    .map((assessment) => renderAssessment(assessment))
    .join("");

  document.querySelector("#traceRows").innerHTML = report.traceability
    .map(
      (row) => `<tr>
        <td>${escapeHtml(row.conclusion)}</td>
        <td><a class="source-link" href="${row.source.url}" target="_blank" rel="noreferrer">${escapeHtml(row.source.title)} (${row.source.pcode})</a><br />${escapeHtml(row.source.text)}</td>
        <td>${translateApplicability(row.applicability)}</td>
        <td class="${row.confidence >= 0.72 ? "confidence-high" : "confidence-medium"}">${Math.round(row.confidence * 100)}%</td>
      </tr>`
    )
    .join("");

  renderMermaid(report.mermaid);
}

function renderFacts(facts) {
  return [
    ["管轄地", facts.jurisdiction],
    ["產品類型", translateProductType(facts.productType)],
    ["活動", facts.activities.join("、")],
    ["風險關鍵字", facts.riskKeywords.join("、") || "未明確提及"],
    ["缺漏事實", facts.missingFacts.join("；") || "目前輸入足以進行初步檢索"],
  ]
    .map(
      ([label, value]) => `<div class="fact-item">
        <span>${label}</span>
        <strong>${escapeHtml(value)}</strong>
      </div>`
    )
    .join("");
}

function renderCandidate(candidate) {
  return `<div class="candidate-item">
    <div>
      <p class="law-title">${escapeHtml(candidate.law.title)}</p>
      <p>${candidate.law.level === "mother" ? "母法" : "授權子法"} · ${candidate.law.pcode}</p>
    </div>
    <div class="candidate-score">${candidate.score}</div>
    <div class="reason-list">${candidate.reasons.map((reason) => `<span>${escapeHtml(reason)}</span>`).join("")}</div>
  </div>`;
}

function renderAssessment(assessment) {
  const missing =
    assessment.missingFacts.length > 0
      ? assessment.missingFacts.map((fact) => `<li>${escapeHtml(fact)}</li>`).join("")
      : "<li>目前沒有額外缺漏事實，但仍需 RA / Legal 複核。</li>";

  return `<div class="assessment-item">
    <div class="assessment-head">
      <div>
        <p class="law-title">${escapeHtml(assessment.law.title)}</p>
        <a class="source-link" href="${assessment.law.url}" target="_blank" rel="noreferrer">官方來源 ${assessment.law.pcode}</a>
      </div>
      <span class="law-type">${translateApplicability(assessment.applicability)}</span>
    </div>
    <p>${escapeHtml(assessment.conclusion)}</p>
    <ul>${missing}</ul>
  </div>`;
}

async function renderMermaid(source) {
  const diagram = document.querySelector("#mermaidDiagram");
  const sourceBlock = document.querySelector("#mermaidSource");
  diagram.removeAttribute("data-processed");
  diagram.textContent = source;
  sourceBlock.textContent = source;

  if (window.mermaid) {
    try {
      await window.mermaid.run({ nodes: [diagram] });
    } catch (error) {
      diagram.textContent = source;
    }
  }
}

function setProgress(index) {
  progressText.textContent = pipelineSteps[index];
  progressBar.style.width = `${((index + 1) / pipelineSteps.length) * 100}%`;
  document.querySelectorAll(".pipeline-list li").forEach((item, itemIndex) => {
    item.classList.toggle("active", itemIndex <= index);
  });
}

async function checkApiHealth() {
  if (location.protocol === "file:") {
    setModeBadge("Local file mode", "local_fallback");
    apiStatus.textContent = "目前是直接開啟 HTML 檔案，不會呼叫後端或 OpenAI API。請使用 http://localhost:3000 才能啟用 API 模式。";
    return;
  }

  try {
    const response = await fetch("/api/health");
    if (!response.ok) throw new Error(`Health check failed: ${response.status}`);
    const health = await response.json();
    if (health.apiConfigured) {
      setModeBadge("OpenAI API ready", "openai");
      apiStatus.textContent = `後端已偵測到 OPENAI_API_KEY，下一次分析會呼叫 OpenAI API。模型: ${health.model}`;
    } else {
      setModeBadge("Local fallback", "local_fallback");
      apiStatus.textContent = "後端正在運行，但尚未設定 OPENAI_API_KEY；目前分析不會收費，會使用本地 fallback。";
    }
  } catch (error) {
    setModeBadge("API server unavailable", "api_failed_fallback");
    apiStatus.textContent = `無法連到本機後端，會使用瀏覽器本地 fallback。原因: ${error.message}`;
  }
}

function setModeBadge(label, mode) {
  modeBadge.textContent = label;
  modeBadge.classList.remove("api-on", "api-off", "api-error");
  if (mode === "openai") {
    modeBadge.classList.add("api-on");
  } else if (mode === "api_failed_fallback" || mode === "ai_failed_fallback") {
    modeBadge.classList.add("api-error");
  } else {
    modeBadge.classList.add("api-off");
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

scenarioInput.value = GOLDEN_SCENARIO;
