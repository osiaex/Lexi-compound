# AI API 提供商配置指南

## 🎯 概述

本项目现在支持多个AI API提供商！您可以选择使用 **OpenAI** 或 **DeepSeek** 作为您的AI API提供商。两个API都完全兼容，可以根据您的需求和预算来选择。

## 🔄 支持的API提供商

### 1. OpenAI
- **模型**: `gpt-3.5-turbo`, `gpt-4-1106-preview`, `gpt-4o`, `gpt-4o-mini`
- **优势**: 成熟稳定，广泛应用，丰富的生态系统
- **API端点**: `https://api.openai.com`

### 2. DeepSeek  
- **模型**: `deepseek-chat`, `deepseek-reasoner`
- **优势**: 成本效益高，中文支持优秀，推理能力强
- **API端点**: `https://api.deepseek.com`

## 🚀 设置步骤

### 新安装
1. 运行 `npm run setup`
2. 选择您想要的API提供商（输入 1 选择OpenAI，输入 2 选择DeepSeek）
3. 输入相应的API密钥
4. 完成其他配置步骤

### 现有安装升级
1. 获取您选择的API提供商的密钥
2. 更新 `.env` 文件：

**选择OpenAI:**
```env
API_PROVIDER=OpenAI
OPENAI_API_KEY=your_openai_api_key_here
```

**选择DeepSeek:**
```env
API_PROVIDER=DeepSeek
DEEPSEEK_API_KEY=your_deepseek_api_key_here
```

3. 在管理界面中选择对应的模型：
   - OpenAI: `gpt-3.5-turbo`, `gpt-4o` 等
   - DeepSeek: `deepseek-chat`, `deepseek-reasoner`
4. 重启服务器

## 📝 获取API密钥

### OpenAI
1. 访问 [OpenAI平台](https://platform.openai.com/api-keys)
2. 登录或注册账户
3. 创建新的API密钥

### DeepSeek
1. 访问 [DeepSeek平台](https://platform.deepseek.com/api_keys)
2. 注册账户（如果还没有）
3. 在API密钥页面创建新的API密钥

## 🔧 技术细节

### 环境变量
- `API_PROVIDER`: 设置为 "OpenAI" 或 "DeepSeek"
- `OPENAI_API_KEY`: OpenAI API密钥（选择OpenAI时需要）
- `DEEPSEEK_API_KEY`: DeepSeek API密钥（选择DeepSeek时需要）

### 修改的文件
- `server/src/services/conversations.service.ts` - 动态API客户端配置
- `server/setup.js` - 交互式API提供商选择
- `client/src/DAL/constants.ts` - 支持两种提供商的模型选项
- `README.md` - 更新的文档

## 🛠 故障排除

### 常见问题

**Q: 收到 "Server is not configured with [Provider] API key" 错误**
A: 确保在 `.env` 文件中正确设置了对应的API密钥和API_PROVIDER变量

**Q: 模型不可用错误**
A: 确保使用与您选择的API提供商匹配的模型名称

**Q: 如何切换API提供商？**
A: 更新 `.env` 文件中的 `API_PROVIDER` 和相应的API密钥，然后重启服务器

### 调试提示
1. 检查服务器启动日志，应该显示 "🤖 AI Service initialized with [Provider] API"
2. 验证 `.env` 文件中的API_PROVIDER设置
3. 确保使用正确的API密钥和模型名称

## 💡 选择建议

### 选择OpenAI如果：
- 您需要最广泛的模型选择
- 您的应用主要使用英文
- 您需要最成熟的生态系统支持

### 选择DeepSeek如果：
- 您希望降低成本
- 您的应用涉及大量中文内容
- 您需要强大的推理能力（deepseek-reasoner）

## 📞 支持

如果遇到任何问题：
1. 查看相应的API文档（[OpenAI](https://platform.openai.com/docs/) 或 [DeepSeek](https://api-docs.deepseek.com/)）
2. 检查项目的故障排除指南
3. 联系项目维护者

---

**注意**: 两种API提供商都提供相同的功能支持，您可以随时切换而不影响项目的其他功能。 