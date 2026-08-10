const GOLDEN_SCENARIO =
  "我是代理商 BD，要引入細胞製劑到台灣，用於癌症病人的再生醫療治療。請告訴我相關的查驗、製造品質、供應來源與物流規範。";

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

const pipelineSteps = [
  "正在抽取角色、產品類型、法規類型與法律事實...",
  "正在混合檢索母法、授權子法與實務規範...",
  "正在判斷適用性與缺漏事實...",
  "正在產出法規適用性報告...",
  "正在產出角色專屬重點與 Checklist...",
  "正在產出三階段流程圖卡片...",
];

const scenarioInput = document.querySelector("#scenario");
const productTypeInput = document.querySelector("#productType");
const roleInput = document.querySelector("#role");
const marketInput = document.querySelector("#market");
const analyzeButton = document.querySelector("#analyze");
const loadDemoButton = document.querySelector("#loadDemo");
const progressSection = document.querySelector("#progressSection");
const progressText = document.querySelector("#progressText");
const progressBar = document.querySelector("#progressBar");
const results = document.querySelector("#results");
const modeBadge = document.querySelector("#modeBadge");
const apiStatus = document.querySelector("#apiStatus");
const sidebarStatus = document.querySelector("#sidebarStatus");

loadDemoButton.addEventListener("click", () => {
  scenarioInput.value = GOLDEN_SCENARIO;
  productTypeInput.value = "cell_therapy";
  roleInput.value = "進口代理商";
  setCheckedLawTypes(["運輸 GDP", "生產 GMP", "查驗登記", "供應來源與流向"]);
});

analyzeButton.addEventListener("click", async () => {
  const scenario = scenarioInput.value.trim();
  if (!scenario) {
    scenarioInput.focus();
    scenarioInput.placeholder = "請先輸入情境，例如：我是代理商 BD，要引入細胞製劑...";
    return;
  }

  analyzeButton.disabled = true;
  results.classList.add("hidden");
  progressSection.classList.remove("hidden");

  for (let index = 0; index < pipelineSteps.length; index += 1) {
    setProgress(index);
    await wait(300);
  }

  const payload = collectPayload(scenario);
  const report = await analyzeScenarioWithApiFallback(payload);
  renderReport(report);

  progressSection.classList.add("hidden");
  results.classList.remove("hidden");
  analyzeButton.disabled = false;
});

checkApiHealth();
scenarioInput.value = GOLDEN_SCENARIO;

async function analyzeScenarioWithApiFallback(payload) {
  if (location.protocol === "file:") {
    return analyzeScenario(payload, "local_fallback");
  }

  try {
    const response = await fetch("/api/v1/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`API failed: ${response.status}`);
    return await response.json();
  } catch (error) {
    const report = analyzeScenario(payload, "api_failed_fallback");
    report.aiError = error.message;
    return report;
  }
}

function analyzeScenario(payload, mode = "local_fallback") {
  const facts = extractFacts(payload);
  const candidates = retrieveCandidateLaws(facts);
  const assessments = assessApplicability(facts, candidates).slice(0, 6);
  const applicableLaws = buildApplicableLaws(assessments);
  const summaryChecklist = buildSummaryChecklist(facts, assessments);
  const processStages = buildProcessStages(facts, assessments);

  return {
    mode,
    model: null,
    analyzedAt: new Date().toISOString(),
    facts,
    candidates: candidates.slice(0, 7),
    assessments,
    confidence: calculateOverallConfidence(assessments),
    applicable_laws: applicableLaws,
    summary_and_checklist: summaryChecklist,
    process_stages: processStages,
    traceability: buildTraceability(assessments),
  };
}

function collectPayload(scenario) {
  return {
    user_intent: scenario,
    scenario,
    market: marketInput.value,
    product_type: productTypeInput.value,
    selectedType: productTypeInput.value,
    role: roleInput.value,
    law_type: getCheckedLawTypes(),
  };
}

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
    if (lawTypeMatches.length > 0) {
      score += lawTypeMatches.length * 10;
      reasons.push(`法規類型符合: ${lawTypeMatches.join("、")}`);
    }
    const activityMatches = facts.activities.filter((activity) => law.activities.includes(activity));
    if (activityMatches.length > 0) {
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
  const bullets = assessments.slice(0, 4).map((item) => item.law.plain);
  const checklist = Array.from(new Set(assessments.flatMap((item) => item.law.checklist))).slice(0, 10);
  return {
    role: facts.role,
    summary_points: bullets,
    checklist,
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

function renderReport(report) {
  const modeLabel = getModeLabel(report.mode);
  setModeBadge(modeLabel, report.mode);
  document.querySelector("#confidenceScore").textContent = `${report.confidence}% grounded`;

  document.querySelector("#applicableLaws").innerHTML = report.applicable_laws
    .map(
      (law) => `<section class="law-report-item">
        <div class="law-title-row">
          <h4>${escapeHtml(law.law_name)}</h4>
          <span class="law-type">${escapeHtml(law.pcode)}</span>
        </div>
        <a class="source-link" href="${law.source_url}" target="_blank" rel="noreferrer">官方來源 ${escapeHtml(law.pcode)}</a>
        <p><strong>${escapeHtml(law.article)}</strong> ${escapeHtml(law.article_text)}</p>
      </section>`
    )
    .join("");

  document.querySelector("#summaryChecklist").innerHTML = `
    <p><strong>目前分析來源: ${escapeHtml(modeLabel)}</strong>${report.model ? `，模型: ${escapeHtml(report.model)}` : ""}${report.aiError ? `，備援原因: ${escapeHtml(report.aiError)}` : ""}</p>
    <h4>${escapeHtml(report.summary_and_checklist.role)} 白話重點</h4>
    <ul>${report.summary_and_checklist.summary_points.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    <h4>代辦清單 Checklist</h4>
    <ul class="checklist">${report.summary_and_checklist.checklist.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    <h4>缺漏事實</h4>
    <ul>${report.summary_and_checklist.missing_facts.map((item) => `<li>${escapeHtml(item)}</li>`).join("") || "<li>目前沒有明顯缺漏，但仍需 RA / Legal 複核。</li>"}</ul>
  `;

  document.querySelector("#factsPanel").innerHTML = renderFacts(report.facts);
  document.querySelector("#candidateList").innerHTML = report.candidates.map(renderCandidate).join("");
  document.querySelector("#processStages").innerHTML = report.process_stages.map(renderStage).join("");
  document.querySelector("#traceRows").innerHTML = report.traceability.map(renderTraceRow).join("");
}

function renderFacts(facts) {
  return [
    ["目標市場", facts.jurisdiction],
    ["角色定位", facts.role],
    ["產品類型", facts.productTypeLabel || translateProductType(facts.productType)],
    ["法規類型", facts.lawTypes.join("、")],
    ["情境活動", facts.activities.join("、")],
  ]
    .map(([label, value]) => `<div class="fact-item"><span>${label}</span><strong>${escapeHtml(value)}</strong></div>`)
    .join("");
}

function renderCandidate(candidate) {
  return `<div class="candidate-item">
    <div>
      <p class="law-title">${escapeHtml(candidate.law.title)}</p>
      <p>${escapeHtml(candidate.law.level)} · ${escapeHtml(candidate.law.pcode)}</p>
    </div>
    <div class="candidate-score" title="檢索匹配分數">${candidate.score}</div>
    <div class="reason-list">${candidate.reasons.map((reason) => `<span>${escapeHtml(reason)}</span>`).join("")}</div>
  </div>`;
}

function renderStage(stage) {
  return `<section class="stage-card">
    <p class="stage-kicker">${escapeHtml(stage.owner)}</p>
    <h4>${escapeHtml(stage.stage_title)}</h4>
    <p class="stage-law">${escapeHtml(stage.law_name)}</p>
    <ul>${stage.control_points.map((point) => `<li>${escapeHtml(point)}</li>`).join("")}</ul>
  </section>`;
}

function renderTraceRow(row) {
  return `<tr>
    <td>${escapeHtml(row.conclusion)}</td>
    <td><a class="source-link" href="${row.source.url}" target="_blank" rel="noreferrer">${escapeHtml(row.source.title)} (${escapeHtml(row.source.pcode)})</a><br />${escapeHtml(row.source.articleText)}</td>
    <td>${translateApplicability(row.applicability)}</td>
    <td class="${row.confidence >= 0.72 ? "confidence-high" : "confidence-medium"}">${Math.round(row.confidence * 100)}%</td>
  </tr>`;
}

async function checkApiHealth() {
  if (location.protocol === "file:") {
    setModeBadge("Local file mode", "local_fallback");
    apiStatus.textContent = "目前直接開啟 HTML 檔案，不會呼叫後端或 OpenAI API。";
    sidebarStatus.textContent = "Offline - local file";
    return;
  }

  try {
    const response = await fetch("/api/health");
    if (!response.ok) throw new Error(`Health check failed: ${response.status}`);
    const health = await response.json();
    if (health.apiConfigured) {
      setModeBadge("AI Pipeline ready", "openai");
      apiStatus.textContent = `🟢 後端 API Online，已偵測到 OPENAI_API_KEY。模型: ${health.model}。管線: ${health.pipeline || "A→Scrape→B→Scrape→C+D"}`;
      sidebarStatus.textContent = "🟢 Backend API Online";
    } else {
      setModeBadge("Local fallback", "local_fallback");
      apiStatus.textContent = "🟡 後端 API Online，但尚未設定 OPENAI_API_KEY；使用本地靜態備援，不會收費。";
      sidebarStatus.textContent = "🟡 Backend Online / AI fallback";
    }
  } catch (error) {
    setModeBadge("API server unavailable", "api_failed_fallback");
    apiStatus.textContent = `🔴 無法連到後端，會使用本地 fallback。原因: ${error.message}`;
    sidebarStatus.textContent = "🔴 Backend Offline";
  }
}

function setProgress(index) {
  progressText.textContent = pipelineSteps[index];
  progressBar.style.width = `${((index + 1) / pipelineSteps.length) * 100}%`;
  document.querySelectorAll(".pipeline-list li").forEach((item, itemIndex) => {
    item.classList.toggle("active", itemIndex <= index);
  });
}

function getCheckedLawTypes() {
  return Array.from(document.querySelectorAll('input[name="lawType"]:checked')).map((item) => item.value);
}

function setCheckedLawTypes(values) {
  document.querySelectorAll('input[name="lawType"]').forEach((item) => {
    item.checked = values.includes(item.value);
  });
}

function setModeBadge(label, mode) {
  modeBadge.textContent = label;
  modeBadge.classList.remove("api-on", "api-off", "api-error");
  if (mode === "openai") modeBadge.classList.add("api-on");
  else if (mode === "api_failed_fallback" || mode === "ai_failed_fallback") modeBadge.classList.add("api-error");
  else modeBadge.classList.add("api-off");
}

function getModeLabel(mode) {
  return {
    ai_pipeline: "AI Pipeline (法務部即時串接)",
    openai: "OpenAI API",
    local_fallback: "Local fallback",
    api_failed_fallback: "API failed - local fallback",
    ai_failed_fallback: "AI failed - local fallback",
  }[mode] || "Local fallback";
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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
