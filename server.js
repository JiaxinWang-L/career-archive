const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const PORT = Number(process.env.PORT || 3000);
const INVITE_CODE = "CAREER2026";
const MEMBER_LIMIT = 5;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const DATA_FILE = path.join(DATA_DIR, "db.json");
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const SUPABASE_APP_STATE_ID = process.env.SUPABASE_APP_STATE_ID || "career-archive";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const seedDb = {
  settings: {
    inviteCode: INVITE_CODE,
    memberLimit: MEMBER_LIMIT,
    allowRegistration: true,
  },
  users: [
    {
      id: "u-admin",
      name: "管理员",
      email: "admin@example.com",
      passwordHash: hashPassword("123456"),
      role: "admin",
      createdAt: new Date().toISOString(),
    },
  ],
  records: [
    {
      id: "r-demo",
      ownerId: "u-admin",
      company: "示例科技",
      position: "产品运营实习生",
      channel: "Boss 直聘",
      appliedAt: "2026-05-18",
      status: "面试中",
      visibility: "shared",
      shareImages: false,
      note:
        "这是一条示例记录。你可以保留它作为模板，也可以删除后从自己的第一家公司开始记录。",
      images: [],
      rounds: [
        {
          id: "round-demo",
          name: "一面",
          date: "2026-05-18",
          format: "视频面试",
          result: "待反馈",
          summary: "问题集中在项目经历和岗位理解，需要把回答整理得更贴近 JD。",
          questions: [
            {
              id: "q-demo-1",
              type: "项目经历",
              content: "请介绍一个你最有代表性的项目。",
              answer: "按项目背景、目标、行动、结果的顺序回答。",
              review: "结果指标讲得不够具体，下次补充数据和个人贡献。",
              betterAnswer:
                "用 STAR 法则组织，并把和岗位相关的能力放在前半段突出。",
              images: [],
            },
          ],
        },
      ],
    },
  ],
};

function hashPassword(password) {
  return crypto.createHash("sha256").update(String(password)).digest("hex");
}

function ensureDb() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(seedDb, null, 2), "utf8");
  }
}

function usingSupabase() {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}

function supabaseRestUrl(pathname) {
  return `${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/${pathname}`;
}

async function supabaseRequest(pathname, options = {}) {
  const response = await fetch(supabaseRestUrl(pathname), {
    ...options,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(data?.message || data?.error || "Supabase request failed");
  }

  return data;
}

function readDbLocal() {
  ensureDb();
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

function writeDbLocal(db) {
  ensureDb();
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), "utf8");
}

async function readDb() {
  if (!usingSupabase()) return readDbLocal();

  const rows = await supabaseRequest(
    `app_state?id=eq.${encodeURIComponent(SUPABASE_APP_STATE_ID)}&select=data`,
  );

  if (rows.length) return rows[0].data;

  await supabaseRequest("app_state", {
    method: "POST",
    body: JSON.stringify({ id: SUPABASE_APP_STATE_ID, data: seedDb }),
  });

  return seedDb;
}

async function writeDb(db) {
  if (!usingSupabase()) {
    writeDbLocal(db);
    return;
  }

  await supabaseRequest(`app_state?id=eq.${encodeURIComponent(SUPABASE_APP_STATE_ID)}`, {
    method: "PATCH",
    body: JSON.stringify({
      data: db,
      updated_at: new Date().toISOString(),
    }),
  });
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}

function publicState(db) {
  return {
    users: db.users.map(publicUser),
    records: db.records,
    settings: getSettings(db),
    memberLimit: getSettings(db).memberLimit,
  };
}

function getSettings(db) {
  db.settings ||= {
    inviteCode: INVITE_CODE,
    memberLimit: MEMBER_LIMIT,
    allowRegistration: true,
  };
  return db.settings;
}

function sendJson(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 25 * 1024 * 1024) {
        reject(new Error("请求内容太大"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("JSON 格式不正确"));
      }
    });
  });
}

function safeId(prefix) {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const rawPath = decodeURIComponent(url.pathname);
  const relativePath = rawPath === "/" ? "index.html" : rawPath.slice(1);
  const filePath = path.normalize(path.join(ROOT, relativePath));

  if (!filePath.startsWith(ROOT) || filePath.includes(`${path.sep}.git${path.sep}`)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    const contentType = mimeTypes[path.extname(filePath).toLowerCase()] || "text/plain; charset=utf-8";
    res.writeHead(200, { "Content-Type": contentType });
    res.end(content);
  });
}

async function handleApi(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "GET" && url.pathname === "/api/state") {
    sendJson(res, 200, publicState(await readDb()));
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/login") {
    const body = await readBody(req);
    const db = await readDb();
    const settings = getSettings(db);
    const email = String(body.email || "").trim().toLowerCase();
    const passwordHash = hashPassword(body.password || "");
    const user = db.users.find((item) => item.email === email && item.passwordHash === passwordHash);

    if (!user) {
      sendJson(res, 401, { error: "邮箱或密码不正确。" });
      return;
    }

    sendJson(res, 200, { user: publicUser(user), state: publicState(db) });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/register") {
    const body = await readBody(req);
    const db = await readDb();
    const email = String(body.email || "").trim().toLowerCase();
    const name = String(body.name || "").trim();
    const password = String(body.password || "");
    const invite = String(body.invite || "").trim();

    if (!settings.allowRegistration) {
      sendJson(res, 400, { error: "当前暂未开放新成员注册。" });
      return;
    }

    if (invite !== settings.inviteCode) {
      sendJson(res, 400, { error: "邀请码不正确。" });
      return;
    }

    if (db.users.filter((user) => user.role === "member").length >= settings.memberLimit) {
      sendJson(res, 400, { error: "5 个体验名额已经用完。" });
      return;
    }

    if (!name || !email || !password) {
      sendJson(res, 400, { error: "请完整填写昵称、邮箱和密码。" });
      return;
    }

    if (db.users.some((user) => user.email === email)) {
      sendJson(res, 400, { error: "这个邮箱已经注册。" });
      return;
    }

    const user = {
      id: safeId("u"),
      name,
      email,
      passwordHash: hashPassword(password),
      role: "member",
      createdAt: new Date().toISOString(),
    };

    db.users.push(user);
    await writeDb(db);
    sendJson(res, 201, { user: publicUser(user), state: publicState(db) });
    return;
  }

  if (req.method === "PUT" && url.pathname === "/api/admin/settings") {
    const body = await readBody(req);
    const db = await readDb();
    const userId = String(body.currentUserId || "");
    const user = db.users.find((item) => item.id === userId);

    if (!user || user.role !== "admin") {
      sendJson(res, 403, { error: "只有管理员可以修改设置。" });
      return;
    }

    db.settings = {
      inviteCode: String(body.settings?.inviteCode || "").trim() || INVITE_CODE,
      memberLimit: Math.max(0, Number(body.settings?.memberLimit || MEMBER_LIMIT)),
      allowRegistration: Boolean(body.settings?.allowRegistration),
    };

    await writeDb(db);
    sendJson(res, 200, publicState(db));
    return;
  }

  if (req.method === "PUT" && url.pathname === "/api/state") {
    const body = await readBody(req);
    const db = await readDb();
    const userId = String(body.currentUserId || "");
    const user = db.users.find((item) => item.id === userId);

    if (!user) {
      sendJson(res, 401, { error: "请先登录。" });
      return;
    }

    const incomingRecords = Array.isArray(body.records) ? body.records : [];
    const untouchedRecords = db.records.filter((record) => record.ownerId !== userId);
    const ownRecords = incomingRecords.filter((record) => record.ownerId === userId);

    db.records = [...ownRecords, ...untouchedRecords];
    await writeDb(db);
    sendJson(res, 200, publicState(db));
    return;
  }

  sendJson(res, 404, { error: "接口不存在。" });
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith("/api/")) {
    handleApi(req, res).catch((error) => {
      sendJson(res, 500, { error: error.message || "服务器内部错误。" });
    });
    return;
  }

  serveStatic(req, res);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`求职成长档案共享版已启动：http://localhost:${PORT}`);
});
