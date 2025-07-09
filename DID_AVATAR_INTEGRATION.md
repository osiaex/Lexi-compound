# D-ID Avatar 集成使用指南

## 🎯 功能概述

LEXI项目现已集成D-ID的AI Avatar功能，为您的实验参与者提供更加生动的AI互动体验。通过D-ID的先进技术，AI的回复将通过逼真的数字人avatar来呈现。

## ✨ 功能特性

- 🤖 **实时AI Avatar对话** - 使用D-ID Agent SDK实现流畅的avatar互动
- 📱 **响应式设计** - 在桌面端和移动端都有优化的用户体验
- 🎛️ **灵活控制** - 可以通过侧边栏开关或悬浮按钮控制avatar显示
- 🔄 **无缝集成** - 与现有聊天功能完美结合，不影响原有实验流程

## 🚀 使用方式

### 桌面端

1. **侧边栏控制**：
   - 在聊天页面左侧边栏找到"AI Avatar"开关
   - 点击开关即可启用/关闭avatar功能

2. **悬浮按钮**：
   - 页面右下角的机器人图标按钮
   - 点击即可打开avatar对话窗口

### 移动端

- **悬浮按钮**：
  - 点击右下角的机器人图标
  - Avatar将以全屏模式显示，提供最佳的移动体验

## 🔧 技术实现

### 核心组件

1. **DIDAgent.tsx** - D-ID Avatar的主要组件
   - 动态加载D-ID Agent SDK
   - 处理avatar的显示和交互逻辑

2. **ChatPage.tsx** - 聊天页面的主要修改
   - 添加avatar控制状态
   - 集成悬浮按钮和avatar组件

3. **SideBarChat.tsx** - 侧边栏增强
   - 添加avatar控制开关

### D-ID SDK集成

使用的D-ID代码片段：
```javascript
<script type="module"
      src="https://agent.d-id.com/v2/index.js"
      data-mode="full"
      data-client-key="Z29vZ2xlLW9hdXRoMnwxMDIzNzM5NjQ2MTg1MjgyNDg3MTY6WXp3TzJJemlndDhQTURhSmVyWEg5"
      data-agent-id="v2_agt_TfdU0tzh"
      data-name="did-agent"
      data-monitor="true"
      data-target-id="did-agent-container">
</script>
```

## 📋 配置说明

### 默认配置

- **Client Key**: `Z29vZ2xlLW9hdXRoMnwxMDIzNzM5NjQ2MTg1MjgyNDg3MTY6WXp3TzJJemlndDhQTURhSmVyWEg5`
- **Agent ID**: `v2_agt_TfdU0tzh`
- **模式**: `full` (完整功能模式)

### 自定义配置

如需使用自己的D-ID Agent，请：

1. 访问 [D-ID平台](https://studio.d-id.com/)
2. 创建您的AI Agent
3. 获取对应的Client Key和Agent ID
4. 在`DIDAgent.tsx`组件中更新相应参数

## 🎮 用户体验

### 桌面端体验
- Avatar以悬浮窗形式显示在右下角
- 大小：400x600像素
- 可拖拽和调整位置

### 移动端体验
- Avatar以全屏模式显示
- 优化触摸操作
- 适配各种屏幕尺寸

## 🔄 与现有功能的兼容性

- ✅ **聊天功能** - 完全兼容，不影响文本聊天
- ✅ **实验流程** - 不干扰现有的实验设计
- ✅ **用户注释** - 保持所有现有的用户交互功能
- ✅ **表单调查** - 前后问卷功能正常运行

## 🛠️ 故障排除

### 常见问题

**Q: Avatar无法加载**
A: 检查网络连接，确保能访问D-ID的CDN服务

**Q: Avatar显示空白**
A: 验证Client Key和Agent ID是否正确配置

**Q: 移动端显示异常**
A: 清除浏览器缓存，刷新页面重试

### 开发者调试

1. 打开浏览器开发者工具
2. 查看Console是否有错误信息
3. 检查Network面板确认SDK加载成功

## 📈 性能优化

- **按需加载** - 仅在用户激活avatar时加载SDK
- **内存管理** - 组件卸载时自动清理资源
- **网络优化** - 使用D-ID官方CDN保证加载速度

## 🔒 隐私和安全

- 使用D-ID官方SDK，符合相关隐私规范
- 不存储用户的语音或视频数据
- 所有交互通过D-ID平台安全处理

---

**注意**: 此功能需要稳定的网络连接以获得最佳体验。在网络环境较差的情况下，建议优先使用传统的文本聊天功能。 