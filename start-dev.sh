#!/bin/bash

# IM-SafeChat 开发环境启动脚本

echo "🚀 启动 IM-SafeChat 开发环境..."

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未安装 Node.js"
    exit 1
fi

echo "✅ Node.js 版本: $(node -v)"

# 检查 MySQL
if ! command -v mysql &> /dev/null; then
    echo "⚠️  警告: 未安装 MySQL，请确保 MySQL 服务正在运行"
fi

# 启动后端
echo ""
echo "📦 启动后端服务..."
cd backend/im-backend

if [ ! -d "node_modules" ]; then
    echo "安装后端依赖..."
    npm install
fi

if [ ! -f ".env" ]; then
    echo "创建 .env 配置文件..."
    cp .env.example .env
    echo "⚠️  请编辑 backend/im-backend/.env 配置数据库连接"
fi

npm start &
BACKEND_PID=$!
echo "✅ 后端服务已启动 (PID: $BACKEND_PID) - http://localhost:3001"

# 启动前端
echo ""
echo "📦 启动前端服务..."
cd ../../frontend/im-frontend

if [ ! -d "node_modules" ]; then
    echo "安装前端依赖..."
    npm install
fi

if [ ! -f ".env" ]; then
    echo "创建 .env 配置文件..."
    cp .env.example .env
fi

npm run dev &
FRONTEND_PID=$!
echo "✅ 前端服务已启动 (PID: $FRONTEND_PID) - http://localhost:5173"

echo ""
echo "======================================"
echo "🎉 IM-SafeChat 开发环境已启动！"
echo "======================================"
echo "前端访问: http://localhost:5173"
echo "后端API: http://localhost:3001"
echo ""
echo "按 Ctrl+C 停止服务"
echo ""

# 等待用户中断
trap "echo ''; echo '🛑 正在停止服务...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT

wait
