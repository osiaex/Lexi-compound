# PyLips 与 LEXI 集成指南

本指南介绍如何在 LEXI 项目中集成 PyLips 数字人功能，实现与用户的语音对话交互。

## 📋 系统要求

### 环境依赖
- **Python 3.8+** （PyLips 服务）
- **Node.js 16+** （LEXI 后端）
- **React 18+** （LEXI 前端）
- **Linux/macOS/Windows** 平台支持

### 音频依赖（Linux）
```bash
sudo apt update && sudo apt install espeak-ng ffmpeg libespeak1
```

## 🚀 部署步骤

### 1. 安装 PyLips 依赖

```bash
cd Lexi/pylips-service
pip install -r requirements.txt
```

### 2. 启动 PyLips 微服务

#### Windows:
```bash
cd Lexi/pylips-service
./start.bat
```

#### Linux/macOS:
```bash
cd Lexi/pylips-service
chmod +x start.sh
./start.sh
```

#### 手动启动:
```bash
cd Lexi/pylips-service
python pylips_service.py
```

服务将在 `http://localhost:3001` 启动。

### 3. 启动 LEXI 后端

```bash
cd Lexi/server
npm install
npm start
```

后端将在 `http://localhost:5000` 启动，并自动连接到 PyLips 服务。

### 4. 启动 LEXI 前端

```bash
cd Lexi/client
npm install
npm start
```

前端将在 `http://localhost:3000` 启动。

## 🎯 功能特性

### 自动语音播放
- AI 回复时自动触发 PyLips 语音合成
- 智能表情选择（基于文本内容）
- 非阻塞语音播放，不影响对话流程

### 管理员控制
- **启动/停止服务**：在管理后台控制 PyLips 服务
- **语音测试**：测试文本转语音功能
- **表情控制**：测试各种面部表情
- **注视控制**：控制数字人的注视方向
- **配置管理**：调整 TTS 方法和语音设置

### 用户界面
- **数字人显示**：在聊天界面显示动态人脸
- **可折叠界面**：用户可以隐藏/显示数字人
- **音量控制**：静音/取消静音功能
- **状态指示**：连接状态实时显示

## 🔧 配置选项

### TTS 方法
1. **System TTS** （默认）
   - 使用系统内置语音合成
   - 免费，开箱即用
   - 语音质量一般

2. **Amazon Polly**
   - 云端高质量语音合成
   - 需要 AWS 账户和 API 密钥
   - 更自然的语音效果

### 语音配置
```javascript
{
  "voice_id": "com.apple.voice.compact.zh-CN.Tingting", // 可选语音ID
  "tts_method": "system" // 或 "polly"
}
```

## 📱 使用方法

### 用户端操作

1. **开始对话**
   - 访问 LEXI 聊天页面
   - 数字人会自动显示在消息列表上方
   - 点击眼睛图标可隐藏/显示数字人

2. **与数字人对话**
   - 发送文本消息
   - AI 回复时数字人会自动说话
   - 数字人会根据内容选择合适的表情

3. **控制功能**
   - 点击音量图标可静音/取消静音
   - 点击刷新图标重新连接服务

### 管理员操作

1. **访问控制面板**
   - 登录管理后台：`/admin`
   - 点击侧边栏的 "PyLips" 选项

2. **服务管理**
   - 点击"启动服务"初始化 PyLips
   - 使用"停止服务"关闭 PyLips
   - 点击"刷新"查看最新状态

3. **功能测试**
   - **语音测试**：输入文本，点击"播放语音"
   - **表情测试**：点击不同表情按钮测试
   - **注视测试**：测试不同方向的注视

4. **配置调整**
   - 点击"配置"按钮打开设置对话框
   - 选择 TTS 方法（系统/Polly）
   - 设置语音 ID（可选）

## 🛠️ API 接口

### PyLips 服务 API (端口 3001)

```bash
# 健康检查
GET /health

# 启动服务
POST /start
{
  "voice_id": "optional_voice_id",
  "tts_method": "system"
}

# 语音播放
POST /speak
{
  "text": "要播放的文本",
  "wait": false
}

# 智能语音播放（带表情）
POST /speak-with-expression
{
  "text": "要播放的文本",
  "wait": false
}

# 设置表情
POST /expression
{
  "expression": "happy", // happy, sad, surprised, angry, neutral
  "duration": 1000
}

# 控制注视
POST /look
{
  "x": 0,
  "y": 0,
  "z": 1000,
  "duration": 1000
}
```

### LEXI 后端 API (端口 5000)

```bash
# PyLips 控制（需要管理员权限）
GET /pylips/status
POST /pylips/start
POST /pylips/stop
POST /pylips/speak
POST /pylips/expression
POST /pylips/look
POST /pylips/config
```

## 🔍 故障排除

### 常见问题

1. **PyLips 服务启动失败**
   ```bash
   # 检查 Python 环境
   python --version
   
   # 检查依赖安装
   pip list | grep pylips
   
   # 查看错误日志
   python pylips_service.py
   ```

2. **数字人脸不显示**
   - 检查 PyLips 面孔服务器是否运行（端口 8000）
   - 访问 `http://localhost:8000/face` 测试
   - 检查浏览器控制台错误

3. **语音不播放**
   - 检查系统音频设置
   - 在管理面板测试语音功能
   - 查看浏览器音频权限

4. **连接错误**
   - 确认所有服务端口正常：
     - PyLips 服务：3001
     - PyLips 面孔：8000
     - LEXI 后端：5000
     - LEXI 前端：3000

### 调试模式

启用详细日志：
```bash
# PyLips 服务
FLASK_ENV=development python pylips_service.py

# LEXI 后端
NODE_ENV=development npm start
```

## 🎨 自定义配置

### 表情映射
修改 `pylips.service.ts` 中的 `getExpressionFromText` 函数来自定义表情触发词：

```typescript
// 添加自定义关键词映射
if (lowerText.includes('生气') || lowerText.includes('愤怒')) {
    return 'angry';
}
```

### 语音设置
在管理面板配置或直接修改默认设置：

```typescript
const defaultConfig = {
    voice_id: 'com.apple.voice.compact.zh-CN.Tingting',
    tts_method: 'system'
};
```

## 📊 性能优化

### 推荐配置
- **CPU**: 2核以上
- **内存**: 4GB 以上
- **网络**: 稳定的局域网连接
- **音频延迟**: < 500ms

### 生产环境部署
1. 使用 Gunicorn 部署 PyLips 服务
2. 配置反向代理（Nginx）
3. 启用 HTTPS
4. 设置服务自动重启

## 🤝 技术支持

如遇问题，请检查：
1. 系统日志和错误信息
2. 网络连接和端口配置
3. 依赖版本兼容性
4. 权限设置

---

**注意**：首次运行时，PyLips 可能需要下载语音模型（Allosaurus），请耐心等待。建议在稳定网络环境下进行初始化。 