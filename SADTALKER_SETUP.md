# SadTalker 安装和启动指南 (支持 EdgeTTS)

## 1. 环境准备

### 安装 Python 依赖
```bash
# 进入 SadTalker 目录
cd SadTalker

# 安装基础依赖
pip install -r requirements.txt

# 如果需要 3D 功能，安装额外依赖
pip install -r requirements3d.txt
```

### 下载模型文件
SadTalker 需要预训练模型才能工作。您需要下载以下模型：

1. **从 GitHub Release 下载**：
   ```bash
   # 创建 checkpoints 目录
   mkdir -p checkpoints

   # 下载模型文件（这些是必需的）
   # 您需要手动从 SadTalker GitHub releases 下载：
   # - SadTalker_V002.tar
   # 并解压到 checkpoints/ 目录
   ```

2. **模型文件结构**：
   ```
   SadTalker/
   ├── checkpoints/
   │   ├── BFM_Fitting/
   │   ├── hub/
   │   ├── lipsync_expert.pth
   │   ├── mapping_00109-model.pth.tar
   │   ├── mapping_00229-model.pth.tar
   │   ├── SadTalker_V002.safetensors
   │   └── ...
   └── gfpgan/
       └── weights/
   ```

## 2. TTS 服务配置

### 选项 A: EdgeTTS (推荐 - 免费)
EdgeTTS 是微软提供的免费语音合成服务，无需 API 密钥：

```bash
# 安装 EdgeTTS (服务器会自动安装)
pip install edge-tts
```

### 选项 B: OpenAI TTS (需要 API 密钥)
在 Lexi/server 目录创建 `.env` 文件：

```bash
# OpenAI API 配置（可选，如果不配置将使用 EdgeTTS）
OPENAI_API_KEY=your_openai_api_key_here

# 其他配置...
```

## 3. 启动服务

### 启动 Lexi 后端
```bash
cd Lexi/server
npm run dev
```

### 启动 Lexi 前端
```bash
cd Lexi/client
npm start
```

## 4. 验证安装

### 使用测试脚本
```bash
cd Lexi/server
node test-sadtalker.js
```

### 使用 Admin 控制台
1. 打开 Lexi 前端
2. 进入 Admin 控制台
3. 点击 "Settings" 标签
4. 点击 "Check Service Health" 按钮

## 5. 常见问题

### 网络错误 (Network Error)
- **原因**：通常是 SadTalker 模型文件未下载或路径不正确
- **解决方案**：
  1. 确保已下载所有必需的模型文件
  2. 检查 `checkpoints` 目录结构
  3. 验证 Python 环境和依赖安装

### SadTalker 健康检查失败
- **检查项目**：
  1. SadTalker 目录是否存在于正确位置
  2. Python 环境是否正确设置
  3. 模型文件是否完整下载

### TTS 服务不可用
- **EdgeTTS 解决方案**：系统会自动安装 EdgeTTS 作为免费替代方案
- **OpenAI TTS 解决方案**：设置正确的 `OPENAI_API_KEY` 环境变量

## 6. 模型下载链接

请访问 SadTalker 官方仓库获取最新模型：
- GitHub: https://github.com/OpenTalker/SadTalker
- Models: https://github.com/OpenTalker/SadTalker/releases

## 7. 性能要求

- **RAM**: 至少 8GB（推荐 16GB+）
- **GPU**: 支持 CUDA 的 NVIDIA GPU（推荐）
- **存储**: 至少 10GB 用于模型文件

## 8. TTS 服务配置

在创建实验时，您可以选择 TTS 服务：

1. **EdgeTTS (推荐)**：
   - 免费使用，无需 API 密钥
   - 支持多种中文和英文语音
   - 语音质量优秀

2. **OpenAI TTS**：
   - 需要 OpenAI API 密钥
   - 语音质量极佳
   - 按使用量付费

## 9. 语音选择

EdgeTTS 支持以下语音：
- **zh-CN-XiaoxiaoNeural**: 晓晓 - 温柔女声
- **zh-CN-YunxiNeural**: 云希 - 成熟男声  
- **zh-CN-YunyangNeural**: 云扬 - 年轻男声
- **zh-CN-XiaoyiNeural**: 晓伊 - 甜美女声
- **zh-CN-YunjianNeural**: 云健 - 磁性男声
- **zh-CN-XiaozhenNeural**: 晓甄 - 优雅女声
- **en-US-AriaNeural**: Aria - 英语女声
- **en-US-DavisNeural**: Davis - 英语男声

## 10. 测试功能

1. 在 Admin 中创建启用 SadTalker 的实验
2. 选择 TTS 服务 (EdgeTTS 或 OpenAI)
3. 选择语音 (如使用 EdgeTTS)
4. 在聊天中发送消息
5. 检查是否生成了说话视频

---

如果遇到问题，请检查服务器日志和浏览器控制台获取详细错误信息。 