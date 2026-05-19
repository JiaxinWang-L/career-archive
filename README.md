# 求职成长档案

一个邀请制求职经验库，用来记录公司投递、面试轮次、面试问题、回答复盘和图片附件。当前版本面向小范围使用：管理员可以开放名额，成员可以记录自己的经历，也可以选择把部分记录共享给小圈子。

## 当前架构

```text
前端页面：CloudBase 静态网站托管
后端接口：CloudBase 云函数 api
数据存储：CloudBase 文档型数据库 app_state
代码托管：GitHub
```

当前 CloudBase 环境：

```text
career-archive-d6g3v2mm182ce6b11
```

后端 API 域名：

```text
https://career-archive-d6g3v2mm182ce6b11-1394551417.ap-shanghai.app.tcloudbase.com
```

前端访问地址：

```text
https://career-archive-d6g3v2mm182ce6b11-1394551417.tcloudbaseapp.com/career-archive/index.html
```

## 主要功能

- 登录和注册
- 邀请码注册
- 管理员后台
- 修改邀请码、开放名额、注册开关
- 查看成员列表
- 公司求职记录
- 面试轮次
- 面试问题
- 我的回答、复盘改进、更好的回答思路
- 图片附件
- 私密 / 小圈子共享
- 图片单独共享

## 默认账号

管理员账号：

```text
admin@example.com
123456
```

默认邀请码：

```text
CAREER2026
```

上线后建议第一时间进入「管理后台」修改邀请码。

## 数据在哪里

公网版本的数据存在 CloudBase 文档型数据库：

```text
集合：app_state
文档 ID：career-archive
字段：data
```

`data` 里包含：

- settings：邀请码、成员名额、注册开关
- users：用户列表
- records：求职记录、面试轮次、面试问题、图片附件

当前版本为了快速上线，图片会以 base64 文本保存在数据库 JSON 里。少量图片可以使用；如果图片变多，后续应该迁移到 CloudBase 云存储。

## 本地文件说明

```text
index.html                 页面入口
styles.css                 页面样式
app.js                     前端交互逻辑
config.js                  云函数 API 地址配置
cloudfunctions/api/index.js CloudBase 云函数后端
cloudfunctions/api/package.json 云函数依赖
cloudbaserc.json           CloudBase 环境配置
CLOUDBASE_DEPLOY.md        手动部署步骤
```

## 日常修改流程

推荐使用 GitHub Desktop。

1. 修改本地文件。
2. 打开 GitHub Desktop。
3. 在左下角 Summary 填写本次修改说明。
4. 点击 `Commit to main`。
5. 点击 `Push origin`。
6. CloudBase 从 GitHub 重新部署前端或云函数。

常见修改范围：

```text
改页面、样式、前端功能：
index.html
styles.css
app.js
config.js

改登录、注册、后台接口、数据保存逻辑：
cloudfunctions/api/index.js
```

## 手动部署前端

如果不用 GitHub 自动部署，也可以手动上传。

前端文件：

```text
index.html
styles.css
app.js
config.js
```

部署到 CloudBase 静态网站托管时：

```text
项目框架：其他
目标目录：./
安装命令：空
构建命令：空
构建产物目录：./
部署路径：/
```

如果使用当前控制台的部署路径 `/career-archive`，访问地址会是：

```text
https://career-archive-d6g3v2mm182ce6b11-1394551417.tcloudbaseapp.com/career-archive/index.html
```

## 手动部署云函数

云函数源码在：

```text
cloudfunctions/api
```

如果需要手动上传，先打包：

```powershell
Compress-Archive -Path .\cloudfunctions\api\index.js,.\cloudfunctions\api\package.json -DestinationPath .\cloudfunctions\api.zip -Force
```

然后在 CloudBase 云函数 `api` 页面上传 `api.zip`。

云函数配置：

```text
函数类型：普通函数
运行环境：Nodejs 18.15
执行方法：index.main
执行超时时间：20 秒
自动安装依赖：开启
```

环境变量：

```text
INVITE_CODE=CAREER2026
MEMBER_LIMIT=5
APP_STATE_ID=career-archive
APP_STATE_COLLECTION=app_state
```

这些环境变量主要用于首次初始化。初始化后，邀请码和名额可以在管理员后台修改。

## 隐私规则

- 新增记录默认仅自己可见。
- 只有主动设为「小圈子可见」的记录会进入经验数据库。
- 图片默认不共享。
- 图片需要单独开启共享。
- 用户可以随时把共享记录改回私密。
- 普通成员看不到管理后台，也不能修改邀请码和名额。

上传截图前，建议先打码：

```text
手机号、微信、邮箱、HR 姓名、会议链接、简历个人信息
```

## 常见问题

### 登录页提示共享服务未启动

检查 `config.js`：

```js
window.CAREER_ARCHIVE_CONFIG = {
  apiBase: "https://career-archive-d6g3v2mm182ce6b11-1394551417.ap-shanghai.app.tcloudbase.com",
};
```

注意引号必须是英文直引号 `" "`，不能是中文弯引号 `“ ”`。

### 后端接口是否正常

打开：

```text
https://career-archive-d6g3v2mm182ce6b11-1394551417.ap-shanghai.app.tcloudbase.com/api/state
```

如果看到 JSON，说明后端接口正常。

### 前端改了但网页没变化

先强制刷新：

```text
Ctrl + F5
```

如果还是没变化，确认是否已经把修改推送到 GitHub，或者是否已经重新部署 CloudBase 静态网站。

## 后续建议

- 把图片从数据库 JSON 迁移到 CloudBase 云存储。
- 把用户密码改成更安全的登录方案。
- 增加成员禁用、删除、重置密码功能。
- 增加导出 Excel / PDF。
- 增加按公司、岗位、问题类型的统计分析。
