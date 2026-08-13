// Build a compact snapshot of currently-effective NHI drug items from the
// NHIA open dataset (健保用藥品項查詢項目檔, data.gov.tw dataset 23715).
//
// Usage:
//   node scripts/build-nhi-snapshot.js [path-to-local-csv]
//
// Without an argument it downloads the full CSV (~90 MB) from the NHIA API.
// Output: data/nhi-drugs.json — only rows whose 有效迄日 is today or later,
// deduplicated by 藥品代號, with a trimmed field set. Run monthly to refresh.

const fs = require("node:fs");
const path = require("node:path");

const DATASET_URL = "https://info.nhi.gov.tw/api/iode0000s01/Dataset?rId=A21030000I-E41001-001";
const OUTPUT_PATH = path.join(__dirname, "..", "data", "nhi-drugs.json");

main();

async function main() {
  const localPath = process.argv[2];
  let csvText;
  if (localPath) {
    console.log(`Reading local CSV: ${localPath}`);
    csvText = fs.readFileSync(localPath, "utf8");
  } else {
    console.log(`Downloading dataset (~90 MB): ${DATASET_URL}`);
    const response = await fetch(DATASET_URL);
    if (!response.ok) throw new Error(`Download failed: HTTP ${response.status}`);
    csvText = await response.text();
  }
  if (csvText.charCodeAt(0) === 0xfeff) csvText = csvText.slice(1);

  const rows = parseCsv(csvText);
  const header = rows.shift();
  const col = Object.fromEntries(header.map((name, i) => [name.trim(), i]));
  const required = ["藥品代號", "藥品英文名稱", "藥品中文名稱", "成分", "支付價", "有效迄日", "藥商", "劑型", "分類分組名稱", "ATC代碼"];
  for (const name of required) {
    if (!(name in col)) throw new Error(`Missing expected column: ${name}`);
  }

  const today = rocToday();
  const byCode = new Map();
  for (const row of rows) {
    const endDate = parseInt((row[col["有效迄日"]] || "").trim(), 10);
    if (!Number.isFinite(endDate) || endDate < today) continue;
    const code = (row[col["藥品代號"]] || "").trim();
    if (!code) continue;
    const existing = byCode.get(code);
    if (existing && existing._end >= endDate) continue;
    byCode.set(code, {
      _end: endDate,
      id: code,
      en: (row[col["藥品英文名稱"]] || "").trim(),
      zh: (row[col["藥品中文名稱"]] || "").trim(),
      ing: (row[col["成分"]] || "").trim(),
      price: (row[col["支付價"]] || "").trim(),
      vendor: (row[col["藥商"]] || "").trim(),
      form: (row[col["劑型"]] || "").trim(),
      grp: (row[col["分類分組名稱"]] || "").trim(),
      atc: (row[col["ATC代碼"]] || "").trim(),
    });
  }

  const items = Array.from(byCode.values());
  for (const item of items) delete item._end;

  const snapshot = {
    meta: {
      source: "衛生福利部中央健康保險署 健保用藥品項查詢項目檔",
      datasetUrl: "https://data.gov.tw/dataset/23715",
      generatedAt: new Date().toISOString().slice(0, 10),
      effectiveOn: String(today),
      count: items.length,
    },
    items,
  };

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(snapshot), "utf8");
  const sizeMb = (fs.statSync(OUTPUT_PATH).size / 1024 / 1024).toFixed(1);
  console.log(`Wrote ${items.length} active items to ${OUTPUT_PATH} (${sizeMb} MB)`);
}

// ROC-calendar date for today as an integer, e.g. 2026-08-14 -> 1150814.
function rocToday() {
  const now = new Date();
  return (now.getFullYear() - 1911) * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
}

// Minimal RFC-4180-style parser: handles quoted fields containing commas,
// escaped quotes ("") and newlines inside quotes.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    if (row.length > 1 || row[0] !== "") rows.push(row);
  }
  return rows;
}
