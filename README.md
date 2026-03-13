# 剧情解说视频生成器

基于 SiliconFlow API 的 AI 视频生成工具，可以将文本内容自动转换为带配音的解说视频。

## 功能特点

- 📝 智能文本精炼：将长文本精炼成适合视频解说的文案（保留完整故事线）
- 🎬 智能场景划分：将精炼文本按逻辑划分成多个场景
- 🎨 AI 图像生成：使用通义万相生成场景图片
  - ✨ 结构化提示词：主体、环境、光线、构图、细节、氛围
  - ✨ 视觉一致性：统一的艺术风格、色调、光线、氛围
- 🎙️ AI 配音：使用 IndexTTS 生成语音解说
- 🎯 情感分析：识别场景情感，影响图像生成和视觉表现
- 📄 SRT 字幕：自动生成标准 SRT 字幕文件
  - ✨ 高级字幕样式：自定义字体、颜色、描边、背景
- 🎬 视频合成：自动合成图片、音频和字幕为完整视频
  - ✨ Ken Burns效果：静态图片动态化（缓慢放大+平移）
  - ✨ 转场效果：场景间平滑过渡（淡入淡出、溶解等）

## 技术栈

- Node.js + Express
- SiliconFlow API (DeepSeek-V3.2 / Z-Image-Turbo / IndexTTS-2)
- FFmpeg

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境

复制 `.env.example` 为 `.env`，并配置你的 SiliconFlow API Key：

```bash
cp .env.example .env
```

编辑 `config/config.js` 中的 API Key。

### 3. 启动服务

```bash
pnpm start
```

或使用开发模式：

```bash
pnpm run dev
```

### 4. 访问应用

打开浏览器访问：`http://localhost:3000`

## 使用说明

1. 上传或输入文本内容（最多 1000 字）
2. 点击生成按钮
3. 等待 AI 处理：
   - 分镜分析
   - **全局视觉风格分析** ✨
   - **情感分析** ✨
   - **结构化图像提示词生成** ✨
   - 生成场景图片（视觉一致）
   - 生成配音
   - **Ken Burns动态效果** ✨
   - **转场效果合成** ✨
   - 生成 SRT 字幕文件
   - **高级字幕样式** ✨
   - 合成视频并嵌入字幕
4. 下载生成的视频和 SRT 字幕文件

## 增强功能

本项目实现了多项AI增强功能，详见 [ENHANCEMENTS.md](ENHANCEMENTS.md)

### 快速配置

在 `config/config.js` 中可以开关各项功能：

```javascript
enhancements: {
  useRefinementValidation: true,  // 文本精炼验证
  useEmotionalAnalysis: true,     // 情感分析
  useStructuredPrompts: true,     // 结构化提示词
  useVisualConsistency: true,     // 视觉一致性
  useTransitions: true,           // 转场效果
  useKenBurns: true,              // Ken Burns效果
  useAdvancedSubtitles: true      // 高级字幕样式
}
```

### 测试增强功能

```bash
# 测试所有增强功能
node test_enhancements.js
```

## 目录结构

```
├── config/          # 配置文件
├── routes/          # API 路由
├── services/        # 核心服务（LLM、图像、TTS、视频合成）
├── public/          # 前端页面
├── uploads/         # 上传文件
├── temp/            # 临时文件
└── output/          # 生成的视频
```

## License

MIT
