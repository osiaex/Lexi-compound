@echo off
REM PyLips微服务启动脚本 (Windows版本)

echo 正在启动PyLips微服务...

REM 检查Python环境
python --version >nul 2>&1
if errorlevel 1 (
    echo 错误: 未找到Python
    pause
    exit /b 1
)

REM 检查依赖文件
if not exist "requirements.txt" (
    echo 错误: 未找到requirements.txt
    pause
    exit /b 1
)

REM 安装依赖
echo 检查依赖...
pip install -r requirements.txt

REM 设置环境变量
set PYTHONPATH=%PYTHONPATH%;%cd%\..\PyLips
set FLASK_ENV=production

REM 启动服务
echo 启动PyLips微服务在端口3001...
python pylips_service.py

pause 