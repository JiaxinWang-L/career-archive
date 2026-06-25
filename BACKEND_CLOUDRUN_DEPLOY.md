# CloudBase 云托管后端部署

目标：把后端从「普通云函数 api」迁移到「云托管 Node.js 服务」，以后后端也可以通过 GitHub 自动部署，不再手动上传 `api-upload.zip`。

## 1. 云托管服务配置

在 CloudBase 控制台进入：

```text
云函数 / 托管 / 主机 → 云托管
```

选择：

```text
使用 Git 仓库部署
```

仓库选择：

```text
JiaxinWang-L/career-archive
```

分支：

```text
main
```

服务配置：

```text
服务名称：career-api
服务目录：backend
部署方式：Dockerfile / 容器镜像构建
运行环境：Node.js 18
安装命令：npm install
启动命令：npm start
端口：80 或 3000
```

如果控制台要求 Dockerfile，按你的“服务目录”填写：

```text
服务目录已经填 backend：Dockerfile
服务目录留空或填仓库根目录：backend/Dockerfile
```

## 2. 环境变量

添加这些环境变量：

```text
TCB_ENV=career-archive-d6g3v2mm182ce6b11
APP_STATE_ID=career-archive
APP_STATE_COLLECTION=app_state
INVITE_CODE=CAREER2026
MEMBER_LIMIT=8
```

说明：

- `TCB_ENV` 是 CloudBase 环境 ID。
- `APP_STATE_ID` 和 `APP_STATE_COLLECTION` 指向现有数据库，不会迁移或清空数据。
- 邀请码和成员名额只是初始化默认值，之后以管理后台保存到数据库里的设置为准。

如果 `/api/db-check` 返回 `SIGN_PARAM_INVALID` 或 `secret id error`，说明云托管后端没有拿到有效的腾讯云 API 密钥。需要在云托管环境变量里继续添加：

```text
TENCENTCLOUD_SECRETID=你的 SecretId
TENCENTCLOUD_SECRETKEY=你的 SecretKey
```

注意：

- 这两个值只能放在 CloudBase 云托管环境变量里。
- 不要写进 `config.js`、`app.js`、GitHub、README 或任何前端文件。
- 配好后重新部署云托管，再打开 `/api/debug`，确认 `hasSecretId` 和 `hasSecretKey` 都是 `true`。

## 3. 验证后端

部署成功后，CloudBase 会给一个云托管访问域名。

先打开根地址：

```text
https://你的云托管域名/
```

看到：

```json
{"ok":true,"service":"career-archive-backend"}
```

如果根地址可以打开，但 `/api/state` 显示 CloudBase 的 `INVALID_PATH`、`502` 或 `503`，这是云托管默认域名的路由限制。当前代码已经兼容这种情况，改用下面这个验证地址：

```text
https://你的云托管域名/?apiPath=%2Fapi%2Fstate
```

应该返回包含 `users`、`records`、`settings` 的 JSON。

### 如果看到 502 或 503

502 / 503 通常表示云托管容器没有正常对外服务，不是前端代码问题。优先检查：

```text
服务目录：backend
Dockerfile：Dockerfile
服务端口：80 或 3000
启动命令：npm start
```

然后进入云托管服务的日志，搜索这一行：

```text
career archive backend listening
```

能看到这行，说明 Node 服务已经启动；如果看不到，说明容器没有正常启动，需要先看部署日志里的报错。

当前后端在生产环境会同时监听 80 和 3000，所以控制台端口填 80 或 3000 都可以。若仍然 502，优先看日志里是否出现 `career archive backend listening on 80` 或 `career archive backend listening on 3000`。

## 4. 切换前端

确认云托管后端可用后，修改：

```text
config.js
```

把 `apiBase` 改成新的云托管域名：

```js
window.CAREER_ARCHIVE_CONFIG = {
  apiBase: "https://你的云托管域名",
};
```

然后用 GitHub Desktop：

```text
Commit to main
Push origin
```

CloudBase 静态网站托管自动部署后，前端就会改用云托管后端。

## 5. 保留旧云函数

迁移完成并验证稳定前，不要删除旧的普通云函数 `api`。

如果新后端出问题，只需要把 `config.js` 改回旧云函数域名：

```text
https://career-archive-d6g3v2mm182ce6b11-1394551417.ap-shanghai.app.tcloudbase.com
```
