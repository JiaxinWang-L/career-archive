# 求职成长档案

这是一个邀请制求职经验库。当前项目已经支持两种模式：

- 本地试用模式：数据存在 `data/db.json`
- 公网共享模式：数据存在 Supabase 云端 `app_state` 表

## 数据存储位置

本地试用时：

```text
C:\Users\admin\Documents\就业指导APP建立\data\db.json
```

公网共享时：

```text
Supabase PostgreSQL
表名：public.app_state
记录 id：career-archive
字段：data
```

当前公网 MVP 会把用户、求职记录、面试轮次、问题复盘和图片 base64 都放在 `app_state.data` 里。这个方式最快能上线，但图片多了以后建议改成 Supabase Storage。

## 本地启动

```powershell
cd C:\Users\admin\Documents\就业指导APP建立
& 'C:\Users\admin\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' server.js
```

浏览器打开：

```text
http://localhost:3000
```

## Supabase 配置

1. 创建 Supabase 项目。
2. 打开 Supabase SQL Editor。
3. 执行：

```text
supabase/schema.sql
```

4. 在项目里准备环境变量：

```text
SUPABASE_URL=https://你的项目编号.supabase.co
SUPABASE_SERVICE_ROLE_KEY=你的 service role key
SUPABASE_APP_STATE_ID=career-archive
PORT=3000
```

注意：`SUPABASE_SERVICE_ROLE_KEY` 只能放在服务器环境变量里，不能写进前端页面，也不要提交到 Git。

## 上传本地数据到 Supabase

先在当前 PowerShell 临时设置环境变量：

```powershell
$env:SUPABASE_URL="https://你的项目编号.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="你的 service role key"
$env:SUPABASE_APP_STATE_ID="career-archive"
```

然后运行：

```powershell
& 'C:\Users\admin\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' scripts/upload-db-to-supabase.js
```

上传成功后，`data/db.json` 里的数据会进入 Supabase 的 `app_state.data`。

## 用 Supabase 云端数据启动

同样先设置环境变量：

```powershell
$env:SUPABASE_URL="https://你的项目编号.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="你的 service role key"
$env:SUPABASE_APP_STATE_ID="career-archive"
```

再启动：

```powershell
& 'C:\Users\admin\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' server.js
```

如果环境变量存在，服务会读写 Supabase；如果没有环境变量，会自动回到本地 `data/db.json`。

## 公网部署建议

当前 `server.js` 是一个常驻 Node 服务，适合部署到：

- Render
- Railway
- Fly.io
- 自己的云服务器

部署时需要配置环境变量：

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_APP_STATE_ID
PORT
```

部署成功后，别人就可以通过公网地址访问你的应用。

## 登录信息

管理员账号：

- 邮箱：`admin@example.com`
- 密码：`123456`

成员注册邀请码：

- `CAREER2026`

当前限制：

- 最多 5 个成员账号
- 管理员账号不占成员名额

## 隐私规则

第一版遵循：

- 新增内容默认仅自己可见
- 只有主动设为“小圈子可见”的记录会进入经验数据库
- 图片默认不共享
- 图片需要单独打开共享
- 用户可以随时把共享记录改回私密

上传截图前，建议先打码手机号、微信、邮箱、HR 姓名、会议链接和简历个人信息。

## 后续升级

公网 MVP 已经可以用 Supabase 存数据。后续建议继续升级：

- 用户登录迁到 Supabase Auth
- 图片迁到 Supabase Storage
- 数据从 `app_state.data` 拆成独立表
- 用 Row Level Security 做数据库级隐私权限
