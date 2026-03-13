# 视频生成增强功能说明

本项目已实现多项AI增强功能，显著提升视频生成质量。

## 功能列表

### 高优先级 ✅

#### 1. 图像提示词结构化
**位置**: `services/enhancedFeatures.js`

将场景描述转换为结构化的图像提示词，包含：
- subject: 主体物体/人物
- environment: 环境/背景
- lighting: 光线描述
- composition: 构图/视角
- details: 细节补充
- atmosphere: 氛围/情绪

**优势**:
- 提示词更具体、更有画面感
- AI图像生成质量更高
- 细节更丰富

#### 2. 视觉一致性控制
**位置**: `services/enhancedFeatures.js`

分析所有场景，定义统一的全局视觉风格：
- artStyle: 艺术风格（电影级写实、科幻风格等）
- colorPalette: 主色调（冷色调、暖色调等）
- lighting: 光线风格（戏剧性光影、自然光等）
- mood: 整体氛围（神秘、震撼等）
- composition: 构图风格（电影宽幅、对称构图等）

**优势**:
- 所有场景视觉风格统一
- 避免画风跳跃
- 整体观感更专业

### 中优先级 ✅

#### 3. 文本精炼验证
**位置**: `services/enhancedFeatures.js`

验证精炼后的文本是否保留了原文的关键信息：
- 检查遗漏的关键信息
- 评分（0-100）
- 提供改进建议
- 低分时自动重新精炼

**优势**:
- 确保信息完整性
- 减少关键细节丢失
- 提高文本质量

#### 4. 情感分析
**位置**: `services/enhancedFeatures.js`

分析场景情感，影响图像生成和TTS：
- 识别情感类型（平静、紧张、震撼、神秘等）
- 分析情感强度（1-10）
- 生成情感曲线

**优势**:
- 图像氛围更贴合内容
- 视觉表现更有感染力
- 为未来的情感TTS做准备

#### 5. 转场效果
**位置**: `services/videoEnhancements.js`

场景之间添加平滑转场：
- fade: 淡入淡出
- dissolve: 溶解
- wipeleft/wiperight: 左右划入

**优势**:
- 场景切换更自然
- 避免生硬跳切
- 提升观看体验

#### 6. Ken Burns效果
**位置**: `services/videoEnhancements.js`

为静态图片添加动态效果：
- 缓慢放大（zoom）
- 平移（pan）
- 可配置速度和最大缩放比例

**优势**:
- 静态图片变得生动
- 增加视觉吸引力
- 模拟摄像机运动

### 低优先级 ✅

#### 7. 高级字幕样式
**位置**: `services/videoEnhancements.js`

自定义字幕样式：
- 字体、字号、颜色
- 描边、阴影
- 背景色、圆角
- 位置控制

**优势**:
- 字幕更美观
- 可读性更强
- 品牌化定制

## 配置说明

所有功能可在 `config/config.js` 中开关：

```javascript
enhancements: {
  // 文本处理
  useRefinementValidation: true,  // 使用精炼验证
  useEmotionalAnalysis: true,     // 使用情感分析
  
  // 图像生成
  useStructuredPrompts: true,     // 使用结构化提示词
  useVisualConsistency: true,     // 使用视觉一致性
  
  // 视频合成
  useTransitions: true,           // 使用转场效果
  useKenBurns: true,              // 使用Ken Burns效果
  
  // 字幕样式
  useAdvancedSubtitles: true      // 使用高级字幕样式
}
```

### 详细配置

```javascript
// 转场效果
transitions: {
  types: ['fade', 'dissolve'],
  duration: 0.5  // 秒
},

// Ken Burns效果
kenBurns: {
  zoomSpeed: 0.0015,  // 缩放速度
  maxZoom: 1.5        // 最大缩放比例
},

// 字幕样式
subtitleStyle: {
  fontFamily: 'PingFang SC',
  fontSize: 48,
  fontColor: 'white',
  outlineColor: 'black',
  outlineWidth: 3,
  backgroundColor: 'rgba(0,0,0,0.6)',
  padding: '10,20'
}
```

## 工作流程

### 增强前
```
文本 → 场景提取 → 生成图像 → 生成音频 → 简单拼接 → 添加字幕
```

### 增强后
```
文本 
  → 精炼（带验证）
  → 场景提取 
  → 全局风格分析 ✨
  → 情感分析 ✨
  → 结构化提示词 ✨
  → 生成图像（视觉一致）✨
  → 生成音频 
  → Ken Burns效果 ✨
  → 转场合成 ✨
  → 高级字幕 ✨
```

## 效果对比

| 功能 | 增强前 | 增强后 |
|------|--------|--------|
| 图像质量 | 基础提示词 | 结构化提示词 |
| 视觉一致性 | 各场景独立 | 统一风格 |
| 信息完整性 | 可能遗漏 | 验证保留 |
| 画面动感 | 静态图片 | Ken Burns |
| 场景切换 | 生硬跳切 | 平滑转场 |
| 字幕样式 | 基础样式 | 自定义样式 |

## 性能影响

| 功能 | 额外时间 | 说明 |
|------|---------|------|
| 全局风格分析 | +2-3秒 | 一次性分析 |
| 结构化提示词 | +1-2秒/场景 | LLM调用 |
| 情感分析 | <1秒 | 关键词匹配 |
| Ken Burns | +5-10秒 | FFmpeg处理 |
| 转场效果 | +3-5秒 | FFmpeg处理 |
| 高级字幕 | +2-3秒 | FFmpeg处理 |
| **总计** | **+15-30秒** | 4个场景 |

## 使用建议

1. **全部开启**（推荐）
   - 获得最佳视频质量
   - 适合正式发布的视频

2. **快速模式**
   ```javascript
   useRefinementValidation: false,
   useStructuredPrompts: false,
   useTransitions: false,
   useKenBurns: false
   ```
   - 生成速度更快
   - 适合快速预览

3. **平衡模式**
   ```javascript
   useStructuredPrompts: true,
   useVisualConsistency: true,
   useKenBurns: true,
   // 其他关闭
   ```
   - 保留核心功能
   - 速度与质量平衡

## 未来优化

- [ ] 情感TTS（根据情感调整语速、音调）
- [ ] 更多转场效果（擦除、旋转等）
- [ ] 词级字幕高亮（卡拉OK效果）
- [ ] 背景音乐自动匹配
- [ ] 多语言字幕支持
- [ ] 实时预览功能

## 技术栈

- **LLM**: DeepSeek-V3.2（文本处理、风格分析）
- **图像生成**: 通义万相 Z-Image-Turbo
- **TTS**: IndexTTS-2
- **视频处理**: FFmpeg
- **Node.js**: Express框架

## 文件结构

```
services/
├── enhancedFeatures.js      # 文本和图像增强功能
├── videoEnhancements.js     # 视频合成增强功能
├── ollama.js                # LLM服务（原有）
├── imageGen.js              # 图像生成（原有）
├── tts.js                   # TTS服务（原有）
└── videoComposer.js         # 视频合成（原有）

routes/
└── api.js                   # 集成所有增强功能

config/
└── config.js                # 增强功能配置
```

## 开发者说明

### 添加新的增强功能

1. 在 `services/enhancedFeatures.js` 或 `services/videoEnhancements.js` 中添加方法
2. 在 `config/config.js` 中添加配置开关
3. 在 `routes/api.js` 的 `processNovel` 函数中调用
4. 更新本文档

### 调试技巧

```javascript
// 查看结构化提示词
console.log('结构化提示词:', structured);

// 查看全局风格
console.log('全局视觉风格:', globalStyle);

// 查看情感分析
console.log('场景情感:', emotion);
```

## 常见问题

**Q: 为什么生成时间变长了？**
A: 增强功能需要额外的LLM调用和FFmpeg处理。可以关闭部分功能加快速度。

**Q: 如何关闭某个功能？**
A: 在 `config/config.js` 中将对应的开关设为 `false`。

**Q: Ken Burns效果太快/太慢？**
A: 调整 `kenBurns.zoomSpeed` 参数（默认0.0015）。

**Q: 转场效果不明显？**
A: 增加 `transitions.duration` 参数（默认0.5秒）。

**Q: 字幕样式不生效？**
A: 确保系统安装了指定的字体，或修改 `subtitleStyle.fontFamily`。

## 贡献

欢迎提交PR添加更多增强功能！

## License

MIT
