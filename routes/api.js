const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/config');
const textProcessor = require('../utils/textProcessor');
const ollamaService = require('../services/ollama');
const imageGenService = require('../services/imageGen');
const ttsService = require('../services/tts');
const videoComposer = require('../services/videoComposer');
const srtGenerator = require('../utils/srtGenerator');

// 增强功能模块
const EnhancedFeatures = require('../services/enhancedFeatures');
const VideoEnhancements = require('../services/videoEnhancements');

const enhancedFeatures = new EnhancedFeatures(ollamaService);
const videoEnhancements = new VideoEnhancements();

const router = express.Router();

// 配置文件上传
const storage = multer.diskStorage({
  destination: config.paths.uploads,
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}_${file.originalname}`);
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() === '.txt') {
      cb(null, true);
    } else {
      cb(new Error('只支持txt文件'));
    }
  }
});

// 任务状态存储（简单内存存储，生产环境应使用数据库）
const tasks = new Map();

/**
 * 上传并处理文件
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '未上传文件' });
    }

    const taskId = uuidv4();
    const filePath = req.file.path;

    // 初始化任务状态
    tasks.set(taskId, {
      status: 'processing',
      progress: 0,
      currentStep: '读取文件...',
      createdAt: new Date()
    });

    // 异步处理任务
    processNovel(taskId, filePath).catch(error => {
      console.error('处理失败:', error);
      tasks.set(taskId, {
        ...tasks.get(taskId),
        status: 'failed',
        error: error.message
      });
    });

    res.json({ taskId, status: 'processing' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 查询任务状态
 */
router.get('/status/:taskId', (req, res) => {
  const { taskId } = req.params;
  const task = tasks.get(taskId);

  if (!task) {
    return res.status(404).json({ error: '任务不存在' });
  }

  res.json(task);
});

/**
 * 重试视频合成（使用已生成的资源）
 */
router.post('/retry-compose/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const tempDir = path.join(config.paths.temp, taskId);

    // 检查临时目录是否存在
    if (!fs.existsSync(tempDir)) {
      return res.status(404).json({ error: '任务资源不存在，可能已被清理' });
    }

    // 扫描临时目录，收集已生成的场景资源
    const files = fs.readdirSync(tempDir);
    const sceneMap = new Map();

    // 读取场景信息（包含 narration）
    const scenesInfoPath = path.join(tempDir, 'scenes_info.json');
    let scenesInfo = [];
    if (fs.existsSync(scenesInfoPath)) {
      try {
        scenesInfo = JSON.parse(fs.readFileSync(scenesInfoPath, 'utf8'));
      } catch (error) {
        console.warn('读取场景信息失败，将使用空字幕:', error.message);
      }
    }

    files.forEach(file => {
      const match = file.match(/^scene_(\d+)\.(png|wav)$/);
      if (match) {
        const sceneNum = parseInt(match[1]);
        const fileType = match[2];
        
        if (!sceneMap.has(sceneNum)) {
          sceneMap.set(sceneNum, {});
        }
        
        const scenePath = path.join(tempDir, file);
        if (fileType === 'png') {
          sceneMap.get(sceneNum).imagePath = scenePath;
        } else if (fileType === 'wav') {
          sceneMap.get(sceneNum).audioPath = scenePath;
        }
      }
    });

    // 验证每个场景都有图像和音频
    const processedScenes = [];
    const sceneNums = Array.from(sceneMap.keys()).sort((a, b) => a - b);
    
    for (const sceneNum of sceneNums) {
      const scene = sceneMap.get(sceneNum);
      if (!scene.imagePath || !scene.audioPath) {
        return res.status(400).json({ 
          error: `场景${sceneNum}资源不完整`,
          missing: {
            image: !scene.imagePath,
            audio: !scene.audioPath
          }
        });
      }
      
      // 验证文件是否存在
      if (!fs.existsSync(scene.imagePath) || !fs.existsSync(scene.audioPath)) {
        return res.status(400).json({ 
          error: `场景${sceneNum}文件不存在` 
        });
      }
      
      // 从 scenesInfo 中获取 narration
      const sceneInfo = scenesInfo.find(s => s.sceneNum === sceneNum);
      const narration = sceneInfo ? sceneInfo.narration : '';
      
      processedScenes.push({
        imagePath: scene.imagePath,
        audioPath: scene.audioPath,
        narration: narration
      });
    }

    if (processedScenes.length === 0) {
      return res.status(400).json({ error: '未找到可用的场景资源' });
    }

    // 更新任务状态
    tasks.set(taskId, {
      status: 'processing',
      progress: 90,
      currentStep: '重新合成视频...',
      retrying: true
    });

    // 异步执行视频合成
    retryComposeVideo(taskId, processedScenes).catch(error => {
      console.error('重试合成失败:', error);
      tasks.set(taskId, {
        ...tasks.get(taskId),
        status: 'failed',
        error: error.message
      });
    });

    res.json({ 
      taskId, 
      status: 'processing',
      message: `找到${processedScenes.length}个场景，开始重新合成视频`
    });

  } catch (error) {
    console.error('重试合成失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 重试视频合成的处理函数
 */
async function retryComposeVideo(taskId, processedScenes) {
  try {
    const tempDir = path.join(config.paths.temp, taskId);
    const outputDir = path.join(config.paths.output, taskId);
    fs.mkdirSync(outputDir, { recursive: true });
    const finalVideoPath = path.join(outputDir, 'video.mp4');

    // 如果视频已存在，先删除
    if (fs.existsSync(finalVideoPath)) {
      fs.unlinkSync(finalVideoPath);
    }

    // 检查是否有 SRT 字幕文件
    const srtPath = path.join(tempDir, 'subtitles.srt');
    const hasSrt = fs.existsSync(srtPath);

    if (hasSrt) {
      // 使用 SRT 字幕合成视频
      await videoComposer.composeVideo(processedScenes, finalVideoPath, srtPath);
      
      // 复制 SRT 文件到输出目录
      const outputSrtPath = path.join(outputDir, 'subtitles.srt');
      fs.copyFileSync(srtPath, outputSrtPath);
    } else {
      // 没有 SRT 字幕，生成一个
      const srtResult = srtGenerator.generateSRT(processedScenes, srtPath);
      console.log(`重新生成 SRT 字幕，总时长: ${srtResult.totalDuration.toFixed(2)}秒`);
      
      await videoComposer.composeVideo(processedScenes, finalVideoPath, srtPath);
      
      const outputSrtPath = path.join(outputDir, 'subtitles.srt');
      fs.copyFileSync(srtPath, outputSrtPath);
    }

    // 更新任务状态
    tasks.set(taskId, {
      status: 'completed',
      progress: 100,
      currentStep: '完成',
      videoUrl: `/output/${taskId}/video.mp4`,
      srtUrl: `/output/${taskId}/subtitles.srt`,
      retried: true
    });

    console.log(`视频重新合成完成: ${finalVideoPath}`);

  } catch (error) {
    console.error('重试合成失败:', error);
    throw error;
  }
}

/**
 * 处理生成视频的主流程（增强版）
 */
async function processNovel(taskId, filePath) {
  const updateStatus = (progress, step) => {
    tasks.set(taskId, {
      ...tasks.get(taskId),
      progress,
      currentStep: step
    });
  };

  try {
    // 1. 读取并处理文本
    updateStatus(10, '读取文本...');
    const text = textProcessor.readAndTruncate(filePath, config.limits.maxTextLength);
    console.log(`文本长度: ${text.length}字`);

    // 2. 提取场景（两步法：先精炼，再划分）
    updateStatus(20, '精炼文本并分析场景...');
    const scenesData = await ollamaService.extractScenes(text);
    const scenes = scenesData.scenes.slice(0, config.limits.sceneCount);
    console.log(`提取了${scenes.length}个场景`);

    // 3. 分析全局视觉风格（增强功能）
    updateStatus(23, '分析视觉风格...');
    const globalStyle = await enhancedFeatures.analyzeGlobalVisualStyle(scenes);
    console.log('全局视觉风格:', globalStyle);

    // 4. 生成 SRT 字幕文件
    updateStatus(25, '生成字幕文件...');
    const tempDir = path.join(config.paths.temp, taskId);
    fs.mkdirSync(tempDir, { recursive: true });
    
    const srtPath = path.join(tempDir, 'subtitles.srt');
    const srtResult = srtGenerator.generateSRT(scenes, srtPath);
    console.log(`SRT 字幕已生成，总时长: ${srtResult.totalDuration.toFixed(2)}秒`);

    // 5. 为每个场景生成内容（使用增强功能）
    const processedScenes = [];

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const sceneNum = i + 1;
      const baseProgress = 30 + (i / scenes.length) * 55;

      // 5.1 分析场景情感
      const emotion = enhancedFeatures.analyzeSceneEmotion(scene.description, scene.narration);
      console.log(`场景${sceneNum}情感: ${emotion}`);

      // 5.2 生成增强的图像提示词（结构化 + 视觉一致性）
      updateStatus(baseProgress, `场景${sceneNum}: 生成图像提示词...`);
      const imagePrompt = await enhancedFeatures.generateEnhancedImagePrompt(
        scene.description,
        globalStyle,
        emotion
      );

      // 5.3 生成图像
      updateStatus(baseProgress + 8, `场景${sceneNum}: 生成图像...`);
      const imagePath = path.join(tempDir, `scene_${sceneNum}.png`);
      await imageGenService.generateImage(imagePrompt, imagePath);

      // 5.4 生成配音
      updateStatus(baseProgress + 12, `场景${sceneNum}: 生成配音...`);
      const audioPath = path.join(tempDir, `scene_${sceneNum}.wav`);
      await ttsService.generateTTS(scene.narration, audioPath);

      processedScenes.push({
        imagePath,
        audioPath,
        narration: scene.narration
      });
    }

    // 保存场景信息到 JSON 文件，方便重试时使用
    const scenesInfoPath = path.join(tempDir, 'scenes_info.json');
    fs.writeFileSync(scenesInfoPath, JSON.stringify(processedScenes.map((s, i) => ({
      sceneNum: i + 1,
      narration: s.narration
    })), null, 2));

    // 6. 合成最终视频（使用增强功能：Ken Burns + 转场）
    updateStatus(90, '合成视频（含特效）...');
    const outputDir = path.join(config.paths.output, taskId);
    fs.mkdirSync(outputDir, { recursive: true });
    const finalVideoPath = path.join(outputDir, 'video.mp4');

    // 使用增强的视频合成
    await composeVideoWithEnhancements(processedScenes, finalVideoPath, srtPath, tempDir);

    // 复制 SRT 文件到输出目录
    const outputSrtPath = path.join(outputDir, 'subtitles.srt');
    fs.copyFileSync(srtPath, outputSrtPath);

    // 7. 完成
    updateStatus(100, '完成');
    tasks.set(taskId, {
      ...tasks.get(taskId),
      status: 'completed',
      progress: 100,
      currentStep: '完成',
      videoUrl: `/output/${taskId}/video.mp4`,
      srtUrl: `/output/${taskId}/subtitles.srt`
    });

    // 保留临时目录，方便调试和重试
    console.log(`临时文件保留在: ${tempDir}`);

  } catch (error) {
    console.error('处理失败:', error);
    throw error;
  }
}

/**
 * 使用增强功能合成视频
 */
async function composeVideoWithEnhancements(scenes, outputPath, srtPath, tempDir) {
  console.log(`开始合成视频（增强版），场景数: ${scenes.length}`);

  // 为每个场景创建临时视频片段（含Ken Burns效果）
  const videoSegments = [];
  
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const segmentPath = path.join(tempDir, `segment_${i}.mp4`);

    await videoEnhancements.createVideoSegmentWithEffects(
      scene.imagePath,
      scene.audioPath,
      segmentPath
    );

    videoSegments.push(segmentPath);
  }

  // 合并所有片段（含转场效果）
  const mergedPath = srtPath 
    ? path.join(tempDir, 'merged_no_subtitle.mp4')
    : outputPath;
  
  await videoEnhancements.mergeSegmentsWithTransitions(videoSegments, mergedPath);

  // 如果提供了 SRT 字幕，添加高级字幕
  if (srtPath && fs.existsSync(srtPath)) {
    await videoEnhancements.addSubtitlesEnhanced(mergedPath, srtPath, outputPath);
    // 删除无字幕的临时文件
    if (fs.existsSync(mergedPath)) {
      fs.unlinkSync(mergedPath);
    }
  }

  // 清理临时文件
  videoSegments.forEach(segment => {
    if (fs.existsSync(segment)) {
      fs.unlinkSync(segment);
    }
  });

  console.log(`视频合成完成（增强版）: ${outputPath}`);
  return outputPath;
}

module.exports = router;
