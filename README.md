# 英学自如

这是一个英语学习网站原型，包含每日金句、每日单词、每日阅读、每日新闻、场景演练和学习复盘。

## 运行方式

需要 Node.js 18 或以上版本。

```bash
npm install
npm start
```

启动后打开：

```text
http://localhost:3000
```

## 部署到公网

推荐使用 Render，因为本项目需要运行 `server.js` 后端接口，普通静态网站托管无法自动聚合 RSS。

### Render 部署步骤

1. 把本文件夹上传到一个 GitHub 仓库。
2. 打开 Render，选择 `New` → `Web Service`。
3. 连接你的 GitHub 仓库。
4. Render 会读取 `render.yaml`，自动使用以下配置：
   - 环境：Node
   - 构建命令：`npm install`
   - 启动命令：`npm start`
5. 部署完成后，Render 会给你一个公网链接，例如：

```text
https://yingxue-ziru.onrender.com
```

这个链接可以在电脑、iPhone Safari、安卓浏览器里直接打开。

### 如果手动配置

如果不用 `render.yaml`，手动填写：

```text
Build Command: npm install
Start Command: npm start
Node Version: 20
```

## 自动聚合接口

网站会调用：

```text
/api/daily-content
```

该接口会从公开 RSS 源聚合内容，并返回：

- `reading`：每日阅读
- `news`：每日新闻
- `sources`：当前聚合源列表

## 当前接入源

阅读源：

- BBC Technology
- NPR Business
- NASA News

新闻源：

- BBC World
- NPR World
- The Guardian World

## 后续接入更多平台

可以在 `server.js` 中修改：

- `readingFeeds`
- `newsFeeds`

如果要接入需要授权的平台，例如付费新闻 API、YouTube、播客平台或商业内容源，需要补充对应平台的 API Key、OAuth 或授权接口。
