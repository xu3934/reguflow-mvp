const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

loadDotEnv();

const PORT = Number(process.env.PORT || 3000);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const APP_VERSION = "20260815v17";
const OPENAI_MODEL = normalizeOpenAIModelId(process.env.OPENAI_MODEL, "gpt-5.6-luna");
// Prompt A (pick a mother law from a shortlist) and Prompt B (pull authorizing
// clauses out of a statute) are classification/extraction, not drafting — a
// smaller model handles them at a fraction of the latency.
const OPENAI_FAST_MODEL = normalizeOpenAIModelId(process.env.OPENAI_FAST_MODEL, "gpt-5.6-luna");
const OPENAI_SUMMARY_MODEL = normalizeOpenAIModelId(process.env.OPENAI_SUMMARY_MODEL, "gpt-5.6-sol");
const OPENAI_EMBEDDING_MODEL = normalizeOpenAIModelId(process.env.OPENAI_EMBEDDING_MODEL, "text-embedding-3-small");
const requestedReasoningEffort = String(process.env.OPENAI_REASONING_EFFORT || "none").trim().toLowerCase();
const OPENAI_REASONING_EFFORT = ["none", "low", "medium", "high", "xhigh", "max"].includes(requestedReasoningEffort)
  ? requestedReasoningEffort
  : "none";

function normalizeOpenAIModelId(value, fallback) {
  const model = String(value || fallback).trim();
  return /^(gpt-|text-embedding-)/i.test(model) ? model.toLowerCase() : model;
}

// Scraped statutes and the sub-laws they authorize change on a legislative
// timescale, so both are cached across requests. Only successful lookups are
// stored: caching a scrape failure would pin the degraded fallback text in
// place for days.
const LAW_TEXT_TTL_MS = 3 * 24 * 60 * 60 * 1000;
const lawTextCache = new Map();
const subLawCache = new Map();
const authorizedSubLawCache = new Map();
const pcodeByNameCache = new Map();

function cacheGet(cache, key) {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return undefined;
  }
  return entry.value;
}

function cacheSet(cache, key, value) {
  cache.set(key, { value, expiresAt: Date.now() + LAW_TEXT_TTL_MS });
}

// ---------------------------------------------------------------------------
// Rate limiting — the AI endpoints each cost several model calls, and they are
// reachable without authentication, so cap them per client.
// ---------------------------------------------------------------------------

const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX_PER_WINDOW = 8;
const rateBuckets = new Map();

function clientKey(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return forwarded || req.socket.remoteAddress || "unknown";
}

function isRateLimited(req) {
  const key = clientKey(req);
  const now = Date.now();
  const recent = (rateBuckets.get(key) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_MAX_PER_WINDOW) {
    rateBuckets.set(key, recent);
    return true;
  }
  recent.push(now);
  rateBuckets.set(key, recent);
  if (rateBuckets.size > 5000) {
    for (const [k, times] of rateBuckets) {
      if (!times.some((t) => now - t < RATE_WINDOW_MS)) rateBuckets.delete(k);
    }
  }
  return false;
}

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
  {
    id: "nhi-act",
    pcode: "L0060001",
    level: "母法",
    title: "全民健康保險法",
    url: "https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=L0060001",
    productTypes: ["prescription_drug", "otc_drug", "general_drug", "cell_therapy"],
    roles: ["進口代理商", "研發藥廠", "代工藥廠"],
    lawTypes: ["健保給付"],
    activities: ["健保給付", "上市"],
    article: "第41條",
    articleText:
      "藥物給付項目及支付標準，由保險人與相關機關、專家學者、被保險人、雇主、保險醫事服務提供者等代表共同擬訂，並得邀請藥物提供者及相關專家、病友等團體代表表示意見，報主管機關核定發布。",
    plain:
      "新藥要進健保給付，程序是由健保署召集各方代表共同擬訂給付項目與支付標準，藥廠（藥物提供者）可在會議表示意見，最後報衛福部核定發布——這是健保收載程序的法源。",
    checklist: ["確認取得藥證後啟動健保收載申請", "準備向共同擬訂會議表達意見之資料", "追蹤主管機關核定進度"],
  },
  {
    id: "nhi-drug-payment",
    pcode: "L0060035",
    level: "授權子法",
    parentId: "nhi-act",
    title: "全民健康保險藥物給付項目及支付標準",
    url: "https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=L0060035",
    productTypes: ["prescription_drug", "otc_drug", "general_drug", "cell_therapy"],
    roles: ["進口代理商", "研發藥廠"],
    lawTypes: ["健保給付"],
    activities: ["健保給付", "上市"],
    article: "第17條、第38條",
    articleText:
      "新藥支付價格依類別參考十國藥價核算：第一類新藥以十國藥價中位數核價；第二類新藥以十國藥價中位數為上限，得採十國藥價最低價或原產國藥價等方法核價。十國藥價指英國、德國、日本、瑞士、美國、比利時、澳洲、法國、瑞典、加拿大之藥價換算取得。",
    plain:
      "健保新藥核價直接參考十大先進國藥價：突破創新的第一類新藥用十國中位數，其他類別以中位數為上限、可能以十國最低價或原產國價核定——所以定價策略要先盤點產品在這十國的實際售價。",
    checklist: ["盤點產品於十國（英德日瑞士美比澳法瑞典加）之現行售價", "評估新藥類別對核價方法的影響", "查詢同類已收載藥品之支付價格（健保署公開資料）"],
  },
  {
    id: "drug-ad",
    pcode: "L0030001",
    level: "母法專章",
    parentId: "drug-act",
    title: "藥事法第七章：藥物廣告之管理",
    url: "https://law.moj.gov.tw/LawClass/LawParaDeatil.aspx?pcode=L0030001&bp=8",
    productTypes: ["prescription_drug", "otc_drug", "general_drug", "cell_therapy"],
    roles: ["進口代理商", "研發藥廠", "代工藥廠"],
    lawTypes: ["廣告與衛教"],
    activities: ["廣告", "衛教", "宣傳", "行銷"],
    article: "第65、66、68、69條",
    articleText:
      "非藥商不得為藥物廣告；藥商刊播藥物廣告應於刊播前將所有文字、圖畫或言詞申請衛生主管機關核准；藥物廣告不得假借他人名義宣傳、利用書刊資料保證效能、藉採訪或報導宣傳或以其他不正當方式宣傳；非藥物不得為醫療效能之標示或宣傳。",
    plain:
      "藥物廣告採事前審查制：只有藥商能打藥物廣告，而且刊播前就要把完整文字圖像送衛生主管機關核准；誇大宣傳、藉報導帶風向都被明文禁止。衛教材料若涉及醫療效能宣稱，也可能被認定為廣告而受同樣規範。",
    checklist: ["確認廣告刊播前已取得主管機關核准文件", "檢視廣告內容無誇大或藉報導宣傳情事", "確認衛教材料未涉未經核准之醫療效能宣稱"],
  },
];

// ---------------------------------------------------------------------------
// Role profiles — job-function lens applied on top of the company role.
// Only affects how the AI frames the same grounded law texts; it must never
// license the model to invent content outside the retrieved laws.
// ---------------------------------------------------------------------------

const ROLE_PROFILES = {
  BD: {
    label: "BD 商務開發",
    promptC:
      "讀者是商務開發（BD）。每條法規都要回答：對市場進入門檻、上市時程與交易合作條件的影響。重點整理以「這條法規讓進入市場變快還是變慢、成本變高還是變低」為敘事主軸；Checklist 以商業決策為單位（例如評估取證時程、確認授權文件），不是合規作業細節。缺漏事實聚焦目標適應症與商業條件是否已明確。法規未涵蓋市場規模或商業數據時，明確標示需另行市調確認，不得自行推論市場資訊。",
    promptD:
      "三階段以市場進入視角切分：【市場評估】法規門檻與時程盤點、【取證推進】查驗登記與授權安排、【上市準備】通路與合規交接。",
  },
  PM: {
    label: "PM 產品經理",
    promptC:
      "讀者是產品經理（PM）。每條法規都要回答：對上市時程、健保給付申請前提、適應症範圍的影響。例如藥品許可證是健保收載申請的前提，取證時程直接決定給付申請最早遞件時點；附款許可的條件可能影響給付範圍認定。若提供的法規包含全民健康保險法或藥物給付項目及支付標準，收載程序與核價規則（如十國藥價參考）應引用該法條說明。Checklist 以商業決策為單位（確認取證時程回推收載遞件時點、盤點競品收載狀況、評估罕見疾病藥物認定對給付談判的影響），不是合規作業。缺漏事實聚焦競品收載狀況與療效及成本效益資料完備度。競品實際收載品項與支付價格屬健保署公開資料而非法規內容，一律標示需另行查詢，不得自行推論具體品項或價格數字。",
    promptD:
      "三階段以產品上市視角切分：【取證階段】查驗登記與取證策略、【收載準備】健保給付申請前置作業、【上市後管理】給付範圍維護與市場監測。",
  },
  RA: {
    label: "RA 法規事務",
    promptC:
      "讀者是法規事務（RA）。重點整理需保留法規條號與原文依據，逐條說明適用要件與送審資料要求；Checklist 以送件作業為單位，具體到文件名稱與申請程序。缺漏事實聚焦送審資料包的完備度。",
    promptD:
      "三階段以送審作業視角切分：【送件前置】資料包整備、【審查應對】查驗登記與補件、【核准後義務】變更登記與展延管理。",
  },
  QA: {
    label: "QA 品質保證",
    promptC:
      "讀者是品質保證（QA）。每條法規都要回答：對品質系統、文件紀錄與稽核準備的要求。重點整理聚焦 GMP/GDP 相關義務、人員資格與紀錄保存年限；Checklist 以品質系統建置為單位（SOP、批次紀錄、溫控紀錄、供應商稽核）。缺漏事實聚焦品質系統現況與稽核缺口。",
    promptD:
      "三階段以品質管理視角切分：【體系建置】品質系統與人員資格、【日常運作】紀錄與監控、【稽核應對】查核準備與矯正措施。",
  },
};

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
        version: APP_VERSION,
        provider: "openai",
        model: OPENAI_API_KEY ? OPENAI_MODEL : null,
        models: OPENAI_API_KEY ? {
          applicability: OPENAI_MODEL,
          summary: OPENAI_SUMMARY_MODEL,
          flowchart: OPENAI_MODEL,
          answers: OPENAI_MODEL,
          competitors: OPENAI_MODEL,
        } : null,
        mode: OPENAI_API_KEY ? "pipeline_ready" : "local_fallback",
        pipeline: "A→法務部爬取→B→逐條比對→Luna 適用性／問答／競品／流程圖 ∥ Sol 摘要／待辦",
      });
    }

    if (req.method === "GET" && url.pathname === "/api/v1/nhi-drugs") {
      const q = (url.searchParams.get("q") || "").trim();
      return sendJson(res, 200, searchNhiDrugs(q));
    }

    if (req.method === "POST" && (url.pathname === "/api/v1/analyze" || url.pathname === "/api/analyze")) {
      if (isRateLimited(req)) return sendJson(res, 429, { error: "rate_limited", message: "請求過於頻繁，請稍後再試。" });
      const payload = await readJson(req);
      const report = await analyzeWithPipeline(payload);
      return sendJson(res, 200, report);
    }

    if (req.method === "POST" && url.pathname === "/api/v1/analyze-stream") {
      if (isRateLimited(req)) return sendJson(res, 429, { error: "rate_limited", message: "請求過於頻繁，請稍後再試。" });
      const payload = await readJson(req);
      const startedAt = Date.now();
      res.writeHead(200, {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      });
      const pushProgress = (step, message) => {
        res.write(`${JSON.stringify({ type: "progress", step, message, elapsed_ms: Date.now() - startedAt })}\n`);
      };
      try {
        const report = await analyzeWithPipeline(payload, pushProgress);
        res.write(`${JSON.stringify({ type: "result", report, elapsed_ms: Date.now() - startedAt })}\n`);
      } catch (error) {
        res.write(`${JSON.stringify({ type: "error", message: error.message, elapsed_ms: Date.now() - startedAt })}\n`);
      }
      return res.end();
    }

    if (req.method === "POST" && url.pathname === "/api/v1/compliance-check") {
      if (isRateLimited(req)) return sendJson(res, 429, { error: "rate_limited", message: "請求過於頻繁，請稍後再試。" });
      const payload = await readJson(req);
      const result = await checkAdCompliance(payload);
      return sendJson(res, 200, result);
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
  console.log(`Rxplain running at http://localhost:${PORT}`);
  console.log(
    OPENAI_API_KEY
      ? `OpenAI enabled: applicability/answers/competitors/flowchart=${OPENAI_MODEL}, summary/checklist=${OPENAI_SUMMARY_MODEL}`
      : "OpenAI disabled. Using local fallback."
  );
  // Build the mother-law vectors now so the first real request doesn't pay for
  // it. Failures are already handled inside (retrieval falls back to the full
  // list), so this is fire-and-forget.
  if (OPENAI_API_KEY) {
    ensureMotherLawEmbeddings()
      .then((cache) => console.log(cache ? `Embedding cache warm (${cache.length} mother laws)` : "Embedding warmup skipped"))
      .catch(() => {});
  }
});

// ---------------------------------------------------------------------------
// Pipeline orchestrator
// ---------------------------------------------------------------------------

async function analyzeWithPipeline(payload, onProgress = () => {}) {
  // Step 1: always compute local data first (used as fallback at every stage)
  onProgress(0, "解析角色、產品、運輸情境與需要補充的事實");
  const facts = extractFacts(payload);
  const candidates = retrieveCandidateLaws(facts);
  const assessments = assessApplicability(facts, candidates).slice(0, 6);
  const localReport = buildLocalReport(facts, candidates, assessments);

  if (!OPENAI_API_KEY) {
    onProgress(4, "未設定 OpenAI Key，改用規則比對並抓取法務部正式條文");
    return await enrichWithOfficialSubLaws(localReport, facts, assessments);
  }

  try {
    // Step 3a: Prompt A — identify mother law PCode + competitor query
    onProgress(1, "OpenAI 正在辨識最相關母法與健保查詢詞");
    let pcode;
    let motherLawName;
    let competitorQuery = "";
    try {
      const promptAResult = await runPromptA(payload);
      pcode = promptAResult.pcode;
      motherLawName = promptAResult.law_name || "";
      competitorQuery = typeof promptAResult.competitor_query === "string" ? promptAResult.competitor_query.trim() : "";
    } catch (err) {
      // Fallback to top assessment law
      const topAssessment = assessments[0];
      if (!topAssessment) throw new Error("No candidate laws found and Prompt A failed: " + err.message);
      pcode = topAssessment.law.pcode;
      motherLawName = topAssessment.law.title;
    }

    // Step 3b: Fetch mother law text
    onProgress(2, `正在從法務部下載母法全文：${motherLawName || pcode}`);
    const motherLawText = await fetchLawText(pcode);

    // Prefer the Ministry of Justice's authoritative child-law metadata.
    // Prompt B is only a fallback: a generated search tag is not necessarily
    // an exact law name and therefore cannot be the primary lookup key.
    onProgress(3, "正在讀取母法授權依據與授權子法清單");
    const authorizedSubLaws = await fetchAuthorizedSubLaws(pcode);
    let subLawRefs = [];
    if (!authorizedSubLaws.length) {
      try {
        subLawRefs = await runPromptB(motherLawText, motherLawName || pcode, pcode);
      } catch {
        subLawRefs = [];
      }
    }

    // Resolve and fetch relevant child statutes in parallel.
    const selectedAuthorized = rankAuthorizedSubLaws(authorizedSubLaws, facts).slice(0, 6);
    const fallbackTags = subLawRefs.slice(0, 4).map((ref) => ref.search_tag).filter(Boolean);
    onProgress(4, `正在下載並逐條比對 ${selectedAuthorized.length || fallbackTags.length} 部候選子法`);
    const subLawResults = await Promise.allSettled(
      (selectedAuthorized.length ? selectedAuthorized : fallbackTags.map((tag) => ({ title: tag }))).map(async (ref) => {
        const subPcode = ref.pcode || await findPcodeByName(ref.title);
        if (!subPcode) return null;
        const text = await fetchLawText(subPcode);
        return { tag: ref.title, title: ref.title, article: ref.article || "授權子法", pcode: subPcode, text };
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
    const profile = ROLE_PROFILES[facts.jobFunction] || null;

    // Step 3e-2: Look up NHI-reimbursed competitors using the query Prompt A
    // extracted, and prepare a grounded data block for Prompt C.
    let nhiCompetitors = null;
    if (competitorQuery && competitorQuery.length >= 2) {
      const searchResult = searchNhiDrugs(competitorQuery);
      if (!searchResult.error) {
        nhiCompetitors = { query: competitorQuery, meta: searchResult.meta, items: searchResult.items };
      }
    }
    let competitorText = "";
    if (nhiCompetitors && nhiCompetitors.items.length > 0) {
      const lines = nhiCompetitors.items
        .slice(0, 10)
        .map((i) => `- ${i.zh}（${i.en}）｜成分 ${i.ing}｜劑型 ${i.form}｜健保支付價 ${i.price}｜藥商 ${i.vendor}｜ATC ${i.atc}`);
      competitorText = `\n\n以下是健保署開放資料「健保用藥品項檔」（快照日期 ${nhiCompetitors.meta.generatedAt}）中查得的同類已收載品項，引用競品給付現況時只能使用下列品項與數字，不得自行補充其他品項或價格：\n${lines.join("\n")}`;
    }

    // Build the official article blocks first, assign immutable IDs, then give
    // each model only the amount of text needed for its task. This avoids
    // sending the same 20k-character statute bundle four times and prevents
    // model-generated PCode/article formatting from breaking the merge.
    onProgress(5, "正在建立法條固定 ID 與精簡 AI 上下文");
    const groundedReport = await enrichWithOfficialSubLaws(localReport, facts, assessments);
    const groundedLaws = assignAiBlockIds(groundedReport.applicable_laws);
    const applicabilityContext = buildCompactLawContext(groundedLaws, { limit: 24, articleChars: 480 });
    const summaryContext = buildCompactLawContext(groundedLaws, { limit: 18, articleChars: 720 });
    const answersContext = buildCompactLawContext(groundedLaws, { limit: 14, articleChars: 560 });
    const flowchartContext = buildCompactLawContext(groundedLaws, { limit: 10, articleChars: 420 });

    // Step 3f: Run four independent model jobs in parallel. Luna handles
    // applicability, direct Q&A, competitor-query extraction and the compact
    // flowchart; Sol is reserved for summaries and article-specific actions.
    onProgress(5, "平行執行：Luna 適用性、問答、競品與流程圖；Sol 摘要與待辦");
    const [resultApplicability, resultSummary, resultD, resultAnswers] = await Promise.allSettled([
      trackAiJob(
        runPromptApplicability(applicabilityContext, role, scenario, profile),
        "Luna 適用性判斷已完成",
        "Luna 適用性判斷失敗，將使用本地備援",
        onProgress
      ),
      trackAiJob(
        runPromptSummary(summaryContext, role, scenario, profile),
        "Sol 摘要與待辦已完成",
        "Sol 摘要失敗，將改用 Sol 格式備援",
        onProgress
      ),
      trackAiJob(
        runPromptD(flowchartContext, role, scenario, profile),
        "Luna 精簡流程圖已完成",
        "Luna 流程圖失敗，將使用本地備援",
        onProgress
      ),
      trackAiJob(
        runPromptAnswersAndCompetitor(answersContext, role, scenario, profile, competitorText),
        "Luna 直接問答與競品查詢詞已完成",
        "Luna 問答與競品查詢失敗，將顯示本地備援",
        onProgress
      ),
    ]);

    onProgress(6, "四項 AI 工作完成，正在合併 Sol 摘要與 Luna 問答、競品及適用性判斷");
    const applicabilityData = resultApplicability.status === "fulfilled" ? resultApplicability.value : null;
    const summaryData = resultSummary.status === "fulfilled" ? resultSummary.value : null;
    const promptDData = resultD.status === "fulfilled" ? resultD.value : null;
    const answersData = resultAnswers.status === "fulfilled" ? resultAnswers.value : null;

    // Prompt A may leave the competitor query empty for broad product
    // descriptions. The dedicated Luna job gets a second chance to derive an
    // INN or ATC prefix, while the rows still come from the local NHIA snapshot.
    const lunaCompetitorQuery = typeof answersData?.competitor_query === "string"
      ? answersData.competitor_query.trim()
      : "";
    if (!nhiCompetitors && lunaCompetitorQuery.length >= 2) {
      const searchResult = searchNhiDrugs(lunaCompetitorQuery);
      if (!searchResult.error) {
        nhiCompetitors = {
          query: lunaCompetitorQuery,
          meta: searchResult.meta,
          items: searchResult.items,
        };
      }
    }

    // Step 3g: Keep the official Ministry of Justice article blocks as the
    // canonical UI records. Model output is useful for reasoning, but models
    // may omit UI fields or combine several article numbers into one record.
    // The grounded blocks always contain one official article, confidence,
    // role summary and checklist, so the OpenAI and fallback paths render alike.
    onProgress(7, "正在合併三階段精簡流程圖與逐條重點");
    const judgedLaws = mergeAiApplicability(
      groundedLaws,
      applicabilityData?.applicable_laws
    );
    const applicable_laws = mergeAiLawInsights(
      judgedLaws,
      summaryData?.law_insights,
      facts
    );

    const summary_and_checklist = normalizeSummary(
      summaryData || applicabilityData
        ? {
            role: summaryData?.role || role,
            summary_points: summaryData?.summary_points,
            checklist: summaryData?.checklist,
            missing_facts: applicabilityData?.missing_facts,
          }
        : null,
      localReport.summary_and_checklist
    );

    const process_stages = normalizeStages(
      Array.isArray(promptDData) && promptDData.length > 0 ? promptDData : null,
      localReport.process_stages
    );

    const normalizedDirectAnswers = answersData && Array.isArray(answersData.direct_answers)
      ? answersData.direct_answers
          .filter((a) => a && typeof a === "object" && a.question && a.answer)
          .slice(0, 6)
          .map((a) => ({
            question: String(a.question),
            answer: String(a.answer),
            grounding: ["law", "nhi_data", "not_available"].includes(a.grounding) ? a.grounding : "not_available",
          }))
      : [];
    const direct_answers = normalizedDirectAnswers.length
      ? normalizedDirectAnswers
      : localReport.direct_answers;

    onProgress(8, "正在核對法務部來源並依適用性與信心度排序");
    const completedReport = {
      mode: "pipeline",
      model: `${OPENAI_MODEL} + ${OPENAI_SUMMARY_MODEL}`,
      analyzedAt: new Date().toISOString(),
      facts,
      candidates: candidates.slice(0, 7),
      assessments,
      confidence: calculateOverallConfidence(assessments),
      applicable_laws,
      summary_and_checklist,
      process_stages,
      traceability: buildTraceability(assessments),
      nhi_competitors: nhiCompetitors,
      direct_answers,
    };
    onProgress(9, "分析完成，正在顯示可追溯報告");
    return completedReport;
  } catch (err) {
    return { ...localReport, mode: "ai_failed_fallback", aiError: err.message };
  }
}

function findMatchingAiLaw(law, aiItems) {
  const blockId = String(law.block_id || "").trim().toUpperCase();
  if (blockId) {
    const blockMatch = aiItems.find(
      (item) => String(item?.block_id || "").trim().toUpperCase() === blockId
    );
    if (blockMatch) return blockMatch;
  }
  const articleNumber = String(law.article || "").match(/\d+/)?.[0];
  return aiItems.find((item) => {
    if (!item || String(item.pcode || "").trim().toUpperCase() !== String(law.pcode || "").trim().toUpperCase()) return false;
    if (!articleNumber) return false;
    return String(item.article || "").match(/\d+/)?.[0] === articleNumber;
  });
}

function assignAiBlockIds(laws) {
  return (Array.isArray(laws) ? laws : []).map((law, index) => ({
    ...law,
    block_id: `B${String(index + 1).padStart(2, "0")}`,
  }));
}

function buildCompactLawContext(laws, { limit = 16, articleChars = 650 } = {}) {
  return (Array.isArray(laws) ? laws : [])
    .slice(0, limit)
    .map((law) => {
      const text = String(law.article_text || "").replace(/\s+/g, " ").trim().slice(0, articleChars);
      const relation = law.relation_reason ? `\n關聯原因：${law.relation_reason}` : "";
      return `[${law.block_id}] ${law.law_name}｜${law.pcode}｜${law.article}\n${text}${relation}`;
    })
    .join("\n\n");
}

function trackAiJob(promise, successMessage, failureMessage, onProgress) {
  return promise.then(
    (value) => {
      onProgress(5, successMessage);
      return value;
    },
    (error) => {
      onProgress(5, `${failureMessage}：${error.message}`);
      throw error;
    }
  );
}

function mergeAiApplicability(groundedLaws, aiLaws) {
  const aiItems = Array.isArray(aiLaws) ? aiLaws : [];
  const allowed = ["likely_applicable", "potentially_applicable", "needs_more_information"];
  return (Array.isArray(groundedLaws) ? groundedLaws : []).map((law) => {
    const ai = findMatchingAiLaw(law, aiItems);
    const aiConfidence = Number(ai?.confidence);
    return {
      ...law,
      applicability: allowed.includes(ai?.applicability) ? ai.applicability : law.applicability,
      confidence: Number.isFinite(aiConfidence) && aiConfidence >= 0 && aiConfidence <= 100
        ? Math.round(aiConfidence)
        : law.confidence,
    };
  });
}

function mergeAiLawInsights(groundedLaws, aiLaws, facts) {
  const aiItems = Array.isArray(aiLaws) ? aiLaws : [];
  return (Array.isArray(groundedLaws) ? groundedLaws : []).map((law) => {
    const ai = findMatchingAiLaw(law, aiItems);
    const fallbackSummary = buildRoleSummary(law.article_text, facts, law);
    const fallbackChecklist = buildArticleChecklist(law.article_text, facts, law);
    return {
      ...law,
      role_summary: String(ai?.role_summary || fallbackSummary),
      checklist: Array.isArray(ai?.checklist) && ai.checklist.length
        ? ai.checklist.map(String).slice(0, 4)
        : fallbackChecklist,
      insight_source: ai ? "sol" : "sol_style_fallback",
      confidence: Number.isFinite(Number(law.confidence)) ? Number(law.confidence) : 60,
    };
  });
}

// ---------------------------------------------------------------------------
// NHI drug snapshot — competitor / reimbursement lookup backed by the NHIA
// open dataset (built by scripts/build-nhi-snapshot.js). Data, not law: the
// endpoint always returns the dataset provenance so the UI can cite it.
// ---------------------------------------------------------------------------

let nhiSnapshotCache; // undefined = not loaded; null = missing/unreadable

function loadNhiSnapshot() {
  if (nhiSnapshotCache !== undefined) return nhiSnapshotCache;
  try {
    nhiSnapshotCache = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "nhi-drugs.json"), "utf8"));
  } catch {
    nhiSnapshotCache = null;
  }
  return nhiSnapshotCache;
}

function searchNhiDrugs(q) {
  const snapshot = loadNhiSnapshot();
  if (!snapshot) return { error: "snapshot_missing", items: [] };
  if (!q || q.length < 2) return { meta: snapshot.meta, items: [], note: "query_too_short" };
  const upper = q.toUpperCase();
  const matches = [];
  for (const item of snapshot.items) {
    // Items with a 0.00 payment price have no effective NHI price and are
    // useless as competitor pricing references — skip them.
    const price = parseFloat(item.price);
    if (!Number.isFinite(price) || price <= 0) continue;
    if (
      (item.atc && item.atc.toUpperCase().startsWith(upper)) ||
      (item.ing && item.ing.toUpperCase().includes(upper)) ||
      (item.en && item.en.toUpperCase().includes(upper)) ||
      (item.zh && item.zh.includes(q))
    ) {
      matches.push({ item, price });
    }
  }
  // Highest price first: newer originator drugs surface before legacy
  // generics, which matches the competitor-pricing use case.
  matches.sort((a, b) => b.price - a.price);
  const seen = new Set();
  const items = [];
  for (const match of matches) {
    const key = `${match.item.zh}|${match.item.ing}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(match.item);
    if (items.length >= 30) break;
  }
  return { meta: snapshot.meta, items };
}

// ---------------------------------------------------------------------------
// Semantic retrieval — rank mother laws by embedding similarity before
// handing Prompt A its reference list, so the shortlist scales with the
// corpus instead of being a fixed hand-typed list.
// ---------------------------------------------------------------------------

let motherLawEmbeddingsCache = null; // null = not built yet; false = build failed, don't retry every request

async function embedTexts(texts) {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: OPENAI_EMBEDDING_MODEL, input: texts }),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.error?.message || `OpenAI embedding 請求失敗：${response.status}`);
  return json.data.map((item) => item.embedding);
}

function cosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function ensureMotherLawEmbeddings() {
  if (motherLawEmbeddingsCache) return motherLawEmbeddingsCache;
  if (motherLawEmbeddingsCache === false || !OPENAI_API_KEY) return null;
  const motherLaws = LAW_INDEX.filter((l) => l.level === "母法");
  try {
    const vectors = await embedTexts(motherLaws.map((l) => `${l.title}：${l.articleText}`));
    motherLawEmbeddingsCache = motherLaws.map((law, i) => ({ law, vector: vectors[i] }));
    return motherLawEmbeddingsCache;
  } catch {
    motherLawEmbeddingsCache = false;
    return null;
  }
}

async function rankMotherLawsBySimilarity(queryText) {
  const cache = await ensureMotherLawEmbeddings();
  if (!cache) return null;
  try {
    const [queryVector] = await embedTexts([queryText]);
    return cache
      .map((entry) => ({ law: entry.law, similarity: cosineSimilarity(queryVector, entry.vector) }))
      .sort((a, b) => b.similarity - a.similarity)
      .map((entry) => entry.law);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Reverse compliance check — screen promotional copy against 藥事法第七章.
// Structural rules that can be decided from the declared context are evaluated
// deterministically; only the judgement calls about wording go to the model.
// User content is processed in memory and never written to disk or logged.
// ---------------------------------------------------------------------------

const AD_CHAPTER_URL = "https://law.moj.gov.tw/LawClass/LawParaDeatil.aspx?pcode=L0030001&bp=8";
const AD_CHAPTER_CACHE_KEY = "ad-chapter-7";
const MAX_CONTENT_CHARS = 20000;

async function fetchAdChapterText() {
  const cached = cacheGet(lawTextCache, AD_CHAPTER_CACHE_KEY);
  if (cached !== undefined) return cached;
  try {
    const text = parseLawHtml(await httpGet(AD_CHAPTER_URL));
    if (text) cacheSet(lawTextCache, AD_CHAPTER_CACHE_KEY, text);
    return text;
  } catch {
    const entry = LAW_INDEX.find((l) => l.id === "drug-ad");
    return entry ? `【${entry.title}】\n${entry.article}: ${entry.articleText}` : "";
  }
}

// Article 67 restricts prescription-drug advertising to academic medical
// publications, and articles 65/66 require an authorised drug seller with a
// pre-approved advertisement — all decidable from the declared context alone.
function structuralAdFindings({ productType, channel, hasLicense, isDrugSeller, adApproved }) {
  const findings = [];
  // 食藥署明示刊播媒介包含網際網路，故網站與社群一律視為消費者通路。
  const consumerChannels = ["mass_media", "social_media", "outdoor", "website"];
  // 再生醫療製劑須由醫師處方，其許可證載明後同受第67條拘束。
  const prescriptionLike = productType === "prescription_drug" || productType === "cell_therapy";
  const productLabel = productType === "cell_therapy" ? "再生醫療製劑" : "處方藥";

  if (prescriptionLike && consumerChannels.includes(channel)) {
    findings.push({
      article: "藥事法第67條",
      severity: "violation",
      excerpt: "（依您填寫的產品類型與投放通路判定）",
      reason:
        `須由醫師處方之藥物，其廣告以登載於學術性醫療刊物為限；食品藥物管理署明示刊播媒介亦包含網際網路。本案為${productLabel}並投放於一般消費者通路，屬條文明文禁止之情形，與文案用字無關。`,
    });
  }

  if (prescriptionLike && channel === "professional") {
    findings.push({
      article: "藥事法第67條",
      severity: "risk",
      excerpt: "（依您填寫的產品類型與投放通路判定）",
      reason:
        `第67條限定之管道為「學術性醫療刊物」，指的是刊物本身；研討會、業務拜訪等專業場合並非刊物，食品藥物管理署對處方藥於學術性醫療刊物以外之廣告類別採否定見解。本案為${productLabel}，須先確認該素材屬於學術資訊或仿單資料（非廣告），或改於學術性醫療刊物刊登。`,
    });
  }
  if (hasLicense === false) {
    findings.push({
      article: "藥事法第66條",
      severity: "violation",
      excerpt: "（依您填寫的藥證狀態判定）",
      reason: "尚未取得藥品許可證之產品無法取得廣告核准；於取證前刊播藥物廣告不符第66條事前核准規定。",
    });
  }
  if (isDrugSeller === false) {
    findings.push({
      article: "藥事法第65條",
      severity: "violation",
      excerpt: "（依您填寫的刊登者身分判定）",
      reason: "非藥商不得為藥物廣告。刊登者非領有藥商許可執照者，不得刊播本文案。",
    });
  }
  if (adApproved === false) {
    findings.push({
      article: "藥事法第66條",
      severity: "note",
      excerpt: "（依您填寫的送審狀態判定）",
      reason:
        "藥物廣告應於刊播前將所有文字、圖畫或言詞送中央或直轄市衛生主管機關核准。本檢查為送審前自我檢視，不能取代法定核准程序。",
    });
  }
  return findings;
}

async function checkAdCompliance(payload) {
  const content = String(payload.content || "").slice(0, MAX_CONTENT_CHARS).trim();
  if (!content) return { error: "empty_content", message: "請提供要檢查的文案內容。" };

  const context = {
    productType: payload.product_type || "prescription_drug",
    channel: payload.channel || "mass_media",
    hasLicense: payload.has_license === undefined ? null : Boolean(payload.has_license),
    isDrugSeller: payload.is_drug_seller === undefined ? null : Boolean(payload.is_drug_seller),
    adApproved: payload.ad_approved === undefined ? null : Boolean(payload.ad_approved),
  };

  const structural = structuralAdFindings(context);
  const lawText = await fetchAdChapterText();

  if (!OPENAI_API_KEY) {
    return {
      mode: "structural_only",
      checkedAt: new Date().toISOString(),
      context,
      structural_findings: structural,
      text_findings: [],
      note: "未設定 AI 金鑰，僅執行可由填寫條件判定的結構性檢查，未進行文字內容判讀。",
    };
  }

  let textFindings = [];
  let mode = "full";
  try {
    const result = await runAdCompliancePrompt(content, lawText, context);
    textFindings = Array.isArray(result?.findings) ? result.findings : [];
  } catch (err) {
    mode = "structural_only_ai_failed";
    textFindings = [];
    return {
      mode,
      checkedAt: new Date().toISOString(),
      context,
      structural_findings: structural,
      text_findings: [],
      aiError: err.message,
    };
  }

  const allowed = ["violation", "risk", "note"];
  const sanitized = textFindings
    .filter((f) => f && f.excerpt && f.reason)
    .slice(0, 20)
    .map((f) => ({
      excerpt: String(f.excerpt).slice(0, 300),
      article: String(f.article || "藥事法第七章"),
      severity: allowed.includes(f.severity) ? f.severity : "risk",
      reason: String(f.reason).slice(0, 600),
    }));

  return {
    mode,
    model: OPENAI_MODEL,
    checkedAt: new Date().toISOString(),
    context,
    structural_findings: structural,
    text_findings: sanitized,
  };
}

async function runAdCompliancePrompt(content, lawText, context) {
  const channelLabels = {
    mass_media: "大眾媒體（電視、報章雜誌等）",
    social_media: "社群媒體／網紅內容",
    academic_journal: "學術性醫療刊物",
    outdoor: "戶外廣告",
    website: "公司網站／消費者可見網頁",
    professional: "醫療專業人員場合",
  };

  const input = `以下是藥事法第七章「藥物廣告之管理」的條文全文：

${lawText}

本案背景：
- 產品類型：${translateProductType(context.productType)}
- 投放通路：${channelLabels[context.channel] || context.channel}

以下是待檢查的文案內容：
---
${content}
---

請逐段檢視文案，找出可能牴觸上述條文的表述。特別注意：
- 第68條：假借他人名義宣傳、利用書刊資料保證效能、藉採訪或報導形式宣傳、其他不正當方式
- 第69條：非藥物不得為醫療效能之標示或宣傳
- 第70條：內容若暗示或影射醫療效能，即使以採訪、報導或衛教形式呈現，仍視為藥物廣告

請嚴格以 JSON 輸出：
{"findings": [{"excerpt": "文案中的原文片段（必須逐字引用，不可改寫）", "article": "所涉條文，如 藥事法第68條第3款", "severity": "violation | risk | note", "reason": "說明為何有疑慮，並對應條文內容"}]}

規則：
- excerpt 必須是文案中實際出現的字句，逐字引用。
- 只能引用上方提供的條文，不得引用未出現於上方全文的法條。
- severity 僅在條文明文禁止且文案明確踩線時使用 violation；語意模糊、需人工判斷者用 risk；僅屬提醒性質用 note。
- 若文案沒有明顯問題，findings 回傳空陣列，不要為了湊數而虛構問題。
只輸出 JSON。`;

  const text = await callOpenAI({
    instructions:
      "你是台灣藥物廣告法規審查專家。只根據提供的藥事法條文判斷，不得引用其他法規或自行推論未載明的規定。逐字引用文案原文作為佐證。只輸出 JSON。",
    input,
  });
  return parseJsonObject(text);
}

// ---------------------------------------------------------------------------
// Prompt A — identify mother law PCode from user intent + role + law_type
// ---------------------------------------------------------------------------

const MOTHER_LAW_OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["pcode", "law_name", "competitor_query"],
  properties: {
    pcode: { type: "string" },
    law_name: { type: "string" },
    competitor_query: { type: "string" },
  },
};

const SUB_LAW_OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["sub_laws"],
  properties: {
    sub_laws: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["source_law", "article", "search_tag"],
        properties: {
          source_law: { type: "string" },
          article: { type: "string" },
          search_tag: { type: "string" },
        },
      },
    },
  },
};

async function runPromptA(payload) {
  const userIntent = payload.user_intent || payload.scenario || "";
  const role = payload.role || "進口代理商";
  const lawType = Array.isArray(payload.law_type) ? payload.law_type.join("、") : (payload.law_type || "查驗登記");

  const rankedMotherLaws = await rankMotherLawsBySimilarity(`${userIntent} 角色:${role} 法規類型:${lawType}`);
  const motherLaws = rankedMotherLaws ? rankedMotherLaws.slice(0, 5) : LAW_INDEX.filter((l) => l.level === "母法");
  const lawListText = motherLaws
    .map((l) => `- ${l.title} (PCode: ${l.pcode})`)
    .join("\n");

  const input = `請分析使用者的情境：'${userIntent}'，並參考其角色定位 '${role}' 與法規類型 '${lawType}'，判斷其對應的台灣生醫法規 PCode。

另外，若情境提及具體藥品類別、成分或適應症，請輸出一個可用於台灣健保用藥品項檔查詢的字串 competitor_query：優先使用 ATC 分類碼前綴（例如降血糖藥→A10、降血壓藥→C02、抗腫瘤藥→L01），或英文主成分名（INN，例如 PEMBROLIZUMAB）。無法判斷時輸出空字串。

請嚴格以 JSON 格式輸出：{"pcode": "法規代碼", "law_name": "母法名稱", "competitor_query": "ATC碼前綴或英文成分名或空字串"}。

以下為依語意相關性排序、最可能相關的母法清單供參考：
${lawListText}`;

  const text = await callOpenAI({
    instructions:
      "你是台灣生醫法規專家。請根據使用者情境判斷最相關的母法 PCode 與健保品項查詢字串，只輸出 JSON，不要有其他說明。",
    input,
    model: OPENAI_FAST_MODEL,
    schemaName: "rxplain_mother_law",
    jsonSchema: MOTHER_LAW_OUTPUT_SCHEMA,
    maxOutputTokens: 900,
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

async function runPromptB(motherLawText, lawName, cacheKey) {
  if (cacheKey) {
    const cached = cacheGet(subLawCache, cacheKey);
    if (cached !== undefined) return cached;
  }

  const input = `以下是母法「${lawName}」的全文：

${motherLawText}

請找出其中授權訂定子法的條文，例如含有「由中央主管機關定之」、「另以辦法定之」、「依法訂定」等授權語句的條文，並輸出含有 sub_laws 陣列的 JSON 物件，每筆包含：
- source_law: 母法名稱
- article: 條文編號
- search_tag: 被授權子法的可能名稱或關鍵字（用於搜尋）

只輸出 JSON 物件，不要有其他說明。`;

  const text = await callOpenAI({
    instructions:
      "你是台灣法規文本分析專家。請從母法條文中識別授權子法的條款，只輸出符合指定結構的 JSON。",
    input,
    model: OPENAI_FAST_MODEL,
    schemaName: "rxplain_sub_laws",
    jsonSchema: SUB_LAW_OUTPUT_SCHEMA,
    maxOutputTokens: 1800,
  });

  const result = parseJsonObject(text);
  const refs = Array.isArray(result?.sub_laws) ? result.sub_laws.slice(0, 4) : [];
  if (cacheKey && refs.length) cacheSet(subLawCache, cacheKey, refs);
  return refs;
}

// ---------------------------------------------------------------------------
// Prompt C1 (Luna) — applicability and missing facts
// ---------------------------------------------------------------------------

const APPLICABILITY_OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["applicable_laws", "missing_facts"],
  properties: {
    applicable_laws: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["block_id", "applicability", "confidence"],
        properties: {
          block_id: { type: "string" },
          applicability: {
            type: "string",
            enum: ["likely_applicable", "potentially_applicable", "needs_more_information"],
          },
          confidence: { type: "integer", minimum: 0, maximum: 100 },
        },
      },
    },
    missing_facts: { type: "array", items: { type: "string" } },
  },
};

const SUMMARY_OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["role", "summary_points", "checklist", "law_insights"],
  properties: {
    role: { type: "string" },
    summary_points: { type: "array", items: { type: "string" } },
    checklist: { type: "array", items: { type: "string" } },
    law_insights: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["block_id", "role_summary", "checklist"],
        properties: {
          block_id: { type: "string" },
          role_summary: { type: "string" },
          checklist: { type: "array", items: { type: "string" } },
        },
      },
    },
  },
};

const ANSWERS_OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["direct_answers", "competitor_query"],
  properties: {
    direct_answers: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["question", "answer", "grounding"],
        properties: {
          question: { type: "string" },
          answer: { type: "string" },
          grounding: { type: "string", enum: ["law", "nhi_data", "not_available"] },
        },
      },
    },
    competitor_query: { type: "string" },
  },
};

const FLOWCHART_OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["process_stages"],
  properties: {
    process_stages: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["stage_title", "law_name", "control_points", "owner"],
        properties: {
          stage_title: { type: "string" },
          law_name: { type: "string" },
          control_points: { type: "array", items: { type: "string" } },
          owner: { type: "string" },
        },
      },
    },
  },
};

async function runPromptApplicability(lawContext, role, scenario, profile) {
  const roleLabel = profile ? `${role}（${profile.label} 視角）` : role;
  const input = `以下是使用者實際描述的情境與需求：
${scenario || "（使用者未提供詳細描述）"}

以下是與本案相關的法規全文：

${lawContext}

請只判斷哪些單一法條適用於角色「${roleLabel}」，以及尚缺哪些會改變適用性判斷的事實。輸出：
{
  "applicable_laws": [
    {
      "block_id": "原文標示的固定區塊 ID，例如 B01",
      "applicability": "likely_applicable | potentially_applicable | needs_more_information",
      "confidence": 85
    }
  ],
  "missing_facts": ["尚缺資訊1", "尚缺資訊2"]
}

applicable_laws 的規則：每一筆只能引用一個既有 block_id，不得自行改寫 ID，也不得新增不存在的法條。
只輸出 JSON，不要有其他說明。`;

  const text = await callOpenAI({
    instructions: "你是台灣生醫法規適用性分析員。只根據提供的法規與情境判斷，不撰寫摘要或待辦。每筆只列一條法條，只輸出 JSON。",
    input,
    model: OPENAI_MODEL,
    schemaName: "rxplain_applicability",
    jsonSchema: APPLICABILITY_OUTPUT_SCHEMA,
    maxOutputTokens: 2400,
  });

  return parseJsonObject(text);
}

// ---------------------------------------------------------------------------
// Prompt C2 (Sol) — summaries and article-specific actions
// ---------------------------------------------------------------------------

async function runPromptSummary(lawContext, role, scenario, profile) {
  const roleLabel = profile ? `${role}（${profile.label} 視角）` : role;
  const input = `使用者情境：
${scenario || "（使用者未提供詳細描述）"}

法規全文：
${lawContext}

請針對角色「${roleLabel}」輸出：
{
  "role": "角色",
  "summary_points": ["最重要的情境化重點，最多5點"],
  "checklist": ["跨法規總待辦，最多8點"],
  "law_insights": [
    {
      "block_id": "原文標示的固定區塊 ID，例如 B01",
      "role_summary": "本條對角色的具體影響",
      "checklist": ["直接取自本條義務的具體待辦，最多4點"]
    }
  ]
}

law_insights 每筆只能對應一個既有 block_id，且應盡量涵蓋所有提供的區塊。待辦必須寫出條文中的具體對象、資料欄位、期限、文件或責任，不得只寫「確認符合法規」「建立紀錄」「請法務複核」等通用句。
只輸出 JSON。`;

  const baseInstructions =
    "你是台灣生醫法規資深顧問。只根據提供資料，為使用者產生精準、可執行的繁體中文摘要與逐條待辦清單。只輸出 JSON。";
  const text = await callOpenAI({
    instructions: profile ? `${baseInstructions}\n\n職能視角要求：${profile.promptC}` : baseInstructions,
    input,
    model: OPENAI_SUMMARY_MODEL,
    schemaName: "rxplain_summary",
    jsonSchema: SUMMARY_OUTPUT_SCHEMA,
    maxOutputTokens: 6500,
  });
  return parseJsonObject(text);
}

// ---------------------------------------------------------------------------
// Prompt C3 (Luna) — direct answers and competitor-query extraction
// ---------------------------------------------------------------------------

async function runPromptAnswersAndCompetitor(lawContext, role, scenario, profile, competitorText) {
  const roleLabel = profile ? `${role}（${profile.label} 視角）` : role;
  const competitorContext = competitorText || "\n\n目前尚未取得競品資料；不得自行虛構品項或價格。";
  const input = `使用者情境與實際提問：
${scenario || "（使用者未提供詳細描述）"}

角色：${roleLabel}

法規全文：
${lawContext}${competitorContext}

請輸出：
{
  "direct_answers": [
    {"question": "將使用者的複合問題拆成清楚子問題", "answer": "依據資料直接回答", "grounding": "law | nhi_data | not_available"}
  ],
  "competitor_query": "適合查詢健保用藥品項檔的 ATC 前綴或英文主成分 INN；無法判斷才留空"
}

direct_answers 最多 5 筆，必須涵蓋使用者提出的查驗、品質、供應來源、物流或資料保存問題。能由法規回答標 law；能由提供的健保資料回答標 nhi_data；資料不足標 not_available 並明確說明缺少什麼。
competitor_query 優先使用具體 INN；未提供成分但明確提及癌症治療時可用 L01。不得虛構競品、價格或法條。只輸出 JSON。`;

  const text = await callOpenAI({
    instructions: "你是台灣生醫法規問答與健保競品查詢助手。使用繁體中文，只依提供資料直接回答，並產生一個可用的健保查詢詞。只輸出 JSON。",
    input,
    model: OPENAI_MODEL,
    schemaName: "rxplain_answers",
    jsonSchema: ANSWERS_OUTPUT_SCHEMA,
    maxOutputTokens: 3200,
  });
  return parseJsonObject(text);
}

// ---------------------------------------------------------------------------
// Prompt D — process stages (exactly 3 stages)
// ---------------------------------------------------------------------------

async function runPromptD(lawContext, role, scenario, profile) {
  const roleLabel = profile ? `${role}（${profile.label} 視角）` : role;
  const stageGuidance = profile ? `\n\n階段切分要求：${profile.promptD}` : "";
  const input = `以下是使用者實際描述的情境與需求：
${scenario || "（使用者未提供詳細描述）"}

以下是與本案相關的法規全文：

${lawContext}

請根據以上法規內容，並緊扣使用者描述的實際情境與需求，針對角色「${roleLabel}」，輸出含有 process_stages 的 JSON 物件，其中 process_stages 恰好包含 3 個作業階段，每個階段包含：
- stage_title: 階段名稱（例如「【源頭管理】供應來源確認」）
- law_name: 該階段依據的主要法規名稱
- control_points: 該階段最重要的 2 至 3 個查核重點（字串陣列，每點 30 字以內）
- owner: 負責單位或角色${stageGuidance}

每個階段只保留必要資訊，階段名稱 24 字以內、主要法規只列 1 至 2 部，不得把整段法規摘要塞入流程圖。

只輸出 JSON 物件，不要有其他說明。`;

  const text = await callOpenAI({
    instructions:
      "你是台灣生醫法規顧問。請根據提供的法規內容規劃 3 個作業階段，只輸出符合指定結構的 JSON。",
    input,
    model: OPENAI_MODEL,
    schemaName: "rxplain_flowchart",
    jsonSchema: FLOWCHART_OUTPUT_SCHEMA,
    maxOutputTokens: 2400,
  });

  const result = parseJsonObject(text);
  if (!Array.isArray(result?.process_stages)) return null;
  return result.process_stages;
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

function decodeHtml(text) {
  return String(text || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchAuthorizedSubLaws(pcode) {
  const cached = cacheGet(authorizedSubLawCache, pcode);
  if (cached !== undefined) return cached;

  try {
    const html = await httpGet(`https://law.moj.gov.tw/LawClass/LawSlaveAll.aspx?pcode=${encodeURIComponent(pcode)}`);
    const rows = html.match(/<tr\b[\s\S]*?<\/tr>/gi) || [];
    const results = [];
    for (const row of rows) {
      const child = row.match(/LawAll\.aspx\?pcode=([A-Z][0-9A-Z]{7})[^>]*>([\s\S]*?)<\/a>/i);
      if (!child || child[1].toUpperCase() === pcode.toUpperCase()) continue;
      const articleMatch = row.match(/LawSingle\.aspx\?[^"']*flno=(\d+)[^>]*>([\s\S]*?)<\/a>/i);
      const rawTitle = decodeHtml(child[2]);
      const title = rawTitle.replace(/（民國\s*\d+\s*年[\s\S]*?）\s*$/, "").trim();
      if (!title || results.some((item) => item.pcode === child[1].toUpperCase())) continue;
      results.push({
        pcode: child[1].toUpperCase(),
        title,
        article: articleMatch ? decodeHtml(articleMatch[2]) : "授權子法",
        parentPcode: pcode,
        source_url: `https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=${child[1].toUpperCase()}`,
      });
    }
    if (results.length) cacheSet(authorizedSubLawCache, pcode, results);
    return results;
  } catch {
    return [];
  }
}

function rankAuthorizedSubLaws(items, facts) {
  const scenario = `${facts.rawScenario || ""} ${(facts.lawTypes || []).join(" ")} ${(facts.activities || []).join(" ")}`;
  const keywordGroups = [
    ["查驗", "審查", "登記", "許可"], ["運輸", "運銷", "物流", "流向", "保存"],
    ["製造", "GMP", "品質"], ["安全", "監視", "不良"], ["來源", "提供者", "細胞", "組織"],
    ["廣告", "招募"], ["費", "收費"],
  ];
  return items
    .map((item, index) => {
      let score = -index / 100;
      for (const group of keywordGroups) {
        if (group.some((word) => scenario.includes(word)) && group.some((word) => item.title.includes(word))) score += 10;
      }
      return { ...item, relevanceScore: score };
    })
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
}

function extractLawArticles(text) {
  const cleaned = String(text || "").replace(/\s+/g, " ").trim();
  const heading = /第\s*\d+(?:\s*之\s*\d+)?\s*條/g;
  const matches = [...cleaned.matchAll(heading)];
  if (!matches.length) return cleaned ? [{ article: "法規內容", text: cleaned.slice(0, 1200) }] : [];
  return matches.map((match, index) => ({
    article: match[0].replace(/\s+/g, ""),
    text: cleaned.slice(match.index + match[0].length, matches[index + 1]?.index ?? cleaned.length).trim(),
  })).filter((item) => item.text.length >= 8);
}

function buildRequirementTerms(facts) {
  const context = `${facts.rawScenario || ""} ${(facts.lawTypes || []).join(" ")} ${(facts.activities || []).join(" ")} ${facts.role || ""}`;
  const groups = [
    { triggers: ["查驗", "登記", "審查", "上市"], terms: ["查驗登記", "申請", "檢附", "文件", "資料", "審查", "許可", "展延", "變更", "移轉", "標籤", "仿單"] },
    { triggers: ["物流", "運輸", "GDP", "運銷"], terms: ["運銷", "運輸", "輸入", "儲存", "倉儲", "配送", "溫度", "流向", "保存", "紀錄", "追溯", "召回", "品質"] },
    { triggers: ["製造", "生產", "GMP"], terms: ["製造", "優良製造", "品質", "許可", "證明文件", "檢驗", "批次", "放行"] },
    { triggers: ["細胞", "再生", "組織"], terms: ["再生醫療", "細胞", "組織", "提供者", "來源", "合適性", "安全監視"] },
    { triggers: ["廣告", "衛教", "招募"], terms: ["廣告", "招募", "刊播", "核准", "宣傳"] },
    { triggers: ["健保", "給付"], terms: ["給付", "支付", "收載", "核價", "申請"] },
  ];
  return Array.from(new Set(groups.filter((group) => group.triggers.some((word) => context.includes(word))).flatMap((group) => group.terms)));
}

function parseChineseNumber(value) {
  if (/^\d+$/.test(value)) return Number(value);
  const digits = { 零: 0, 〇: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
  if (value === "十") return 10;
  if (value.includes("十")) {
    const [tens, ones] = value.split("十");
    return (tens ? digits[tens] : 1) * 10 + (ones ? digits[ones] : 0);
  }
  return digits[value] ?? null;
}

function articleNumber(article) {
  const match = String(article.article || "").match(/第(\d+)(?:之\d+)?條/);
  return match ? Number(match[1]) : null;
}

function referencedArticleNumbers(article) {
  const current = articleNumber(article);
  if (!current) return [];
  const refs = new Set();
  for (const match of article.text.matchAll(/第\s*([一二三四五六七八九十百零〇\d]+)\s*條/g)) {
    const value = parseChineseNumber(match[1]);
    if (value) refs.add(value);
  }
  if (/前條/.test(article.text)) refs.add(current - 1);
  const previousMatch = article.text.match(/前([二三四五六七八九十])條/);
  if (previousMatch) {
    const count = parseChineseNumber(previousMatch[1]) || 0;
    for (let offset = 1; offset <= count; offset += 1) refs.add(current - offset);
  }
  refs.delete(current);
  return [...refs].filter((value) => value > 0);
}

function expandArticleRelations(seedArticles, allArticles, maxArticles = 6) {
  const byNumber = new Map(allArticles.map((article) => [articleNumber(article), article]).filter(([number]) => number));
  const graph = new Map();
  const connect = (from, to) => {
    if (!byNumber.has(from) || !byNumber.has(to)) return;
    if (!graph.has(from)) graph.set(from, new Set());
    if (!graph.has(to)) graph.set(to, new Set());
    graph.get(from).add(to);
    graph.get(to).add(from);
  };
  for (const article of allArticles) {
    const from = articleNumber(article);
    for (const to of referencedArticleNumbers(article)) connect(from, to);
  }

  const chosen = new Map();
  const queue = [];
  for (const article of seedArticles) {
    const number = articleNumber(article);
    if (!number) continue;
    chosen.set(number, article);
    queue.push(number);
  }
  while (queue.length && chosen.size < maxArticles) {
    const source = queue.shift();
    for (const target of graph.get(source) || []) {
      if (chosen.has(target)) continue;
      const article = byNumber.get(target);
      chosen.set(target, {
        ...article,
        score: Math.max(article.score || 0, 6),
        relationReason: `條文關聯展開：與第${source}條相互引用或補充`,
      });
      queue.push(target);
      if (chosen.size >= maxArticles) break;
    }
  }
  return [...chosen.values()].sort((a, b) => a.index - b.index);
}

function selectRelevantLawArticles(text, facts, maxArticles = 2) {
  const terms = buildRequirementTerms(facts);
  const ranked = extractLawArticles(text).map((item, index) => {
    let score = 0;
    for (const term of terms) {
      if (item.text.includes(term)) score += term.length >= 4 ? 3 : 2;
    }
    if (/本(辦法|準則).*依.*規定訂定之[。]?$/.test(item.text) && item.text.length < 100) score -= 8;
    if (/處.*罰鍰|有下列.*情形.*處/.test(item.text)) score -= 25;
    if (item.text.length >= 40 && item.text.length <= 700) score += 1;
    return { ...item, score, index };
  }).sort((a, b) => b.score - a.score || a.index - b.index);
  const seeds = ranked.slice(0, maxArticles).sort((a, b) => a.index - b.index);
  const selected = expandArticleRelations(seeds, ranked, Math.max(6, maxArticles));
  return {
    article: selected.map((item) => item.article).join("、") || "法規內容",
    articleText: selected.map((item) => `${item.article} ${item.text}`).join("\n").slice(0, 1200),
    matchScore: selected.reduce((sum, item) => sum + Math.max(0, item.score), 0),
    articles: selected,
  };
}

const SOL_STYLE_CHECKLIST_REFERENCES = Object.freeze({
  "L0030144|第2條": [
    "按許可字號分開建檔",
    "保存各批輸入數量及報關日期",
    "保存各批製造日期及有效期間或保存期限",
    "保存組織、細胞追蹤編碼與製造廠資訊",
  ],
  "L0030144|第3條": [
    "確認代理商法律身分是否為許可所有人或其他販賣藥商",
    "保存供應商名稱、地址、聯絡人及電話",
    "保存每次進貨批號、數量、日期及效期資料",
    "保存各醫院每次交貨的批號、數量與日期",
  ],
  "L0030144|第4條": [
    "交貨文件完整標示許可字號、批號、數量、製造日期及效期",
    "與醫院確認病人層級追蹤責任及資料交接邊界",
    "避免代理商取得非必要病人個資",
  ],
  "L0030144|第5條": [
    "設定第二條及第三條資料的保存期限為產品保存期限屆至後至少三十年",
    "確保電子系統、備份與資料格式可長期讀取",
    "在原廠及物流商合約中納入長期資料提供與保存義務",
  ],
  "L0030147|第3條": [
    "確認申請時點、負責單位及核准狀態",
    "逐項準備查驗登記所需文件與資料",
    "核對標籤、仿單、包裝內容及核准版本",
  ],
  "L0030147|第6條": [
    "追蹤領取通知日起三個月期限",
    "準備核定版標籤、仿單及包裝實體或彩稿",
    "完成藥品仿單查詢平台建檔",
    "領取前備齊GMP、GDP及出產國許可製售證明",
  ],
  "L0030148|第2條": [
    "建立提供者合適性判定、篩選與測試紀錄的可稽核保存機制",
    "確認製造與品質系統涵蓋提供者合適性及感染風險管制",
  ],
  "L0030148|第3條": [
    "取得提供者篩選、測試及判定SOP",
    "確認受託機構資格及責任分工",
    "確認判定醫師具指定領域至少一年實務經驗",
    "在品質協議中納入查核權及異常通報",
  ],
  "L0030087|第2條": [
    "確認申請時點、負責單位及核准狀態",
    "逐項準備並複核申請書、證照影本、廠商基本資料及費用",
    "建立許可與檢查紀錄的可稽核保存機制",
    "確認輸入、倉儲、運輸及委外責任分工",
  ],
  "L0030087|第3條": [
    "建立許可登記事項及變更紀錄清冊",
    "變更事項發生後三十日內提出申請",
    "逐項複核變更文件並追蹤主管機關核准",
    "將法定期限納入專案時程及提醒",
  ],
  "L0030087|第4條": [
    "在許可有效期屆滿前三個月啟動展延申請",
    "備妥原許可執照、費用及展延所需資料",
    "保存展延審查與核准紀錄",
  ],
  "L0030057|第3條": [
    "確認申請時點、負責單位及核准狀態",
    "逐項準備申請表與附件並依指定語言及格式提交",
    "核對標籤、仿單與包裝內容及核准版本",
    "將補件或法定期限納入專案時程並設定提醒",
  ],
});

const SOL_STYLE_SUMMARY_REFERENCES = Object.freeze({
  "L0030144|第2條": "若{role}是再生醫療製劑許可所有人，須依各許可證／許可字號分開建檔，逐批保存輸入、報關、製造與效期資料，並保留組織／細胞追蹤編碼、製造廠及供應流向資訊。",
  "L0030144|第3條": "若{role}不是許可所有人而是從事販賣的藥商，仍須自行保存供應商、每次進貨批號與效期，以及供應醫院的對象、數量與交貨日期。",
  "L0030144|第4條": "本條直接義務人是使用製劑的醫療機構；{role}應提供完整批號與來源資料，並在供應合約中界定醫院建立病人層級追蹤、代理商避免取得非必要病人個資的責任邊界。",
  "L0030144|第5條": "{role}若屬第二條或第三條的藥商，相關資料須保存至產品保存期限屆至後至少三十年；醫療機構另有十五年或未成年病人延長保存規定，應在合約及系統中分開設定。",
  "L0030147|第3條": "對{role}而言，有附款許可製劑的標籤、仿單、包裝及申請附件須符合查驗登記規定；領取許可函時也必須完成指定程序。",
  "L0030147|第6條": "若查驗登記核准，{role}須在領取通知後三個月內完成核定版標籤、仿單、包裝及平台建檔，並備齊GMP、GDP與出產國許可製售證明後領取許可。",
  "L0030148|第2條": "對{role}而言，原廠須完成組織／細胞提供者的健康史與病史篩選、身體理學檢查及傳染性病原風險評估，並留存可供代理商查核的判定與測試紀錄。",
  "L0030148|第3條": "作為輸入端的{role}，應督促國外原廠或受託機構按標準程序完成提供者篩選、測試與合適性判定，並確認受託資格、判定醫師經驗及異常通報責任。",
  "L0030087|第2條": "對{role}而言，申請西藥運銷許可時須彙整申請書、藥商許可執照、廠商資料及費用，並保存主管機關查核與核准紀錄。",
  "L0030087|第3條": "{role}應維護西藥運銷許可登記事項清冊；名稱、地址、負責人、營業項目或其他登記事項變更時，須於法定期限內提出申請並追蹤核准。",
  "L0030087|第4條": "{role}應管理西藥運銷許可有效期間，於期滿前三個月提出展延申請，備妥原許可執照、費用及所需資料，並保存展延結果。",
  "L0030057|第3條": "對{role}而言，查驗登記申請須使用主管機關指定格式與語言，逐項檢附申請書、技術資料、標籤仿單及其他附件，並追蹤補件與審查期限。",
});

function solStyleReferenceKey(lawMeta = {}) {
  const pcode = String(lawMeta.pcode || "").trim().toUpperCase();
  const article = String(lawMeta.article || "").replace(/\s+/g, "");
  return `${pcode}|${article}`;
}

function buildArticleChecklist(articleText, facts, lawMeta = {}) {
  const reference = SOL_STYLE_CHECKLIST_REFERENCES[solStyleReferenceKey(lawMeta)];
  if (reference) return [...reference];
  const items = [];
  const add = (item) => { if (!items.includes(item)) items.push(item); };
  if (/許可證或許可字號/.test(articleText) && /批號/.test(articleText)) {
    add("依各製劑許可證或許可字號分開建檔，不得混用不同產品或許可資料");
  }
  if (/生產數量|輸入數量|報關日期|製造日期|有效期間|保存期限/.test(articleText)) {
    add("逐批保存生產或輸入數量、報關日期、製造日期及有效期間／保存期限");
  }
  if (/組織、細胞追蹤編碼|有效成分之製造廠/.test(articleText)) {
    add("保存組織／細胞追蹤編碼，以及有效成分製造廠名稱、地址與國別");
  }
  if (/供應對象名稱|聯絡人與電話|交貨日期/.test(articleText)) {
    add("逐批記錄供應對象名稱、地址、聯絡人、電話、供應數量及交貨日期");
  }
  if (/供應商名稱|各次進貨/.test(articleText)) {
    add("記錄供應商聯絡資料，以及每次進貨的批號、數量與日期");
  }
  if (/病人姓名|身分證明文件號碼/.test(articleText)) {
    add("依批號保存使用病人姓名、身分證明文件號碼及聯絡資料");
  }
  const years = [...String(articleText).matchAll(/保存至少([一二三四五六七八九十百\d]+)年/g)].map((match) => match[1]);
  for (const year of years) add(`設定資料保存年限：至少${year}年，並建立屆期與銷毀管制`);
  if (/申請書|申請表|查驗登記|申請.*核准|應.*申請/.test(articleText)) {
    add("確認申請時點、申請人、負責單位及目前核准狀態");
    add("逐項準備並複核本條要求的申請文件、證照、費用及技術資料");
  }
  if (/有效期間|期滿|展延/.test(articleText)) add("建立許可效期清冊，於法定期限前啟動展延並追蹤核准");
  if (/變更|移轉|換發|補發/.test(articleText)) add("建立登記事項變更台帳，於法定期限內申請變更、移轉、換發或補發");
  if (/標籤|仿單|包裝/.test(articleText)) add("核對標籤、仿單、包裝內容及核准版本，留存版次與覆核紀錄");
  if (/藥物優良製造準則|優良運銷|GMP|GDP|製造品質/.test(articleText)) {
    add("確認製造廠與品質系統符合本條要求，保存GMP／GDP及查核證明");
  }
  if (/提供者|合適性判定|篩選|測試/.test(articleText)) {
    add("取得提供者篩選、測試及合適性判定SOP與結果紀錄");
    add("在品質協議中界定原廠、受託機構與代理商的責任及異常通報");
  }
  if (/委託製造|委託.*檢驗/.test(articleText)) add("委託前確認核准與雙方資格，簽訂品質協議並保存放行及偏差紀錄");
  if (/不定期.*檢查|派員.*檢查|接受.*檢查/.test(articleText)) add("指定受檢窗口並備妥許可、品質、運銷及追溯紀錄供主管機關查核");
  if (/輸入|運輸|運銷|配送|倉儲/.test(articleText) && items.length < 4) {
    add("以書面界定原廠、許可證所有人、進口代理商與物流商的輸入、倉儲、運輸、交接及偏差責任");
  }
  if (!items.length) {
    add(`由${facts.role || "負責單位"}把本條義務轉成內部SOP、負責人及完成期限`);
    add("建立可供稽核的證據清單，記錄文件來源、版本、覆核人與保存位置");
  }
  return items.slice(0, 4);
}

function buildRoleSummary(articleText, facts, lawMeta = {}) {
  const compact = String(articleText || "").replace(/\s+/g, " ").trim();
  const role = facts.role || "使用者";
  const reference = SOL_STYLE_SUMMARY_REFERENCES[solStyleReferenceKey(lawMeta)];
  if (reference) return reference.replaceAll("{role}", role);
  if (/藥品許可證或有附款許可之所有人/.test(compact) && /來源及流向資料/.test(compact)) {
    return `若${role}同時是藥品許可證或有附款許可的所有人，本條要求依各許可證／許可字號分別保存製造或輸入、有效成分追蹤及逐批供應流向資料。`;
  }
  if (/前條以外從事再生醫療製劑販賣之藥商/.test(compact)) {
    return `若${role}屬於製劑販賣藥商而非前條許可所有人，本條要求分別保存供應商、進貨批號與日期，以及後續供應對象與交貨紀錄。`;
  }
  if (/醫療機構就其使用之再生醫療製劑/.test(compact)) {
    return `本條義務主體是使用製劑的醫療機構；${role}應配合提供可供醫院依批號保存的供應商、進貨及產品追溯資料。`;
  }
  if (/保存至少三十年/.test(compact) || /保存至少十五年/.test(compact)) {
    return `本條規定不同義務主體的資料保存期限；${role}應先確認自己是許可所有人、販賣藥商或受託物流商，再把相應年限與資料交付責任寫入程序及合約。`;
  }
  if (/合適性判定|提供者.*篩選|提供者.*測試/.test(compact)) {
    return `對${role}而言，本條要求原廠或受託機構以書面程序完成組織／細胞提供者的篩選、測試與合適性判定；代理商應取得可查核的SOP、判定結果及異常通報安排。`;
  }
  if (/有效期間|期滿|展延/.test(compact)) {
    return `對${role}而言，本條的重點是許可效期與展延時程；應建立到期清冊，在法定期限前備妥文件與費用提出申請，並保存審查及核准紀錄。`;
  }
  if (/變更.*登記|移轉.*登記|換發|補發/.test(compact)) {
    return `對${role}而言，本條要求持續維護許可登記事項；名稱、地址、負責人、營業項目或許可權利有變動時，須在法定期限內辦理變更、移轉、換發或補發。`;
  }
  if (/委託製造|委託.*檢驗/.test(compact)) {
    return `對${role}而言，委託製造或檢驗前須完成主管機關核准並確認雙方資格；與原廠或受託廠的品質協議應明定放行、偏差、變更及紀錄保存責任。`;
  }
  if (/申請書|申請表|查驗登記|應.*申請/.test(compact)) {
    return `對${role}而言，本條直接規範申請資格、時點與應備資料；應由單一窗口彙整申請書、證照、技術文件、標籤仿單及費用，逐項覆核後追蹤核准或補件。`;
  }
  if (/藥物優良製造準則|優良運銷|GMP|GDP/.test(compact)) {
    return `對${role}而言，本條要求確認原廠製造品質與輸入後運銷系統均符合核准條件；應保存GMP／GDP證明、冷鏈交接、偏差處理及委外管理紀錄。`;
  }
  const clauses = compact.split(/[。；]/).map((item) => item.trim()).filter(Boolean);
  const relevant = clauses.filter((item) => /應|不得|須|保存|申請|檢附|符合|紀錄/.test(item)).slice(0, 2);
  const excerpt = (relevant.length ? relevant.join("；") : compact).slice(0, 220);
  return `對${role}而言，本條要求：${excerpt}${excerpt.length >= 220 ? "…" : ""}`;
}

function makeArticleBlock({ lawName, pcode, sourceUrl, level, parentLawName = "", parentPcode = "", authorizationArticle = "", article, motherScore, titleScore, facts }) {
  const articleScore = Math.max(0, article.score || 0);
  const rawScore = Math.max(1, Math.round(motherScore * 0.55 + titleScore + articleScore * 2));
  const confidence = Math.max(45, Math.min(95, Math.round(45 + articleScore * 0.7 + Math.max(0, titleScore) * 0.8)));
  const applicability = confidence >= 78 ? "likely_applicable" : confidence >= 58 ? "potentially_applicable" : "needs_more_information";
  return {
    law_name: lawName,
    pcode,
    source_url: sourceUrl,
    article: article.article,
    article_text: article.text.slice(0, 1400),
    level,
    parent_law_name: parentLawName,
    parent_pcode: parentPcode,
    authorization_article: authorizationArticle,
    applicability,
    confidence,
    score: rawScore,
    rank_score: rawScore + confidence,
    role_summary: buildRoleSummary(article.text, facts, { lawName, pcode, article: article.article }),
    checklist: buildArticleChecklist(article.text, facts, { lawName, pcode, article: article.article }),
    relation_reason: article.relationReason || "",
  };
}

function lawTitleMismatchPenalty(title, facts) {
  const context = `${facts.rawScenario || ""} ${(facts.lawTypes || []).join(" ")} ${(facts.activities || []).join(" ")}`;
  const specializedTopics = ["短缺", "廣告", "招募", "罕見疾病", "管制藥", "藥害救濟", "人體試驗", "費收費"];
  return specializedTopics.some((topic) => title.includes(topic) && !context.includes(topic)) ? 40 : 0;
}

async function allSettledWithLimit(items, limit, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;
  async function run() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      try {
        results[index] = { status: "fulfilled", value: await worker(items[index], index) };
      } catch (reason) {
        results[index] = { status: "rejected", reason };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => run()));
  return results;
}

async function enrichWithOfficialSubLaws(report, facts, assessments) {
  const mothers = assessments.filter((item) => item.law.level === "母法").slice(0, 2);
  const discoveries = await Promise.all(mothers.map(async (mother) => ({
    mother,
    children: rankAuthorizedSubLaws(await fetchAuthorizedSubLaws(mother.law.pcode), facts).slice(0, 6),
  })));
  const motherBlocksResult = await Promise.allSettled(mothers.map(async (mother) => {
    const selectedArticles = selectRelevantLawArticles(await fetchOfficialLawText(mother.law.pcode), facts, 2).articles;
    return selectedArticles.map((article) => makeArticleBlock({
      lawName: mother.law.title,
      pcode: mother.law.pcode,
      sourceUrl: findSourceUrl(mother.law.pcode),
      level: "母法",
      article,
      motherScore: mother.score,
      titleScore: 5,
      facts,
    }));
  }));
  const motherBlocks = motherBlocksResult.filter((item) => item.status === "fulfilled").flatMap((item) => item.value);

  const selected = discoveries.flatMap(({ mother, children }) => children.map((child) => ({ mother, child })));
  const fetched = await allSettledWithLimit(selected, 3, async ({ mother, child }) => {
    const relevant = selectRelevantLawArticles(await fetchOfficialLawText(child.pcode), facts);
    const titleScore = child.relevanceScore - lawTitleMismatchPenalty(child.title, facts);
    return relevant.articles.map((article) => makeArticleBlock({
      lawName: child.title,
      pcode: child.pcode,
      sourceUrl: child.source_url,
      level: "授權子法",
      parentLawName: mother.law.title,
      parentPcode: mother.law.pcode,
      authorizationArticle: child.article,
      article,
      motherScore: mother.score,
      titleScore,
      facts,
    }));
  });
  const officialChildren = fetched
    .filter((item) => item.status === "fulfilled")
    .flatMap((item) => item.value);
  const crawledBlocks = [...motherBlocks, ...officialChildren]
    .filter((item) => item.article_text)
    .sort((a, b) => b.rank_score - a.rank_score)
    .filter((item, index, all) => all.findIndex((other) => other.pcode === item.pcode && other.article === item.article) === index)
    .slice(0, 30);
  if (!crawledBlocks.length) {
    return { ...report, applicable_laws: [], crawl_error: "無法從法務部取得法規正文，請稍後重試。" };
  }
  return { ...report, applicable_laws: crawledBlocks, confidence: crawledBlocks[0].confidence, official_sub_laws_found: officialChildren.length };
}

async function fetchLawText(pcode) {
  const cached = cacheGet(lawTextCache, pcode);
  if (cached !== undefined) return cached;

  try {
    const url = findSourceUrl(pcode);
    const html = await httpGet(url);
    const text = parseLawHtml(html);
    if (text) cacheSet(lawTextCache, pcode, text);
    return text;
  } catch {
    // Fall back to the static index, but do not cache it — the next request
    // should retry the scrape rather than reuse a degraded result.
    const entry = LAW_INDEX.find((l) => l.pcode === pcode);
    if (entry) {
      return `【${entry.title}】\n${entry.article}: ${entry.articleText}`;
    }
    return "";
  }
}

async function fetchOfficialLawText(pcode) {
  const cached = cacheGet(lawTextCache, pcode);
  if (cached !== undefined) return cached;
  const url = `https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=${encodeURIComponent(pcode)}`;
  const html = await httpGet(url);
  const text = parseLawHtml(html);
  if (!text || !/第\s*\d+(?:\s*之\s*\d+)?\s*條/.test(text)) {
    throw new Error(`法務部頁面未取得有效條文：${pcode}`);
  }
  cacheSet(lawTextCache, pcode, text);
  return text;
}

async function findPcodeByName(lawName) {
  if (!lawName || !lawName.trim()) return null;
  const trimmed = lawName.trim();

  // Check static LAW_INDEX first
  const found = LAW_INDEX.find(
    (l) => l.title.includes(trimmed) || trimmed.includes(l.title)
  );
  if (found) return found.pcode;

  const cached = cacheGet(pcodeByNameCache, trimmed);
  if (cached !== undefined) return cached;

  // Try search endpoint
  try {
    const searchUrl = `https://law.moj.gov.tw/Law/LawSearchResult.aspx?p=NI&t=E1&k=${encodeURIComponent(trimmed)}`;
    const html = await httpGet(searchUrl);
    const match = html.match(/pcode=([A-Z][0-9A-Z]{7})/i);
    if (match) {
      cacheSet(pcodeByNameCache, trimmed, match[1]);
      return match[1];
    }
  } catch {
    // Search failed, return null without caching so the next request retries.
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
  const applicableLaws = buildApplicableLaws(assessments);
  return {
    mode: "local_fallback",
    model: null,
    analyzedAt: new Date().toISOString(),
    facts,
    candidates: candidates.slice(0, 7),
    assessments,
    confidence: calculateOverallConfidence(assessments),
    applicable_laws: applicableLaws,
    summary_and_checklist: buildSummaryChecklist(facts, assessments),
    process_stages: buildProcessStages(facts, assessments),
    traceability: buildTraceability(assessments),
    direct_answers: buildFallbackDirectAnswers(facts, applicableLaws),
  };
}

function buildFallbackDirectAnswers(facts, applicableLaws) {
  const top = (applicableLaws || []).slice(0, 3);
  if (!top.length) return [];
  const references = top
    .map((law) => `${law.law_name || law.title || "相關法規"}${law.article ? ` ${law.article}` : ""}`)
    .join("、");
  return [{
    question: "本案目前可確認的主要法規依據為何？",
    answer: `依目前提供的${facts.role || "使用者"}情境，優先核對${references}；實際義務仍應依畫面中的法務部正式條文及待補事實逐條確認。`,
    grounding: "law",
  }];
}

// ---------------------------------------------------------------------------
// OpenAI Responses API caller
// ---------------------------------------------------------------------------

async function callOpenAI({ instructions, input, model, schemaName, jsonSchema, maxOutputTokens }) {
  const selectedModel = normalizeOpenAIModelId(model, OPENAI_MODEL);
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: selectedModel,
      instructions,
      input,
      ...(selectedModel.startsWith("gpt-5.6") ? { reasoning: { effort: OPENAI_REASONING_EFFORT } } : { temperature: 0 }),
      ...(jsonSchema
        ? {
            text: {
              format: {
                type: "json_schema",
                name: schemaName || "rxplain_response",
                strict: true,
                schema: jsonSchema,
              },
            },
          }
        : {}),
      ...(Number.isFinite(maxOutputTokens) ? { max_output_tokens: maxOutputTokens } : {}),
      store: false,
    }),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.error?.message || `OpenAI 請求失敗：${response.status}`);
  const text = extractOutputText(json).trim();
  if (!text) throw new Error("OpenAI 未回傳文字內容");
  return text;
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
  addIf(activities, "罕見疾病", matchAny(text, ["罕見疾病", "罕病", "孤兒藥", "orphan"]));
  addIf(activities, "管制藥品", matchAny(text, ["管制藥品", "麻醉藥品", "影響精神藥物", "影響精神藥品", "毒品"]));
  addIf(activities, "專案申請", matchAny(text, ["專案核准", "專案申請", "恩慈", "compassionate", "尚無合適替代療法"]));
  addIf(activities, "健保給付", matchAny(text, ["健保", "給付", "收載", "藥價", "支付標準", "核價"]));
  addIf(activities, "廣告", matchAny(text, ["廣告", "衛教", "宣傳", "行銷", "推廣"]));
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
    jobFunction: ROLE_PROFILES[payload.job_function] ? payload.job_function : null,
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
  return assessments.slice(0, 8).map((item) => ({
    law_name: item.law.title,
    pcode: item.law.pcode,
    source_url: item.law.url,
    article: item.law.article,
    article_text: item.law.articleText,
    level: item.law.level,
    parent_law_name: item.law.parentId ? LAW_INDEX.find((law) => law.id === item.law.parentId)?.title || "" : "",
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
    stage_title: compactStageText(stage.stage_title || fallback[index]?.stage_title || `階段 ${index + 1}`, 28),
    law_name: compactStageText(stage.law_name || fallback[index]?.law_name || "待確認法規", 42),
    control_points: sanitizeList(stage.control_points, fallback[index]?.control_points || [])
      .slice(0, 3)
      .map((point) => compactStageText(point, 42)),
    owner: compactStageText(stage.owner || fallback[index]?.owner || "RA / PM", 22),
  }));
}

function compactStageText(value, maxLength) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
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
