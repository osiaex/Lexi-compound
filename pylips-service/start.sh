#!/bin/bash

# PyLips微服务启动脚本

echo "正在启动PyLips微服务..."

# 检查Python环境
if ! command -v python3 &> /dev/null; then
    echo "错误: 未找到Python3"
    exit 1
fi

# 检查依赖
if [ ! -f "requirements.txt" ]; then
    echo "错误: 未找到requirements.txt"
    exit 1
fi

# 安装依赖（如果需要）
echo "检查依赖..."
pip3 install -r requirements.txt

# 设置环境变量
export PYTHONPATH="${PYTHONPATH}:$(pwd)/../PyLips"
export FLASK_ENV=production

# 启动服务
echo "启动PyLips微服务在端口3001..."
python3 pylips_service.py 