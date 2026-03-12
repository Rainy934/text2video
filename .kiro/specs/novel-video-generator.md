# 剧情解说视频生成器 MVP

## 项目概述

基于本地部署模型的txt转剧情解说视频工具，使用Node.js开发，集成Ollama、IndexTTS和DrawThings Flux2。

## 技术栈

- **前端**: HTML + Tailwind CSS + Vanilla JS（简单快速）
- **后端**: Node.js + Express
- **LLM**: Ollama qwen3.5:4b（本地）
- **TTS**: IndexTTS（本地7680端口）
- **图像生成**: DrawThings Flux2（写实风格）
- **视频处理**: FFmpeg（通过fluent-ffmpeg）

## 核心功能

1. 上传txt文件（限制前1000字用于MVP）
2. 使用Ollama提取3-5个关键场景
3. 为每个场景生成解说文案
4. 使用Flux2生成写实风格配图
5. 使用IndexTTS生成配音
6. 合成视频（图片 + 字幕 + 配音）
7. 提供视频下载

## 项目结构

```
novel-video-generator/
├── package.json
├── server.js                 # Express服务器入口
├── config/
│   └── config.js            # 配置文件（端口、API地址等）
├── services/
│   ├── ollama.js            # Ollama LLM调用
│   ├── tts.js               # IndexTTS调用
│   ├── imageGen.js          # Flux2图像生成
│   └── videoComposer.js     # FFmpeg视频合成
├── routes/
│   └── api.js               # API路由
├── utils/
│   └── textProcessor.js     # 文本处理工具
├── public/
│   ├── index.html           # 前端页面
│   └── style.css            # 样式（如需要）
├── uploads/                 # 上传的txt文件
├── temp/                    # 临时文件（图片、音频）
└── output/                  # 生成的视频
```

## API设计

### POST /api/upload
上传txt文件并开始处理

**Request:**
```json
{
  "file": "multipart/form-data"
}
```

**Response:**
```json
{
  "taskId": "uuid",
  "status": "processing"
}
```

### GET /api/status/:taskId
查询任务状态

**Response:**
```json
{
  "taskId": "uuid",
  "status": "processing|completed|failed",
  "progress": 60,
  "currentStep": "生成配音中...",
  "videoUrl": "/output/video.mp4" // 完成时返回
}
```

### GET /output/:filename
下载生成的视频

## 处理流程

1. **文本处理** (10%)
   - 读取txt文件
   - 提取前1000字
   - 清理格式

2. **场景提取** (20%)
   - 调用Ollama提取3-5个关键场景
   - 每个场景包含：场景描述、人物、情节

3. **文案生成** (30%)
   - 为每个场景生成20-30秒解说词
   - 优化为口语化表达

4. **图像生成** (50%)
   - 为每个场景生成Flux2 prompt
   - 调用DrawThings生成写实风格配图

5. **语音合成** (70%)
   - 将解说词发送到IndexTTS
   - 获取音频文件

6. **视频合成** (90%)
   - 使用FFmpeg合成：
     - 图片作为背景（每个场景持续音频时长）
     - 添加字幕
     - 合并音频
   - 添加转场效果

7. **完成** (100%)
   - 返回视频下载链接

## Ollama Prompt设计

### 场景提取Prompt
```
你是一个专业的分析师。请分析以下片段，提取3-5个最关键的场景。

内容：
{novel_text}

请以JSON格式返回，格式如下：
{
  "scenes": [
    {
      "id": 1,
      "description": "场景的视觉描述（用于生成图片）",
      "characters": ["人物1", "人物2"],
      "plot": "这个场景发生了什么"
    }
  ]
}
```

### 解说词生成Prompt
```
你是一个专业的视频解说员。请为以下场景生成20-30秒的口语化解说词。

场景信息：
- 描述：{scene.description}
- 人物：{scene.characters}
- 情节：{scene.plot}

要求：
1. 口语化、生动
2. 20-30秒可以读完
3. 吸引观众注意力
4. 不要使用书面语

直接返回解说词文本，不要其他内容。
```

### 图像Prompt生成
```
你是一个AI绘画prompt专家。请为以下场景生成Flux2写实风格的英文prompt。

场景：{scene.description}
人物：{scene.characters}

要求：
1. 写实风格（photorealistic）
2. 电影感（cinematic）
3. 详细的视觉描述
4. 英文prompt

直接返回英文prompt，不要其他内容。
```

## 依赖包

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "multer": "^1.4.5-lts.1",
    "axios": "^1.6.0",
    "fluent-ffmpeg": "^2.1.2",
    "uuid": "^9.0.0",
    "cors": "^2.8.5"
  }
}
```

## 配置示例

```javascript
module.exports = {
  port: 3000,
  ollama: {
    baseUrl: 'http://localhost:11434',
    model: 'qwen2.5:4b'
  },
  tts: {
    baseUrl: 'http://localhost:7680'
  },
  flux: {
    // DrawThings Flux2配置
    endpoint: 'http://localhost:PORT' // 需要确认
  },
  limits: {
    maxTextLength: 1000,
    maxScenes: 5
  }
}
```

## 任务列表

- [x] Task 1: 项目初始化和基础结构（package.json、目录结构、配置文件）
- [ ] Task 2: Ollama服务集成（场景分析、提示词生成）
- [ ] Task 3: IndexTTS服务集成（语音合成，Gradio API）
- [ ] Task 4: DrawThings Flux2集成（图像生成，SD WebUI API）
- [ ] Task 5: 视频合成服务（FFmpeg合成图片+音频+字幕）
- [ ] Task 6: API路由实现（上传、处理、状态查询）
- [ ] Task 7: 前端界面开发（简单上传界面）
- [ ] Task 8: 端到端测试

## 注意事项

1. **错误处理**: 每个服务调用都需要完善的错误处理
2. **超时设置**: 图像生成和视频合成可能耗时较长
3. **临时文件清理**: 定期清理temp目录
4. **进度反馈**: 实时更新任务状态给前端
5. **资源限制**: 控制并发任务数量，避免资源耗尽

## MVP限制

- 仅处理前1000字
- 固定3-5个场景
- 简单的视频模板（图片+字幕+音频）
- 无用户系统
- 无任务队列（单任务处理）
