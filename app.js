const SESSION_KEY = "career-archive-current-user";
const INVITE_CODE = "CAREER2026";
const MEMBER_LIMIT = 5;
const DEFAULT_API_BASE =
  "https://career-archive-d6g3v2mm182ce6b11-1394551417.ap-shanghai.app.tcloudbase.com";
const API_BASE = (window.CAREER_ARCHIVE_CONFIG?.apiBase || DEFAULT_API_BASE).replace(/\/$/, "");

function apiUrl(path) {
  return `${API_BASE}${path}`;
}

const seedState = {
  currentUserId: null,
  authMode: "login",
  activeView: "dashboard",
  selectedRecordId: null,
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
      password: "123456",
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

let state = loadState();

function loadState() {
  const base = structuredClone(seedState);
  base.currentUserId = sessionStorage.getItem(SESSION_KEY);
  base.serverError = "";
  return base;
}

function saveState() {
  sessionStorage.setItem(SESSION_KEY, state.currentUserId || "");
  return fetch(apiUrl("/api/state"), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      currentUserId: state.currentUserId,
      records: state.records,
    }),
  })
    .then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "保存失败。");
      state.users = data.users;
      state.records = data.records;
      state.settings = data.settings || state.settings;
      state.serverError = "";
    })
    .catch((error) => {
      state.serverError = error.message;
      alert(`保存失败：${error.message}`);
    });
}

async function refreshState() {
  try {
    const response = await fetch(apiUrl("/api/state"));
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "读取失败。");
    state.users = data.users;
    state.records = data.records;
    state.settings = data.settings || state.settings;
    state.serverError = "";

    if (state.currentUserId && !state.users.some((user) => user.id === state.currentUserId)) {
      state.currentUserId = null;
      sessionStorage.removeItem(SESSION_KEY);
    }
  } catch (error) {
      state.serverError = "共享服务未启动，或 CloudBase 云函数地址没有配置好。";
  }
}

async function init() {
  await refreshState();
  render();
}

function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function currentUser() {
  return state.users.find((user) => user.id === state.currentUserId) || null;
}

function invitedMemberCount() {
  return state.users.filter((user) => user.role === "member").length;
}

function appSettings() {
  state.settings ||= {
    inviteCode: INVITE_CODE,
    memberLimit: MEMBER_LIMIT,
    allowRegistration: true,
  };
  return state.settings;
}

function canViewRecord(record, user) {
  if (!user) return false;
  return record.ownerId === user.id || record.visibility === "shared";
}

function canEditRecord(record, user) {
  return user && record.ownerId === user.id;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function render() {
  const user = currentUser();
  document.getElementById("app").innerHTML = user ? renderApp(user) : renderAuth();
  bindEvents();
}

function renderAuth() {
  const isLogin = state.authMode === "login";
  return `
    <section class="auth-wrap">
      <div class="auth-card">
        <div class="auth-intro">
          <div class="brand">
            <div class="brand-mark">职</div>
            <div>
              <h1>求职成长档案</h1>
              <p>邀请制求职经验库，先给 5 位成员小范围使用。</p>
            </div>
          </div>
          <ul>
            <li>默认私密，只有主动共享的记录会进入经验数据库。</li>
            <li>图片默认不共享，避免泄露手机号、微信、邮箱和面试链接。</li>
            <li>第一版用于验证记录、复盘、共享和隐私流程。</li>
          </ul>
        </div>
        <form class="auth-form" id="authForm">
          <div class="tabs">
            <button type="button" class="${isLogin ? "active" : ""}" data-auth-mode="login">登录</button>
            <button type="button" class="${!isLogin ? "active" : ""}" data-auth-mode="register">注册</button>
          </div>
          <div class="field">
            <label for="email">邮箱</label>
            <input id="email" name="email" type="email" autocomplete="email" required placeholder="请输入邮箱" />
          </div>
          <div class="field">
            <label for="password">密码</label>
            <input id="password" name="password" type="password" autocomplete="${isLogin ? "current-password" : "new-password"}" required placeholder="123456" />
          </div>
          ${
            isLogin
              ? ""
              : `
                <div class="field">
                  <label for="name">昵称</label>
                  <input id="name" name="name" required placeholder="你的名字" />
                </div>
                <div class="field">
                  <label for="invite">邀请码</label>
                  <input id="invite" name="invite" required placeholder="请向管理员获取邀请码" />
                </div>
              `
          }
          <div class="notice">${isLogin ? "请使用你的账号登录。" : "注册需要邀请码，请向管理员获取。"}</div>
          ${state.serverError ? `<div class="message error">${escapeHtml(state.serverError)}</div>` : ""}
          <button class="primary-button" type="submit">${isLogin ? "登录" : "创建账号"}</button>
          <div id="authMessage"></div>
        </form>
      </div>
    </section>
  `;
}

function renderApp(user) {
  return `
    <div class="shell">
      <aside class="sidebar">
        <div class="brand">
          <div class="brand-mark">职</div>
          <div>
            <h1>求职成长档案</h1>
            <p>小圈子经验库</p>
          </div>
        </div>
        <nav class="nav">
          ${navButton("dashboard", "首页总览")}
          ${navButton("mine", "我的记录")}
          ${navButton("library", "经验数据库")}
          ${navButton("privacy", "隐私规则")}
          ${user.role === "admin" ? navButton("admin", "管理后台") : ""}
        </nav>
        <div class="session">
          <strong>${escapeHtml(user.name)}</strong>
          <p>${escapeHtml(user.email)} · ${user.role === "admin" ? "管理员" : "成员"}</p>
          <button class="ghost-button" id="logoutBtn" type="button">退出登录</button>
        </div>
      </aside>
      <section class="content">
        ${renderView(user)}
      </section>
    </div>
    <div id="modalRoot"></div>
  `;
}

function navButton(view, label) {
  return `<button type="button" class="${state.activeView === view ? "active" : ""}" data-view="${view}">${label}</button>`;
}

function visibleRecords(user) {
  return state.records.filter((record) => canViewRecord(record, user));
}

function ownRecords(user) {
  return state.records.filter((record) => record.ownerId === user.id);
}

function renderView(user) {
  if (state.activeView === "mine") return renderMine(user);
  if (state.activeView === "library") return renderLibrary(user);
  if (state.activeView === "privacy") return renderPrivacy();
  if (state.activeView === "admin") return user.role === "admin" ? renderAdmin(user) : renderDashboard(user);
  return renderDashboard(user);
}

function renderDashboard(user) {
  const own = ownRecords(user);
  const shared = state.records.filter((record) => record.visibility === "shared");
  const interviews = own.reduce((sum, record) => sum + record.rounds.length, 0);
  const questions = own.reduce(
    (sum, record) =>
      sum + record.rounds.reduce((roundSum, round) => roundSum + round.questions.length, 0),
    0,
  );

  return `
    <header class="topbar">
      <div>
        <h2>首页总览</h2>
        <p>先把每家公司问了什么、你怎么答、下次怎么改记录清楚。</p>
      </div>
      <button class="primary-button" type="button" data-open-record-modal>新增公司记录</button>
    </header>
    <div class="grid stats">
      ${statCard("我的公司记录", own.length)}
      ${statCard("我的面试轮次", interviews)}
      ${statCard("我的问题复盘", questions)}
      ${statCard("共享经验数量", shared.length)}
    </div>
    <div class="grid main-grid">
      <section class="panel">
        <div class="panel-head">
          <h3>最近记录</h3>
          <button class="secondary-button" type="button" data-view="mine">查看全部</button>
        </div>
        ${renderRecordList(own.slice(0, 4), user)}
      </section>
      <section class="panel">
        <div class="panel-head">
          <h3>当前隐私策略</h3>
        </div>
        <div class="notice">
          新增内容默认仅自己可见。记录设为“小圈子可见”后，登录成员才能在经验数据库看到文字内容；图片仍需单独打开共享。
        </div>
        <div class="chips">
          <span class="chip private">默认私密</span>
          <span class="chip shared">主动共享</span>
          <span class="chip">随时撤回</span>
          <span class="chip">图片单独授权</span>
        </div>
      </section>
    </div>
  `;
}

function statCard(label, value) {
  return `<div class="stat"><span>${label}</span><strong>${value}</strong></div>`;
}

function renderMine(user) {
  return `
    <header class="topbar">
      <div>
        <h2>我的记录</h2>
        <p>管理自己的投递、面试轮次、问题复盘和附件。</p>
      </div>
      <button class="primary-button" type="button" data-open-record-modal>新增公司记录</button>
    </header>
    <div class="grid main-grid">
      <section class="panel">
        <div class="panel-head">
          <h3>公司记录</h3>
        </div>
        ${renderRecordList(ownRecords(user), user)}
      </section>
      <section class="panel">
        ${renderSelectedRecord(user)}
      </section>
    </div>
  `;
}

function renderLibrary(user) {
  const shared = visibleRecords(user).filter((record) => record.visibility === "shared");
  return `
    <header class="topbar">
      <div>
        <h2>经验数据库</h2>
        <p>这里只展示成员主动共享的内容，私密内容不会进入这个页面。</p>
      </div>
    </header>
    <div class="search-row">
      <input id="librarySearch" placeholder="搜索公司、岗位、问题、复盘关键词" />
      <select id="libraryStatus">
        <option value="">全部状态</option>
        <option>准备中</option>
        <option>已投递</option>
        <option>笔试中</option>
        <option>面试中</option>
        <option>Offer</option>
        <option>失败</option>
      </select>
    </div>
    <section class="panel">
      ${renderRecordList(shared, user, true)}
    </section>
  `;
}

function renderPrivacy() {
  return `
    <header class="topbar">
      <div>
        <h2>隐私规则</h2>
        <p>这部分直接放进第一版产品里，让使用者知道自己的内容怎么被保护。</p>
      </div>
    </header>
    <section class="panel detail">
      <div class="notice">核心原则：默认私密，主动共享，图片单独授权，随时撤回。</div>
      <div class="round">
        <h4>1. 默认仅自己可见</h4>
        <p>用户新增公司、面试轮次、问题和图片时，其他成员默认看不到。</p>
      </div>
      <div class="round">
        <h4>2. 共享只展示文字记录</h4>
        <p>公司记录设为“小圈子可见”后，经验数据库会展示公司、岗位、面试问题、回答和复盘。</p>
      </div>
      <div class="round">
        <h4>3. 图片需要单独共享</h4>
        <p>图片可能包含手机号、邮箱、微信、HR 信息、会议链接或简历个人信息，所以必须单独打开共享。</p>
      </div>
      <div class="round">
        <h4>4. 用户可以随时撤回</h4>
        <p>把记录改回“仅自己可见”后，其他成员马上不能再从经验数据库看到它。</p>
      </div>
    </section>
  `;
}

function renderAdmin(user) {
  const settings = appSettings();
  const members = state.users.filter((item) => item.role === "member");

  return `
    <header class="topbar">
      <div>
        <h2>管理后台</h2>
        <p>只有管理员可以访问这里，用来管理邀请码、开放名额和注册开关。</p>
      </div>
    </header>
    <div class="grid main-grid">
      <section class="panel">
        <div class="panel-head">
          <h3>邀请设置</h3>
        </div>
        <form class="form-grid" id="adminSettingsForm">
          <div class="field">
            <label for="adminInviteCode">邀请码</label>
            <input id="adminInviteCode" name="inviteCode" value="${escapeHtml(settings.inviteCode)}" />
          </div>
          <div class="field">
            <label for="adminMemberLimit">开放名额</label>
            <input id="adminMemberLimit" name="memberLimit" type="number" min="0" value="${escapeHtml(settings.memberLimit)}" />
          </div>
          <div class="field full">
            <label for="adminAllowRegistration">是否允许新成员注册</label>
            <select id="adminAllowRegistration" name="allowRegistration">
              <option value="true" ${settings.allowRegistration ? "selected" : ""}>允许注册</option>
              <option value="false" ${!settings.allowRegistration ? "selected" : ""}>暂停注册</option>
            </select>
          </div>
          <div class="field full">
            <button class="primary-button" type="submit">保存设置</button>
          </div>
        </form>
        <div class="notice" style="margin-top: 12px;">当前成员数量：${members.length} / ${settings.memberLimit}</div>
        <div id="adminMessage"></div>
      </section>
      <section class="panel">
        <div class="panel-head">
          <h3>成员列表</h3>
        </div>
        ${
          members.length
            ? `<div class="record-list">
                ${members
                  .map(
                    (member) => `
                      <article class="record">
                        <h3>${escapeHtml(member.name)}</h3>
                        <div class="record-meta">
                          <span class="chip">${escapeHtml(member.email)}</span>
                          <span class="chip">成员</span>
                          <span class="chip">注册时间：${escapeHtml((member.createdAt || "").slice(0, 10) || "未知")}</span>
                        </div>
                      </article>
                    `,
                  )
                  .join("")}
              </div>`
            : `<div class="empty"><strong>还没有成员</strong><p>成员用邀请码注册后，会出现在这里。</p></div>`
        }
      </section>
    </div>
  `;
}

function renderRecordList(records, user, libraryMode = false) {
  if (!records.length) {
    return `<div class="empty"><strong>还没有记录</strong><p>先新增一家公司，把真实面试问题和复盘写进去。</p></div>`;
  }

  return `
    <div class="record-list" id="${libraryMode ? "libraryList" : ""}">
      ${records.map((record) => renderRecordCard(record, user, libraryMode)).join("")}
    </div>
  `;
}

function renderRecordCard(record, user, libraryMode) {
  const owner = state.users.find((item) => item.id === record.ownerId);
  const questionCount = record.rounds.reduce((sum, round) => sum + round.questions.length, 0);
  return `
    <article class="record" data-record-card data-search="${escapeHtml(
      [
        record.company,
        record.position,
        record.status,
        record.note,
        ...record.rounds.flatMap((round) =>
          round.questions.flatMap((question) => [
            question.content,
            question.answer,
            question.review,
            question.betterAnswer,
          ]),
        ),
      ].join(" "),
    )}" data-status="${escapeHtml(record.status)}">
      <div class="record-header">
        <div>
          <h3>${escapeHtml(record.company)}</h3>
          <div class="record-meta">
            <span class="chip">${escapeHtml(record.position)}</span>
            <span class="chip">${escapeHtml(record.status)}</span>
            <span class="chip ${record.visibility === "shared" ? "shared" : "private"}">${record.visibility === "shared" ? "小圈子可见" : "仅自己可见"}</span>
            ${record.shareImages ? `<span class="chip shared">图片已共享</span>` : `<span class="chip private">图片未共享</span>`}
          </div>
        </div>
        <button class="secondary-button" type="button" data-select-record="${record.id}">查看</button>
      </div>
      <p>${escapeHtml(record.note || "暂无备注")}</p>
      <div class="chips">
        <span class="chip">投递渠道：${escapeHtml(record.channel || "未填写")}</span>
        <span class="chip">投递时间：${escapeHtml(record.appliedAt || "未填写")}</span>
        <span class="chip">面试轮次：${record.rounds.length}</span>
        <span class="chip">问题：${questionCount}</span>
        ${libraryMode ? `<span class="chip">作者：${escapeHtml(owner?.name || "成员")}</span>` : ""}
      </div>
    </article>
  `;
}

function renderSelectedRecord(user) {
  const record =
    state.records.find((item) => item.id === state.selectedRecordId && canViewRecord(item, user)) ||
    ownRecords(user)[0];

  if (!record) {
    return `<div class="empty"><strong>选择一家公司</strong><p>新增记录后，这里会显示面试轮次和问题复盘。</p></div>`;
  }

  state.selectedRecordId = record.id;
  const editable = canEditRecord(record, user);

  return `
    <div class="panel-head">
      <div>
        <h3>${escapeHtml(record.company)}</h3>
        <p class="hint">${escapeHtml(record.position)} · ${escapeHtml(record.status)}</p>
      </div>
      ${
        editable
          ? `
            <div class="toolbar">
              <button class="secondary-button" type="button" data-open-round-modal="${record.id}">新增轮次</button>
              <button class="ghost-button" type="button" data-open-record-modal="${record.id}">编辑</button>
            </div>
          `
          : ""
      }
    </div>
    <div class="notice">
      ${record.visibility === "shared" ? "这条记录已共享给小圈子。" : "这条记录仅你自己可见。"}
      ${record.shareImages ? "图片也已共享，请确认已打码敏感信息。" : "图片未共享。"}
    </div>
    ${renderImages(record.images, record.shareImages || editable, editable, "record", record.id)}
    <div class="detail">
      ${record.rounds.length ? record.rounds.map((round) => renderRound(round, record, editable)).join("") : `<div class="empty"><strong>还没有面试轮次</strong><p>添加一面、二面或 HR 面，再记录具体问题。</p></div>`}
    </div>
  `;
}

function renderRound(round, record, editable) {
  return `
    <section class="round">
      <div class="record-header">
        <div>
          <h4>${escapeHtml(round.name)}</h4>
          <div class="record-meta">
            <span class="chip">${escapeHtml(round.date || "未填时间")}</span>
            <span class="chip">${escapeHtml(round.format || "未填形式")}</span>
            <span class="chip">${escapeHtml(round.result || "未填结果")}</span>
          </div>
        </div>
        ${
          editable
            ? `<button class="secondary-button" type="button" data-open-question-modal="${record.id}:${round.id}">新增问题</button>`
            : ""
        }
      </div>
      <p>${escapeHtml(round.summary || "暂无本轮总结")}</p>
      ${
        round.questions.length
          ? round.questions.map((question) => renderQuestion(question, record, round, editable)).join("")
          : `<div class="empty"><strong>还没有问题</strong><p>把这家公司具体问了什么写下来，这是经验库最有价值的部分。</p></div>`
      }
    </section>
  `;
}

function renderQuestion(question, record, round, editable) {
  return `
    <article class="question">
      <div class="record-header">
        <div>
          <h4>${escapeHtml(question.content)}</h4>
          <div class="record-meta">
            <span class="chip">${escapeHtml(question.type || "未分类")}</span>
          </div>
        </div>
        ${
          editable
            ? `<button class="ghost-button" type="button" data-open-question-modal="${record.id}:${round.id}:${question.id}">编辑</button>`
            : ""
        }
      </div>
      <div class="qa-grid">
        <div class="qa-box"><strong>我的回答</strong><br />${escapeHtml(question.answer || "未填写")}</div>
        <div class="qa-box"><strong>复盘改进</strong><br />${escapeHtml(question.review || "未填写")}</div>
        <div class="qa-box"><strong>更好的回答思路</strong><br />${escapeHtml(question.betterAnswer || "未填写")}</div>
      </div>
      ${renderImages(question.images, record.shareImages || editable, editable, "question", `${record.id}:${round.id}:${question.id}`)}
    </article>
  `;
}

function renderImages(images = [], visible, editable, scope, targetId) {
  if (!visible && images.length) {
    return `<div class="notice">这部分图片未共享，仅作者本人可见。</div>`;
  }

  return `
    ${
      editable
        ? `<div class="field full" style="margin-top: 12px;">
            <label>添加图片附件</label>
            <input type="file" accept="image/*" multiple data-image-upload="${scope}:${targetId}" />
            <p class="hint">建议先给手机号、微信、邮箱、面试链接、HR 信息打码。</p>
          </div>`
        : ""
    }
    ${
      visible && images.length
        ? `<div class="image-grid">
            ${images
              .map(
                (image) => `
                  <div class="image-tile">
                    <img src="${image.data}" alt="${escapeHtml(image.name)}" />
                    <div>
                      <small>${escapeHtml(image.name)}</small>
                      ${
                        editable
                          ? `<button class="danger-button" type="button" data-delete-image="${scope}:${targetId}:${image.id}">删</button>`
                          : ""
                      }
                    </div>
                  </div>
                `,
              )
              .join("")}
          </div>`
        : ""
    }
  `;
}

function bindEvents() {
  document.querySelectorAll("[data-auth-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.authMode = button.dataset.authMode;
      render();
    });
  });

  document.getElementById("authForm")?.addEventListener("submit", handleAuth);
  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    state.currentUserId = null;
    sessionStorage.removeItem(SESSION_KEY);
    render();
  });

  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeView = button.dataset.view;
      render();
    });
  });

  document.querySelectorAll("[data-select-record]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedRecordId = button.dataset.selectRecord;
      state.activeView = "mine";
      render();
    });
  });

  document.querySelectorAll("[data-open-record-modal]").forEach((button) => {
    button.addEventListener("click", () => openRecordModal(button.dataset.openRecordModal || ""));
  });

  document.querySelectorAll("[data-open-round-modal]").forEach((button) => {
    button.addEventListener("click", () => openRoundModal(button.dataset.openRoundModal));
  });

  document.querySelectorAll("[data-open-question-modal]").forEach((button) => {
    button.addEventListener("click", () => openQuestionModal(button.dataset.openQuestionModal));
  });

  document.querySelectorAll("[data-image-upload]").forEach((input) => {
    input.addEventListener("change", (event) => handleImageUpload(event, input.dataset.imageUpload));
  });

  document.getElementById("adminSettingsForm")?.addEventListener("submit", handleAdminSettings);

  document.querySelectorAll("[data-delete-image]").forEach((button) => {
    button.addEventListener("click", () => deleteImage(button.dataset.deleteImage));
  });

  document.getElementById("librarySearch")?.addEventListener("input", filterLibrary);
  document.getElementById("libraryStatus")?.addEventListener("change", filterLibrary);
}

async function handleAdminSettings(event) {
  event.preventDefault();
  const form = new FormData(event.target);
  const message = document.getElementById("adminMessage");

  const settings = {
    inviteCode: String(form.get("inviteCode") || "").trim(),
    memberLimit: Number(form.get("memberLimit") || 0),
    allowRegistration: String(form.get("allowRegistration")) === "true",
  };

  try {
    const response = await fetch(apiUrl("/api/admin/settings"), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentUserId: state.currentUserId,
        settings,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "保存失败。");

    state.users = data.users;
    state.records = data.records;
    state.settings = data.settings || settings;
    render();
  } catch (error) {
    if (message) {
      message.innerHTML = `<div class="message error" style="margin-top: 12px;">${escapeHtml(error.message)}</div>`;
    }
  }
}

async function handleAuth(event) {
  event.preventDefault();
  const form = new FormData(event.target);
  const email = String(form.get("email") || "").trim().toLowerCase();
  const password = String(form.get("password") || "");
  const message = document.getElementById("authMessage");

  if (state.authMode === "login") {
    try {
      const response = await fetch(apiUrl("/api/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "登录失败。");

      state.currentUserId = data.user.id;
      state.users = data.state.users;
      state.records = data.state.records;
      state.settings = data.state.settings || state.settings;
      sessionStorage.setItem(SESSION_KEY, state.currentUserId);
      render();
    } catch (error) {
      message.innerHTML = `<div class="message error">${escapeHtml(error.message)}</div>`;
    }
    return;
  }

  const name = String(form.get("name") || "").trim();
  const invite = String(form.get("invite") || "").trim();

  try {
    const response = await fetch(apiUrl("/api/register"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, invite }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "注册失败。");

    state.currentUserId = data.user.id;
    state.users = data.state.users;
    state.records = data.state.records;
    state.settings = data.state.settings || state.settings;
    sessionStorage.setItem(SESSION_KEY, state.currentUserId);
    render();
  } catch (error) {
    message.innerHTML = `<div class="message error">${escapeHtml(error.message)}</div>`;
  }
}

function openRecordModal(recordId = "") {
  const user = currentUser();
  const record = state.records.find((item) => item.id === recordId);
  const editing = Boolean(record);

  document.getElementById("modalRoot").innerHTML = `
    <div class="modal-backdrop">
      <form class="modal" id="recordForm">
        <div class="modal-head">
          <h3>${editing ? "编辑公司记录" : "新增公司记录"}</h3>
          <button class="ghost-button" type="button" data-close-modal>关闭</button>
        </div>
        <div class="form-grid">
          ${field("company", "公司名称", record?.company || "", "例如：腾讯")}
          ${field("position", "岗位名称", record?.position || "", "例如：产品运营实习生")}
          ${field("channel", "投递渠道", record?.channel || "", "例如：官网 / Boss 直聘")}
          ${field("appliedAt", "投递时间", record?.appliedAt || "", "", "date")}
          <div class="field">
            <label for="status">当前状态</label>
            <select id="status" name="status">
              ${["准备中", "已投递", "笔试中", "面试中", "Offer", "失败"]
                .map((status) => `<option ${record?.status === status ? "selected" : ""}>${status}</option>`)
                .join("")}
            </select>
          </div>
          <div class="field">
            <label for="visibility">可见范围</label>
            <select id="visibility" name="visibility">
              <option value="private" ${record?.visibility !== "shared" ? "selected" : ""}>仅自己可见</option>
              <option value="shared" ${record?.visibility === "shared" ? "selected" : ""}>小圈子可见</option>
            </select>
          </div>
          <div class="field">
            <label for="shareImages">图片共享</label>
            <select id="shareImages" name="shareImages">
              <option value="false" ${!record?.shareImages ? "selected" : ""}>图片不共享</option>
              <option value="true" ${record?.shareImages ? "selected" : ""}>图片也共享</option>
            </select>
          </div>
          <div class="field full">
            <label for="note">备注 / 整体复盘</label>
            <textarea id="note" name="note" placeholder="记录岗位 JD 重点、投递背景、整体感受">${escapeHtml(record?.note || "")}</textarea>
          </div>
        </div>
        <div class="notice" style="margin-top: 12px;">共享前请确认内容里没有手机号、微信、邮箱、面试链接或公司保密资料。</div>
        <div class="modal-actions">
          ${editing ? `<button class="danger-button" type="button" data-delete-record="${record.id}">删除</button>` : ""}
          <button class="primary-button" type="submit">保存</button>
        </div>
      </form>
    </div>
  `;

  document.querySelector("[data-close-modal]").addEventListener("click", closeModal);
  document.getElementById("recordForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.target);
    const payload = {
      company: String(form.get("company") || "").trim(),
      position: String(form.get("position") || "").trim(),
      channel: String(form.get("channel") || "").trim(),
      appliedAt: String(form.get("appliedAt") || ""),
      status: String(form.get("status") || "准备中"),
      visibility: String(form.get("visibility") || "private"),
      shareImages: String(form.get("shareImages")) === "true",
      note: String(form.get("note") || "").trim(),
    };

    if (editing) {
      Object.assign(record, payload);
    } else {
      const newRecord = {
        id: uid("r"),
        ownerId: user.id,
        ...payload,
        images: [],
        rounds: [],
      };
      state.records.unshift(newRecord);
      state.selectedRecordId = newRecord.id;
    }
    saveState();
    closeModal();
    state.activeView = "mine";
    render();
  });

  document.querySelector("[data-delete-record]")?.addEventListener("click", (event) => {
    const id = event.target.dataset.deleteRecord;
    state.records = state.records.filter((item) => item.id !== id);
    state.selectedRecordId = null;
    saveState();
    closeModal();
    render();
  });
}

function openRoundModal(recordId) {
  document.getElementById("modalRoot").innerHTML = `
    <div class="modal-backdrop">
      <form class="modal" id="roundForm">
        <div class="modal-head">
          <h3>新增面试轮次</h3>
          <button class="ghost-button" type="button" data-close-modal>关闭</button>
        </div>
        <div class="form-grid">
          ${field("name", "轮次名称", "", "例如：一面 / HR 面")}
          ${field("date", "面试时间", "", "", "date")}
          ${field("format", "面试形式", "", "例如：视频面试 / 线下面试")}
          ${field("result", "本轮结果", "", "例如：待反馈 / 通过 / 未通过")}
          <div class="field full">
            <label for="summary">本轮总结</label>
            <textarea id="summary" name="summary" placeholder="这轮主要考察什么，自己哪里答得好，哪里需要补">${""}</textarea>
          </div>
        </div>
        <div class="modal-actions">
          <button class="primary-button" type="submit">保存</button>
        </div>
      </form>
    </div>
  `;

  document.querySelector("[data-close-modal]").addEventListener("click", closeModal);
  document.getElementById("roundForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const record = state.records.find((item) => item.id === recordId);
    const form = new FormData(event.target);
    record.rounds.push({
      id: uid("round"),
      name: String(form.get("name") || "").trim() || "未命名轮次",
      date: String(form.get("date") || ""),
      format: String(form.get("format") || ""),
      result: String(form.get("result") || ""),
      summary: String(form.get("summary") || ""),
      questions: [],
    });
    saveState();
    closeModal();
    render();
  });
}

function openQuestionModal(value) {
  const [recordId, roundId, questionId] = value.split(":");
  const record = state.records.find((item) => item.id === recordId);
  const round = record.rounds.find((item) => item.id === roundId);
  const question = round.questions.find((item) => item.id === questionId);
  const editing = Boolean(question);

  document.getElementById("modalRoot").innerHTML = `
    <div class="modal-backdrop">
      <form class="modal" id="questionForm">
        <div class="modal-head">
          <h3>${editing ? "编辑面试问题" : "新增面试问题"}</h3>
          <button class="ghost-button" type="button" data-close-modal>关闭</button>
        </div>
        <div class="form-grid">
          ${field("type", "问题类型", question?.type || "", "例如：项目经历 / 职业规划")}
          <div class="field full">
            <label for="content">公司提出的问题</label>
            <textarea id="content" name="content" required placeholder="把面试官原话尽量完整记录下来">${escapeHtml(question?.content || "")}</textarea>
          </div>
          <div class="field full">
            <label for="answer">我的回答</label>
            <textarea id="answer" name="answer" placeholder="记录当时怎么答的">${escapeHtml(question?.answer || "")}</textarea>
          </div>
          <div class="field full">
            <label for="review">复盘改进</label>
            <textarea id="review" name="review" placeholder="哪里没讲清楚，哪里可以补数据、补逻辑">${escapeHtml(question?.review || "")}</textarea>
          </div>
          <div class="field full">
            <label for="betterAnswer">更好的回答思路</label>
            <textarea id="betterAnswer" name="betterAnswer" placeholder="下次遇到类似问题准备怎么答">${escapeHtml(question?.betterAnswer || "")}</textarea>
          </div>
        </div>
        <div class="modal-actions">
          ${editing ? `<button class="danger-button" type="button" data-delete-question="${recordId}:${roundId}:${question.id}">删除</button>` : ""}
          <button class="primary-button" type="submit">保存</button>
        </div>
      </form>
    </div>
  `;

  document.querySelector("[data-close-modal]").addEventListener("click", closeModal);
  document.getElementById("questionForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.target);
    const payload = {
      type: String(form.get("type") || "").trim(),
      content: String(form.get("content") || "").trim(),
      answer: String(form.get("answer") || "").trim(),
      review: String(form.get("review") || "").trim(),
      betterAnswer: String(form.get("betterAnswer") || "").trim(),
    };

    if (editing) {
      Object.assign(question, payload);
    } else {
      round.questions.push({ id: uid("q"), ...payload, images: [] });
    }
    saveState();
    closeModal();
    render();
  });

  document.querySelector("[data-delete-question]")?.addEventListener("click", () => {
    round.questions = round.questions.filter((item) => item.id !== question.id);
    saveState();
    closeModal();
    render();
  });
}

function field(name, label, value = "", placeholder = "", type = "text") {
  return `
    <div class="field">
      <label for="${name}">${label}</label>
      <input id="${name}" name="${name}" type="${type}" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}" />
    </div>
  `;
}

function closeModal() {
  document.getElementById("modalRoot").innerHTML = "";
}

function handleImageUpload(event, descriptor) {
  const [scope, ...ids] = descriptor.split(":");
  const files = Array.from(event.target.files || []);
  if (!files.length) return;

  Promise.all(
    files.map(
      (file) =>
        new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () =>
            resolve({
              id: uid("img"),
              name: file.name,
              data: reader.result,
              createdAt: new Date().toISOString(),
            });
          reader.readAsDataURL(file);
        }),
    ),
  ).then((images) => {
    if (scope === "record") {
      const record = state.records.find((item) => item.id === ids[0]);
      record.images.push(...images);
    }

    if (scope === "question") {
      const [recordId, roundId, questionId] = ids;
      const record = state.records.find((item) => item.id === recordId);
      const round = record.rounds.find((item) => item.id === roundId);
      const question = round.questions.find((item) => item.id === questionId);
      question.images.push(...images);
    }

    saveState();
    render();
  });
}

function deleteImage(descriptor) {
  const [scope, ...ids] = descriptor.split(":");

  if (scope === "record") {
    const [recordId, imageId] = ids;
    const record = state.records.find((item) => item.id === recordId);
    record.images = record.images.filter((image) => image.id !== imageId);
  }

  if (scope === "question") {
    const [recordId, roundId, questionId, imageId] = ids;
    const record = state.records.find((item) => item.id === recordId);
    const round = record.rounds.find((item) => item.id === roundId);
    const question = round.questions.find((item) => item.id === questionId);
    question.images = question.images.filter((image) => image.id !== imageId);
  }

  saveState();
  render();
}

function filterLibrary() {
  const search = document.getElementById("librarySearch").value.trim().toLowerCase();
  const status = document.getElementById("libraryStatus").value;

  document.querySelectorAll("[data-record-card]").forEach((card) => {
    const matchesSearch = !search || card.dataset.search.toLowerCase().includes(search);
    const matchesStatus = !status || card.dataset.status === status;
    card.style.display = matchesSearch && matchesStatus ? "" : "none";
  });
}

init();
