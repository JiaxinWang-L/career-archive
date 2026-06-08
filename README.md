# 求职成长档案

一个邀请制求职经验库，用来记录公司投递、面试轮次、面试问题、回答复盘和图片附件。当前版本面向小范围使用：管理员可以开放名额，成员可以记录自己的经历，也可以选择把部分记录共享给小圈子。

## 当前架构

```text
前端页面：CloudBase 静态网站托管
后端接口：CloudBase 云函数 api
数据存储：CloudBase 文档型数据库 app_state
代码托管：GitHub
```


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



## 数据在哪里


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



## 后续建议

- 把图片从数据库 JSON 迁移到 CloudBase 云存储。
- 把用户密码改成更安全的登录方案。
- 增加成员禁用、删除、重置密码功能。
- 增加导出 Excel / PDF。
- 增加按公司、岗位、问题类型的统计分析。
