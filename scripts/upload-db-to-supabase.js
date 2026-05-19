const fs = require("node:fs");
const path = require("node:path");

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const SUPABASE_APP_STATE_ID = process.env.SUPABASE_APP_STATE_ID || "career-archive";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("请先设置 SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY。");
  process.exit(1);
}

const dbPath = path.join(__dirname, "..", "data", "db.json");

if (!fs.existsSync(dbPath)) {
  console.error(`找不到本地数据文件：${dbPath}`);
  process.exit(1);
}

const db = JSON.parse(fs.readFileSync(dbPath, "utf8"));

async function request(pathname, options = {}) {
  const response = await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/${pathname}`, {
    ...options,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation",
      ...(options.headers || {}),
    },
  });

  const text = await response.text();

  if (!response.ok) {
    console.error(text);
    throw new Error("上传失败");
  }

  return text ? JSON.parse(text) : null;
}

async function main() {
  await request("app_state", {
    method: "POST",
    body: JSON.stringify({
      id: SUPABASE_APP_STATE_ID,
      data: db,
      updated_at: new Date().toISOString(),
    }),
  });

  console.log(`已上传本地数据到 Supabase app_state：${SUPABASE_APP_STATE_ID}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
