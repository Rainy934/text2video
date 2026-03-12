# 剧情解说视频生成器

基于 SiliconFlow API 的 AI 视频生成工具，可以将文本内容自动转换为带配音的解说视频。

## 功能特点

- 📝 文本分镜：自动将文本内容分解为多个场景
- 🎨 AI 图像生成：使用通义万相生成场景图片
- 🎙️ AI 配音：使用 IndexTTS 生成语音解说
- 📄 SRT 字幕：自动生成标准 SRT 字幕文件
- 🎬 视频合成：自动合成图片、音频和字幕为完整视频

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
   - 生成 SRT 字幕文件
   - 生成场景图片
   - 生成配音（基于 SRT 字幕）
   - 合成视频并嵌入字幕
4. 下载生成的视频和 SRT 字幕文件

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
