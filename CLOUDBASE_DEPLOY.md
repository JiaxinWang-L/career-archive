# CloudBase 公网部署步骤

你的环境 ID：

```text
career-archive-d6g3v2mm182ce6b11
```

## 第 1 步：创建数据库集合

1. 打开 CloudBase 控制台。
2. 进入环境：`career-archive-d6g3v2mm182ce6b11`。
3. 找到「数据库」。
4. 新建集合，集合名称填：

```text
app_state
```

5. 权限先选择「仅创建者可读写」或默认安全权限。

说明：真正读写会通过云函数完成，前端用户不会直接操作数据库。

## 第 2 步：部署云函数 api

### 方式 A：用控制台上传

1. 进入「云函数」。
2. 新建云函数，函数名填：

```text
api
```

3. 运行环境选择：

```text
Node.js 18
```

4. 把本地文件夹上传：

```text
C:\Users\admin\Documents\就业指导APP建立\cloudfunctions\api
```

5. 环境变量填：

```text
INVITE_CODE=CAREER2026
MEMBER_LIMIT=5
APP_STATE_ID=career-archive
APP_STATE_COLLECTION=app_state
```

6. 保存并部署。

### 方式 B：用 CloudBase CLI

如果你愿意用命令行，可以安装并登录 CloudBase CLI 后，在项目根目录运行：

```powershell
tcb fn deploy api --httpFn -e career-archive-d6g3v2mm182ce6b11
```

如果提示确认，选确认即可。

## 第 3 步：打开 HTTP 访问服务

1. 进入 CloudBase 控制台。
2. 找到「HTTP 访问服务」。
3. 新增路径：

```text
/api
```

4. 绑定云函数：

```text
api
```

5. 保存。

保存后你会得到一个公网访问域名，类似：

```text
https://career-archive-d6g3v2mm182ce6b11.ap-shanghai.app.tcloudbase.com
```

最终接口应该能访问：

```text
https://你的域名/api/state
```

## 第 4 步：修改前端 API 地址

打开本地文件：

```text
C:\Users\admin\Documents\就业指导APP建立\config.js
```

把：

```js
apiBase: "",
```

改成你的 CloudBase HTTP 访问域名，例如：

```js
apiBase: "https://career-archive-d6g3v2mm182ce6b11.ap-shanghai.app.tcloudbase.com",
```

注意：这里不要在末尾加 `/api`，代码会自动请求 `/api/state`、`/api/login`、`/api/register`。

## 第 5 步：部署静态网站

进入 CloudBase 控制台的「静态网站托管」。

上传这 4 个文件到网站根目录：

```text
index.html
styles.css
app.js
config.js
```

上传完成后，打开静态网站默认域名，就能看到登录页面。

## 第 6 步：测试

用管理员账号登录：

```text
admin@example.com
123456
```

测试这几件事：

- 能登录
- 能新增公司记录
- 能新增面试轮次
- 能新增面试问题
- 能切换「仅自己可见 / 小圈子可见」
- 退出后再登录，数据还在

## 数据在哪里

部署到 CloudBase 后，数据存在：

```text
CloudBase 数据库
集合：app_state
文档 ID：career-archive
字段：data
```

你可以在 CloudBase 控制台的数据库里直接查看和管理内容。

## 现在这个版本的限制

为了最快部署，图片仍然会以 base64 存在数据库 JSON 里。少量图片没问题；如果后面图片很多，下一步要改成「图片放云存储，数据库只保存图片地址」。
