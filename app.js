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
    pcode: "L0030086",
    level: "授權子法",
    parentId: "drug-act",
    title: "西藥優良運銷準則",
    url: "https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=L0030086",
    productTypes: ["prescription_drug", "otc_drug", "general_drug", "cell_therapy"],
    roles: ["進口代理商", "供應鏈物流"],
    lawTypes: ["運輸 GDP"],
    activities: ["運輸", "物流", "倉儲", "配送", "冷鏈"],
    article: "第2條",
    articleText:
      "執行西藥批發、輸入及輸出之業者，其品質管理應符合附表一品質管理基準之規定。",
    plain:
      "代理商和物流團隊要證明運輸過程不破壞品質，尤其是冷鏈、溫度紀錄、委外物流和異常處理。",
    checklist: ["確認倉儲與運輸條件", "建立溫度紀錄", "確認委外物流責任", "建立異常與召回流程"],
  },
  {
    id: "gmp-factory",
    pcode: "L0030008",
    level: "授權子法",
    parentId: "drug-act",
    title: "藥物製造工廠設廠標準",
    url: "https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=L0030008",
    productTypes: ["prescription_drug", "otc_drug", "general_drug", "cell_therapy"],
    roles: ["代工藥廠", "原料藥廠", "研發藥廠"],
    lawTypes: ["生產 GMP"],
    activities: ["製造", "設廠", "廠房", "GMP"],
    article: "第2條",
    articleText:
      "藥物製造工廠或場所之設備及衛生條件，應符合本標準之規定；本標準未規定者，依其他有關法令之規定。",
    plain:
      "要在台灣新設或擴建藥物製造工廠，廠房設備與衛生條件必須先符合這份設廠標準，這跟日常 GMP 品質管理是分開的門檻，設廠前就要確認。",
    checklist: ["確認廠房設備是否符合設廠標準", "確認衛生條件是否符合規定", "查核本標準未涵蓋事項對應之其他法令"],
  },
  {
    id: "rare-disease-act",
    pcode: "L0030003",
    level: "母法",
    title: "罕見疾病防治及藥物法",
    url: "https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=L0030003",
    productTypes: ["prescription_drug", "cell_therapy"],
    roles: ["進口代理商", "研發藥廠", "代工藥廠"],
    lawTypes: ["查驗登記"],
    activities: ["查驗登記", "上市", "引入", "罕見疾病"],
    article: "第3條第2項、第15條",
    articleText:
      "本法所稱罕見疾病藥物，指依本法提出申請，經審議會審議認定，並經中央主管機關公告，其主要適應症用於預防、診斷、治療罕見疾病者；主要適應症用於預防、診斷或治療罕見疾病者，得申請查驗登記為罕見疾病藥物。",
    plain:
      "如果產品的主要適應症是預防、診斷或治療罕見疾病，可以申請認定為罕見疾病藥物，走專屬的查驗登記管道，跟一般藥品查驗登記是不同的申請路徑。",
    checklist: ["確認適應症是否符合罕見疾病藥物認定條件", "向審議會提出罕見疾病藥物認定申請", "依罕見疾病藥物專屬管道辦理查驗登記"],
  },
  {
    id: "controlled-drug-act",
    pcode: "L0030010",
    level: "母法",
    title: "管制藥品管理條例",
    url: "https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=L0030010",
    productTypes: ["prescription_drug"],
    roles: ["進口代理商", "研發藥廠", "代工藥廠"],
    lawTypes: ["查驗登記", "供應來源與流向"],
    activities: ["管制藥品", "製造", "輸入"],
    article: "第3條、第16條",
    articleText:
      "本條例所稱管制藥品，指成癮性麻醉藥品、影響精神藥品及其他認為有加強管理必要之藥品；機構須申請核准登記取得管制藥品登記證，始得辦理輸入、輸出、製造、販賣或購買等業務。",
    plain:
      "如果產品屬於成癮性麻醉藥品或影響精神藥品，除了一般藥品的查驗登記，還要另外申請管制藥品登記證才能輸入、製造或販賣，這是額外且獨立的許可關卡。",
    checklist: ["確認產品是否屬於第一級至第三級管制藥品", "申請管制藥品登記證", "確認經手人員是否領有管制藥品使用執照"],
  },
  {
    id: "pharmacist-act",
    pcode: "L0030066",
    level: "母法",
    title: "藥師法",
    url: "https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=L0030066",
    productTypes: ["prescription_drug", "otc_drug", "general_drug", "cell_therapy"],
    roles: ["代工藥廠", "研發藥廠", "原料藥廠"],
    lawTypes: ["生產 GMP"],
    activities: ["藥師", "監製", "製造"],
    article: "第1條、第15條第4項",
    articleText:
      "中華民國人民經藥師考試及格者，得充藥師；藥品製造之監製為藥師業務之一。",
    plain:
      "藥品製造現場需要有考試及格的專任藥師負責監製，這是藥師法對製造業者的人員資格要求，跟各別產品的 GMP 廠房要求是分開的兩件事。",
    checklist: ["確認製造現場配置具藥師執照之專任人員", "確認藥師負責監製業務範圍"],
  },
  {
    id: "named-patient-import",
    pcode: "L0030084",
    level: "授權子法",
    parentId: "drug-act",
    title: "特定藥物專案核准製造及輸入辦法",
    url: "https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=L0030084",
    productTypes: ["prescription_drug", "cell_therapy"],
    roles: ["進口代理商", "研發藥廠"],
    lawTypes: ["查驗登記"],
    activities: ["專案申請", "專案核准", "引入", "輸入"],
    article: "第2條",
    articleText:
      "教學醫院申請特定藥物專案核准，應載明為預防、診治危及生命或嚴重失能之疾病，且國內尚無適當藥品或合適替代療法之意旨，並檢附診斷證明書、人體研究倫理審查委員會核准證明及完整治療計畫書。",
    plain:
      "如果產品還沒完成正式查驗登記，但用於治療國內沒有其他合適藥物可用的危及生命或嚴重失能疾病，可以由教學醫院或藥商走「專案核准」的特殊管道申請製造或輸入，不用等一般查驗登記走完。",
    checklist: ["確認是否符合國內無適當替代療法之要件", "準備診斷證明書與治療計畫書", "確認申請人資格（教學醫院或藥商）"],
  },
  {
    id: "rare-disease-registration",
    pcode: "L0030032",
    level: "授權子法",
    parentId: "rare-disease-act",
    title: "罕見疾病藥物查驗登記審查準則",
    url: "https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=L0030032",
    productTypes: ["prescription_drug", "cell_therapy"],
    roles: ["進口代理商", "研發藥廠"],
    lawTypes: ["查驗登記"],
    activities: ["查驗登記", "罕見疾病"],
    article: "第2條",
    articleText:
      "申請罕見疾病藥物查驗登記，應填具申請書並繳交審查費，檢附標籤、仿單及證照、相關療效品質及安全性資料；申請輸入者，另須檢附原產國家核准製售及原廠授權登記之證明文件。",
    plain:
      "罕見疾病藥物查驗登記要準備的送審資料跟一般藥品不同，如果是輸入案，還需要額外檢附原產國核准製售證明，資料清單要照這份準則的規定準備。",
    checklist: ["準備標籤、仿單及證照", "準備療效、品質及安全性資料", "輸入案須準備原產國核准製售證明"],
  },
  {
    id: "rare-disease-special-application",
    pcode: "L0030030",
    level: "授權子法",
    parentId: "rare-disease-act",
    title: "罕見疾病藥物專案申請辦法",
    url: "https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=L0030030",
    productTypes: ["prescription_drug", "cell_therapy"],
    roles: ["進口代理商", "研發藥廠"],
    lawTypes: ["查驗登記"],
    activities: ["專案申請", "罕見疾病", "引入", "輸入"],
    article: "第2條",
    articleText:
      "罕見疾病藥物未經查驗登記，或持有許可證者無法供應，或該藥物售價經中央主管機關認定顯不合理時，其製造或輸入得由政府機關、醫療機構、罕見疾病病人與家屬及相關基金會、學會、協會，專案申請中央主管機關許可。",
    plain:
      "如果罕見疾病藥物根本還沒在台灣完成查驗登記，或原本有許可證的廠商供應不上，病患端或醫療機構可以走專案申請管道取得藥物，不用等代理商完成正式查驗登記。",
    checklist: ["確認是否符合未查驗登記/供應不足/售價不合理其中一項要件", "確認申請人資格", "準備專案申請文件送中央主管機關"],
  },
  {
    id: "rare-disease-incentive",
    pcode: "L0030029",
    level: "授權子法",
    parentId: "rare-disease-act",
    title: "罕見疾病藥物供應製造及研究發展獎勵辦法",
    url: "https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=L0030029",
    productTypes: ["prescription_drug", "cell_therapy"],
    roles: ["進口代理商", "研發藥廠", "代工藥廠"],
    lawTypes: ["查驗登記"],
    activities: ["獎勵", "引進", "供應", "罕見疾病"],
    article: "第2條",
    articleText:
      "引進罕見疾病藥物、將罕見疾病藥物列入處方集，或專案申請罕見疾病藥物，對罕見疾病藥物之供應著有貢獻者，得依本辦法申請獎勵。",
    plain:
      "代理商或藥廠如果對罕見疾病藥物的引進、供應或研發有貢獻，可以另外申請政府獎勵，這是額外的誘因機制，跟查驗登記本身無關但值得評估。",
    checklist: ["確認是否符合申請獎勵之貢獻情形", "準備申請獎勵所需佐證文件"],
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
  addIf(activities, "罕見疾病", matchAny(text, ["罕見疾病", "罕病", "孤兒藥", "orphan"]));
  addIf(activities, "管制藥品", matchAny(text, ["管制藥品", "麻醉藥品", "影響精神藥物", "影響精神藥品", "毒品"]));
  addIf(activities, "專案申請", matchAny(text, ["專案核准", "專案申請", "恩慈", "compassionate", "尚無合適替代療法"]));
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

  document.querySelector("#processStages").innerHTML = report.process_stages.map(renderStage).join("");
  document.querySelector("#traceRows").innerHTML = report.traceability.map(renderTraceRow).join("");
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
  if (mode === "openai" || mode === "pipeline") modeBadge.classList.add("api-on");
  else if (mode === "api_failed_fallback" || mode === "ai_failed_fallback") modeBadge.classList.add("api-error");
  else modeBadge.classList.add("api-off");
}

function getModeLabel(mode) {
  return {
    pipeline: "AI Pipeline (法務部即時串接)",
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
