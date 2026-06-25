const http = require("node:http");
const crypto = require("node:crypto");

const PORT = Number(process.env.PORT || 3000);
const INVITE_CODE = process.env.INVITE_CODE || "CAREER2026";
const MEMBER_LIMIT = Number(process.env.MEMBER_LIMIT || 8);
const APP_STATE_ID = process.env.APP_STATE_ID || "career-archive";
const COLLECTION = process.env.APP_STATE_COLLECTION || "app_state";
const ENV_ID = process.env.TCB_ENV || process.env.SCF_NAMESPACE || "career-archive-d6g3v2mm182ce6b11";
const DB_TIMEOUT_MS = Number(process.env.DB_TIMEOUT_MS || 6000);

let appState;

process.on("uncaughtException", (error) => {
  console.error("uncaught exception", error);
});

process.on("unhandledRejection", (error) => {
  console.error("unhandled rejection", error);
});

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
  records: [],
};

function hashPassword(password) {
  return crypto.createHash("sha256").update(String(password)).digest("hex");
}

function safeId(prefix) {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
}

function getSettings(data) {
  data.settings ||= {
    inviteCode: INVITE_CODE,
    memberLimit: MEMBER_LIMIT,
    allowRegistration: true,
  };
  return data.settings;
}

function normalizeData(raw) {
  const data = raw?.users && raw?.records ? raw : raw?.data || seedDb;

  data.users = Array.isArray(data.users) ? data.users : [];
  data.records = Array.isArray(data.records) ? data.records : [];
  getSettings(data);

  return data;
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

function publicState(data) {
  return {
    users: data.users.map(publicUser),
    records: data.records,
    settings: getSettings(data),
    memberLimit: getSettings(data).memberLimit,
  };
}

function errorInfo(error) {
  const info = {
    error: error.message || "服务器内部错误。",
    name: error.name,
    code: error.code,
  };

  if (error.code === "SIGN_PARAM_INVALID" || String(error.message || "").includes("secret id error")) {
    info.hint = "SecretId/SecretKey 无效。请确认云托管环境变量的 key 是 TENCENTCLOUD_SECRETID / TENCENTCLOUD_SECRETKEY，value 只填密钥本身，不要包含变量名、等号、引号或星号。";
  }

  return info;
}

function envValue(...names) {
  for (const name of names) {
    const value = String(process.env[name] || "").trim();
    if (value) return value;
  }

  return "";
}

function getCredentialConfig() {
  const secretId = envValue("TENCENTCLOUD_SECRETID", "TENCENTCLOUD_SECRET_ID", "TCB_SECRET_ID", "SECRET_ID");
  const secretKey = envValue("TENCENTCLOUD_SECRETKEY", "TENCENTCLOUD_SECRET_KEY", "TCB_SECRET_KEY", "SECRET_KEY");
  const sessionToken = envValue("TENCENTCLOUD_SESSIONTOKEN", "TENCENTCLOUD_SESSION_TOKEN", "TCB_SESSION_TOKEN");

  if (!secretId || !secretKey) return {};

  return {
    secretId,
    secretKey,
    ...(sessionToken ? { sessionToken } : {}),
  };
}

function credentialDebugInfo() {
  const secretId = envValue("TENCENTCLOUD_SECRETID", "TENCENTCLOUD_SECRET_ID", "TCB_SECRET_ID", "SECRET_ID");
  const secretKey = envValue("TENCENTCLOUD_SECRETKEY", "TENCENTCLOUD_SECRET_KEY", "TCB_SECRET_KEY", "SECRET_KEY");
  const sessionToken = envValue("TENCENTCLOUD_SESSIONTOKEN", "TENCENTCLOUD_SESSION_TOKEN", "TCB_SESSION_TOKEN");

  return {
    hasSecretId: Boolean(secretId),
    hasSecretKey: Boolean(secretKey),
    hasSessionToken: Boolean(sessionToken),
    secretIdLength: secretId.length,
    secretKeyLength: secretKey.length,
    secretIdLooksLikeTencentKey: secretId.startsWith("AKID"),
    secretValueContainsEquals: secretId.includes("=") || secretKey.includes("="),
  };
}

function withTimeout(promise, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const error = new Error(`${label} 超时，请检查云托管是否有权限访问 CloudBase 文档型数据库。`);
      error.code = "DB_TIMEOUT";
      reject(error);
    }, DB_TIMEOUT_MS);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function getAppState() {
  if (!appState) {
    const cloudbase = require("@cloudbase/node-sdk");
    const app = cloudbase.init({
      env: ENV_ID,
      ...getCredentialConfig(),
    });
    const db = app.database();
    appState = db.collection(COLLECTION);
  }

  return appState;
}

async function readData() {
  const collection = getAppState();
  const result = await withTimeout(
    collection.doc(APP_STATE_ID).get(),
    `读取 ${COLLECTION}/${APP_STATE_ID}`
  );
  const doc = result.data?.[0];

  if (doc?.data) return normalizeData(doc.data);

  await withTimeout(
    collection.doc(APP_STATE_ID).set({
      data: {
        data: seedDb,
        updatedAt: new Date(),
      },
    }),
    `初始化 ${COLLECTION}/${APP_STATE_ID}`
  );

  return normalizeData(seedDb);
}

async function writeData(data) {
  const collection = getAppState();
  await withTimeout(
    collection.doc(APP_STATE_ID).set({
      data: {
        data,
        updatedAt: new Date(),
      },
    }),
    `保存 ${COLLECTION}/${APP_STATE_ID}`
  );
}

function send(res, statusCode, data) {
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,PUT,OPTIONS",
    "access-control-allow-headers": "content-type,authorization",
  });
  res.end(JSON.stringify(data));
}

function sendEmpty(res, statusCode) {
  res.writeHead(statusCode, {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,PUT,OPTIONS,HEAD",
    "access-control-allow-headers": "content-type,authorization",
  });
  res.end();
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

async function requireAdmin(body) {
  const data = await readData();
  const userId = String(body.currentUserId || "");
  const user = data.users.find((item) => item.id === userId);

  if (!user || user.role !== "admin") {
    return { error: { status: 403, body: { error: "只有管理员可以执行此操作。" } } };
  }

  return { data, user };
}

async function handleApi(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.searchParams.get("apiPath") || url.pathname;

  if (req.method === "OPTIONS") {
    send(res, 204, {});
    return;
  }

  if ((req.method === "GET" || req.method === "HEAD") && (path === "/" || path === "/health" || path === "/api/health")) {
    if (req.method === "HEAD") {
      sendEmpty(res, 200);
      return;
    }

    send(res, 200, { ok: true, service: "career-archive-backend" });
    return;
  }

  if (req.method === "GET" && (path === "/debug" || path === "/api/debug")) {
    send(res, 200, {
      ok: true,
      service: "career-archive-backend",
      path,
      envId: ENV_ID,
      collection: COLLECTION,
      appStateId: APP_STATE_ID,
      nodeEnv: process.env.NODE_ENV || "",
      port: PORT,
      dbTimeoutMs: DB_TIMEOUT_MS,
      hasTcbEnv: Boolean(process.env.TCB_ENV),
      hasScfNamespace: Boolean(process.env.SCF_NAMESPACE),
      ...credentialDebugInfo(),
    });
    return;
  }

  if (req.method === "GET" && (path === "/db-check" || path === "/api/db-check")) {
    try {
      const data = await readData();
      send(res, 200, {
        ok: true,
        users: data.users.length,
        records: data.records.length,
        hasSettings: Boolean(data.settings),
      });
    } catch (error) {
      console.error("database check failed", error);
      send(res, 500, {
        ok: false,
        stage: "database",
        ...errorInfo(error),
      });
    }
    return;
  }

  if (req.method === "GET" && (path === "/state" || path === "/api/state")) {
    send(res, 200, publicState(await readData()));
    return;
  }

  if (req.method === "POST" && (path === "/login" || path === "/api/login")) {
    const body = await readBody(req);
    const data = await readData();
    const email = String(body.email || "").trim().toLowerCase();
    const passwordHash = hashPassword(body.password || "");
    const user = data.users.find((item) => item.email === email && item.passwordHash === passwordHash);

    if (!user) {
      send(res, 401, { error: "邮箱或密码不正确。" });
      return;
    }

    send(res, 200, { user: publicUser(user), state: publicState(data) });
    return;
  }

  if (req.method === "POST" && (path === "/register" || path === "/api/register")) {
    const body = await readBody(req);
    const data = await readData();
    const settings = getSettings(data);
    const email = String(body.email || "").trim().toLowerCase();
    const name = String(body.name || "").trim();
    const password = String(body.password || "");
    const invite = String(body.invite || "").trim();

    if (!settings.allowRegistration) {
      send(res, 400, { error: "当前暂未开放新成员注册。" });
      return;
    }
    if (invite !== settings.inviteCode) {
      send(res, 400, { error: "邀请码不正确。" });
      return;
    }
    if (!name || !email || !password) {
      send(res, 400, { error: "请完整填写昵称、邮箱和密码。" });
      return;
    }
    if (data.users.filter((user) => user.role === "member").length >= settings.memberLimit) {
      send(res, 400, { error: "成员名额已经用完。" });
      return;
    }
    if (data.users.some((user) => user.email === email)) {
      send(res, 400, { error: "这个邮箱已经注册。" });
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

    data.users.push(user);
    await writeData(data);
    send(res, 201, { user: publicUser(user), state: publicState(data) });
    return;
  }

  if (req.method === "PUT" && (path === "/state" || path === "/api/state")) {
    const body = await readBody(req);
    const data = await readData();
    const userId = String(body.currentUserId || "");
    const user = data.users.find((item) => item.id === userId);

    if (!user) {
      send(res, 401, { error: "请先登录。" });
      return;
    }

    const incomingRecords = Array.isArray(body.records) ? body.records : [];
    const untouchedRecords = data.records.filter((record) => record.ownerId !== userId);
    const ownRecords = incomingRecords.filter((record) => record.ownerId === userId);

    data.records = [...ownRecords, ...untouchedRecords];
    await writeData(data);
    send(res, 200, publicState(data));
    return;
  }

  if (req.method === "PUT" && (path === "/admin/settings" || path === "/api/admin/settings")) {
    const body = await readBody(req);
    const result = await requireAdmin(body);
    if (result.error) {
      send(res, result.error.status, result.error.body);
      return;
    }

    result.data.settings = {
      inviteCode: String(body.settings?.inviteCode || "").trim() || INVITE_CODE,
      memberLimit: Math.max(0, Number(body.settings?.memberLimit || MEMBER_LIMIT)),
      allowRegistration: Boolean(body.settings?.allowRegistration),
    };

    await writeData(result.data);
    send(res, 200, publicState(result.data));
    return;
  }

  if (req.method === "POST" && (path === "/admin/delete-member" || path === "/api/admin/delete-member")) {
    const body = await readBody(req);
    const result = await requireAdmin(body);
    if (result.error) {
      send(res, result.error.status, result.error.body);
      return;
    }

    const memberId = String(body.memberId || "");
    const member = result.data.users.find((item) => item.id === memberId);

    if (!member) {
      send(res, 404, { error: "成员不存在。" });
      return;
    }
    if (member.role === "admin") {
      send(res, 400, { error: "不能删除管理员账号。" });
      return;
    }

    result.data.users = result.data.users.filter((item) => item.id !== memberId);
    result.data.records = result.data.records.filter((record) => record.ownerId !== memberId);
    await writeData(result.data);
    send(res, 200, publicState(result.data));
    return;
  }

  if (req.method === "POST" && (path === "/admin/delete-record" || path === "/api/admin/delete-record")) {
    const body = await readBody(req);
    const result = await requireAdmin(body);
    if (result.error) {
      send(res, result.error.status, result.error.body);
      return;
    }

    const recordId = String(body.recordId || "");
    const record = result.data.records.find((item) => item.id === recordId);

    if (!record) {
      send(res, 404, { error: "记录不存在。" });
      return;
    }

    result.data.records = result.data.records.filter((item) => item.id !== recordId);
    await writeData(result.data);
    send(res, 200, publicState(result.data));
    return;
  }

  send(res, 404, { error: "接口不存在。" });
}

function createServer() {
  return http.createServer((req, res) => {
    handleApi(req, res).catch((error) => {
      console.error("request failed", error);
      send(res, 500, {
        ok: false,
        stage: "request",
        ...errorInfo(error),
      });
    });
  });
}

function listen(port) {
  const server = createServer();
  server.on("error", (error) => {
    console.error(`failed to listen on ${port}`, error.message);
  });
  server.listen(port, "0.0.0.0", () => {
    console.log(`career archive backend listening on ${port}, env=${ENV_ID}, collection=${COLLECTION}`);
  });
}

const ports = process.env.NODE_ENV === "production" ? new Set([PORT, 80, 3000]) : new Set([PORT]);

for (const port of ports) {
  listen(port);
}
