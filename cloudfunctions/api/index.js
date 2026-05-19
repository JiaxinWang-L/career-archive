const crypto = require("node:crypto");
const cloudbase = require("@cloudbase/node-sdk");

const INVITE_CODE = process.env.INVITE_CODE || "CAREER2026";
const MEMBER_LIMIT = Number(process.env.MEMBER_LIMIT || 5);
const APP_STATE_ID = process.env.APP_STATE_ID || "career-archive";
const COLLECTION = process.env.APP_STATE_COLLECTION || "app_state";

const app = cloudbase.init({
  env: cloudbase.SYMBOL_CURRENT_ENV,
});

const db = app.database();
const appState = db.collection(COLLECTION);

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

function safeId(prefix) {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
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

async function readData() {
  const result = await appState.doc(APP_STATE_ID).get();
  const doc = result.data?.[0];

  if (doc?.data) return normalizeData(doc.data);

  await appState.doc(APP_STATE_ID).set({
    data: {
      data: seedDb,
      updatedAt: new Date(),
    },
  });

  return normalizeData(seedDb);
}

async function writeData(data) {
  await appState.doc(APP_STATE_ID).set({
    data: {
      data,
      updatedAt: new Date(),
    },
  });
}

function getRequest(event) {
  const method = event.httpMethod || event.requestContext?.httpMethod || "GET";
  const rawPath = event.path || event.requestContext?.path || "/";
  const path = rawPath.replace(/^\/api/, "") || "/";
  let body = {};

  if (event.body) {
    try {
      body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    } catch {
      body = {};
    }
  }

  return { method: method.toUpperCase(), path, body };
}

function response(statusCode, data) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,PUT,OPTIONS",
      "access-control-allow-headers": "content-type,authorization",
    },
    body: JSON.stringify(data),
  };
}

exports.main = async (event) => {
  const { method, path, body } = getRequest(event);

  if (method === "OPTIONS") {
    return response(204, {});
  }

  try {
    if (method === "GET" && path === "/state") {
      return response(200, publicState(await readData()));
    }

    if (method === "POST" && path === "/login") {
      const data = await readData();
      const email = String(body.email || "").trim().toLowerCase();
      const passwordHash = hashPassword(body.password || "");
      const user = data.users.find(
        (item) => item.email === email && item.passwordHash === passwordHash,
      );

      if (!user) return response(401, { error: "邮箱或密码不正确。" });

      return response(200, { user: publicUser(user), state: publicState(data) });
    }

    if (method === "POST" && path === "/register") {
      const data = await readData();
      const settings = getSettings(data);
      const email = String(body.email || "").trim().toLowerCase();
      const name = String(body.name || "").trim();
      const password = String(body.password || "");
      const invite = String(body.invite || "").trim();

      if (!settings.allowRegistration) {
        return response(400, { error: "当前暂未开放新成员注册。" });
      }
      if (invite !== settings.inviteCode) return response(400, { error: "邀请码不正确。" });
      if (!name || !email || !password) {
        return response(400, { error: "请完整填写昵称、邮箱和密码。" });
      }
      if (data.users.filter((user) => user.role === "member").length >= settings.memberLimit) {
        return response(400, { error: "成员名额已经用完。" });
      }
      if (data.users.some((user) => user.email === email)) {
        return response(400, { error: "这个邮箱已经注册。" });
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

      return response(201, { user: publicUser(user), state: publicState(data) });
    }

    if (method === "PUT" && path === "/admin/settings") {
      const data = await readData();
      const userId = String(body.currentUserId || "");
      const user = data.users.find((item) => item.id === userId);

      if (!user || user.role !== "admin") {
        return response(403, { error: "只有管理员可以修改设置。" });
      }

      data.settings = {
        inviteCode: String(body.settings?.inviteCode || "").trim() || INVITE_CODE,
        memberLimit: Math.max(0, Number(body.settings?.memberLimit || MEMBER_LIMIT)),
        allowRegistration: Boolean(body.settings?.allowRegistration),
      };

      await writeData(data);
      return response(200, publicState(data));
    }

    if (method === "PUT" && path === "/state") {
      const data = await readData();
      const userId = String(body.currentUserId || "");
      const user = data.users.find((item) => item.id === userId);

      if (!user) return response(401, { error: "请先登录。" });

      const incomingRecords = Array.isArray(body.records) ? body.records : [];
      const untouchedRecords = data.records.filter((record) => record.ownerId !== userId);
      const ownRecords = incomingRecords.filter((record) => record.ownerId === userId);

      data.records = [...ownRecords, ...untouchedRecords];
      await writeData(data);

      return response(200, publicState(data));
    }

    return response(404, { error: "接口不存在。" });
  } catch (error) {
    return response(500, { error: error.message || "服务器内部错误。" });
  }
};
