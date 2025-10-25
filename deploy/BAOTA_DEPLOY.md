# 宝塔面板 (CentOS 7) 部署指南

本文介绍如何在宝塔面板的 CentOS 7 服务器上部署 SafeChat，包括后端 Node.js 服务与现代化前端界面。推荐先阅读根目录 `README.md` 了解功能与基础命令。

## 1. 打包产物

仓库提供脚本 `deploy/create-baota-package.sh`，可在本地或 CI 环境执行，一键生成包含前端与后端的发布包：

```bash
bash deploy/create-baota-package.sh
```

脚本会在 `dist/` 目录下产出 `safechat-baota-release.tar.gz` 与 `safechat-baota-release.zip` 两个文件（内容完全相同），内部结构如下：

```
safechat/
├── backend/            # Node.js + Express + Socket.IO 服务代码
│   ├── package.json
│   ├── package-lock.json
│   └── app.js 等源文件
├── frontend/
│   └── modern/         # 现代化前端静态页面，可直接部署为站点根目录
├── start-safechat.sh   # 便捷启动脚本，封装 npm install + npm start
└── README.md           # 精简版部署说明
```

> 若您希望自行打包，可参考脚本逻辑手动准备同样的目录结构。

## 2. 上传到宝塔

1. 登录宝塔面板，进入 **文件** 管理。
2. 将 `safechat-baota-release.tar.gz` 或 `safechat-baota-release.zip` 上传至目标目录（例如 `/www/wwwroot/`）。
3. 在宝塔中解压，得到 `safechat/` 目录。

## 3. 配置 Node 项目

1. 在宝塔左侧菜单选择 **网站** → **Node项目** → **添加项目**。
2. 选择“上传已解压的项目”，填入以下关键参数：
   - **项目根目录**：`/www/wwwroot/safechat/backend`
   - **启动文件**：`start-safechat.sh`
   - **运行目录**：`/www/wwwroot/safechat`
   - **运行模式**：推荐 `pm2`，方便守护进程。
3. 在 **环境变量** 或启动命令中，按需设置：
   - `PORT`：后端监听端口（默认 3001）
   - `MONGODB_URI`：指向您的 MongoDB 服务，例如 `mongodb://127.0.0.1:27017/safechat`
   - `JWT_SECRET`：自定义 JWT 密钥
   - `ALLOWED_ORIGINS`：允许跨域访问的前端地址，多个地址用逗号分隔
4. 保存后启动项目。首次启动会自动执行 `npm install --production` 并运行后端服务。

## 4. 配置 MongoDB

- 若使用宝塔自带 MongoDB 管理器，确保已创建 `safechat` 数据库与拥有读写权限的账号。
- 若连接外部 MongoDB，请在服务器上开放对应端口并确保防火墙策略允许访问。

## 5. 部署前端静态页面

1. 在宝塔 **网站** → **添加站点**，创建一个纯静态站点（或使用现有站点）。
2. 将站点根目录指向 `/www/wwwroot/safechat/frontend/modern`，或将其中内容复制到您的静态站点根目录。
3. 如果后端端口非 3001，请在 `frontend/modern/app.js` 中更新默认 API 地址，或通过 `ALLOWED_ORIGINS` 允许来自当前站点的跨域请求。

## 6. 验证部署

- 访问静态站点域名，打开登录页。
- 注册新用户并登录，确认消息、好友与群聊功能正常。
- 如需后台监控，可访问 `admin.html` 查看实时指标。

## 7. 常见问题

| 问题 | 解决方案 |
| --- | --- |
| **前端提示无法连接** | 检查后端是否启动、端口是否开放、防火墙与 `ALLOWED_ORIGINS` 设置。 |
| **登录后立即掉线** | 确保服务器时间准确、`JWT_SECRET` 保持一致且稳定。 |
| **MongoDB 连接失败** | 在服务器上确认 MongoDB 服务状态，并确保连接串与认证信息正确。 |
| **端口被占用** | 修改 `PORT` 环境变量或在宝塔中调整 Node 项目端口。 |

更多部署问题可结合宝塔官方文档与 SafeChat README 进行排查。
