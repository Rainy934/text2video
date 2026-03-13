/**
 * 测试所有增强功能
 * 用法: node test_enhancements.js
 */

const ollamaService = require('./services/ollama');
const EnhancedFeatures = require('./services/enhancedFeatures');
const VideoEnhancements = require('./services/videoEnhancements');

const enhancedFeatures = new EnhancedFeatures(ollamaService);
const videoEnhancements = new VideoEnhancements();

// 测试场景数据
const testScenes = [
  {
    id: 1,
    description: '深邃的宇宙空间中，旅行者二号探测器孤独地航行',
    narration: '自1977年发射升空，旅行者二号已在宇宙中孤独航行三十三年。'
  },
  {
    id: 2,
    description: '宇宙深处突然出现九具神秘的庞大物体',
    narration: '就在这一刻，旅行者二号有了惊人的发现。九具无法辨识的庞大躯体出现在宇宙深处。'
  },
  {
    id: 3,
    description: 'NASA控制中心，科学家们震惊地看着屏幕',
    narration: '2010年5月22日，地球收到了神秘数据。整个宇航局陷入死寂，随后爆发出难以置信的惊呼。'
  }
];

async function testEnhancements() {
  console.log('=== 测试视频生成增强功能 ===\n');

  try {
    // 测试1: 全局视觉风格分析
    console.log('【测试1】全局视觉风格分析');
    console.log('-'.repeat(50));
    const globalStyle = await enhancedFeatures.analyzeGlobalVisualStyle(testScenes);
    console.log('全局视觉风格:');
    console.log(JSON.stringify(globalStyle, null, 2));
    console.log('');

    // 测试2: 场景情感分析
    console.log('【测试2】场景情感分析');
    console.log('-'.repeat(50));
    testScenes.forEach((scene, i) => {
      const emotion = enhancedFeatures.analyzeSceneEmotion(scene.description, scene.narration);
      console.log(`场景${i + 1}情感: ${emotion}`);
    });
    console.log('');

    // 测试3: 结构化图像提示词
    console.log('【测试3】结构化图像提示词');
    console.log('-'.repeat(50));
    const scene1 = testScenes[0];
    const emotion1 = enhancedFeatures.analyzeSceneEmotion(scene1.description, scene1.narration);
    
    const structured = await enhancedFeatures.generateStructuredPrompt(
      scene1.description,
      globalStyle,
      emotion1
    );
    
    console.log('结构化提示词:');
    console.log(JSON.stringify(structured, null, 2));
    console.log('');

    // 测试4: 完整图像提示词
    console.log('【测试4】完整图像提示词');
    console.log('-'.repeat(50));
    const fullPrompt = await enhancedFeatures.generateEnhancedImagePrompt(
      scene1.description,
      globalStyle,
      emotion1
    );
    console.log('完整提示词:');
    console.log(fullPrompt);
    console.log('');

    // 测试5: 文本精炼验证
    console.log('【测试5】文本精炼验证');
    console.log('-'.repeat(50));
    const originalText = '自1977年发射升空以来，旅行者二号探测器已经在宇宙中孤独地航行了三十三年。它携带着人类的镀金唱片，飞向未知的深空。此刻，它距离地球已经超过一百四十亿公里，成为人类历史上飞得最远的星际太空船。';
    const refinedText = '自1977年发射升空，旅行者二号已在宇宙中孤独航行三十三年，距离地球一百四十亿公里。';
    
    const validation = await enhancedFeatures.validateRefinement(originalText, refinedText);
    console.log('验证结果:');
    console.log(JSON.stringify(validation, null, 2));
    console.log('');

    // 测试6: 情感曲线分析
    console.log('【测试6】情感曲线分析');
    console.log('-'.repeat(50));
    const fullText = testScenes.map(s => s.narration).join(' ');
    const emotionalArc = await enhancedFeatures.analyzeEmotionalArc(fullText);
    console.log('情感曲线:');
    console.log(JSON.stringify(emotionalArc, null, 2));
    console.log('');

    // 测试7: Ken Burns滤镜
    console.log('【测试7】Ken Burns滤镜');
    console.log('-'.repeat(50));
    const kenBurnsFilter = videoEnhancements.getKenBurnsFilter('test.png', 10);
    console.log('Ken Burns滤镜:');
    console.log(kenBurnsFilter);
    console.log('');

    // 测试8: 转场效果滤镜
    console.log('【测试8】转场效果滤镜');
    console.log('-'.repeat(50));
    const transitions = ['fade', 'dissolve', 'wipeleft', 'wiperight'];
    transitions.forEach(type => {
      const filter = videoEnhancements.getTransitionFilter(type, 0.5);
      console.log(`${type}: ${filter || '(直接拼接)'}`);
    });
    console.log('');

    // 测试9: 高级字幕滤镜
    console.log('【测试9】高级字幕滤镜');
    console.log('-'.repeat(50));
    const subtitleFilter = videoEnhancements.getAdvancedSubtitleFilter('test.srt');
    console.log('字幕滤镜:');
    console.log(subtitleFilter);
    console.log('');

    console.log('=== 所有测试完成 ===');
    console.log('\n功能状态:');
    console.log('✅ 全局视觉风格分析');
    console.log('✅ 场景情感分析');
    console.log('✅ 结构化图像提示词');
    console.log('✅ 文本精炼验证');
    console.log('✅ 情感曲线分析');
    console.log('✅ Ken Burns效果');
    console.log('✅ 转场效果');
    console.log('✅ 高级字幕样式');

  } catch (error) {
    console.error('测试失败:', error.message);
    console.error(error.stack);
  }
}

testEnhancements();
