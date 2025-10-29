#!/usr/bin/env bash
set -euo pipefail

# 切换到脚本所在目录，确保 npm 命令在正确的项目根路径执行。
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ ! -f "backend/package.json" ]; then
  echo "未找到 backend/package.json，请将脚本放在 safechat 解压后的根目录执行。" >&2
  exit 1
fi

# 安装生产依赖（首次运行或依赖缺失时）。
if [ ! -d "backend/node_modules" ]; then
  echo "[SafeChat] 安装后端依赖..."
  (cd backend && npm install --production)
fi

# 启动后端服务。
echo "[SafeChat] 启动后端服务..."
exec node backend/app.js
