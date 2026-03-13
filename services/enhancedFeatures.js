/**
 * 视频生成增强功能模块
 * 包含：图像提示词结构化、视觉一致性、文本精炼验证、情感分析等
 */

const config = require('../config/config');

class EnhancedFeatures {
  constructor(llmService) {
    this.llmService = llmService;
    this.config = config.enhancements;
  }

  /**
   * 分析全局视觉风格（基于所有场景）
   */
  async analyzeGlobalVisualStyle(scenes) {
    if (!this.config.useVisualConsistency) {
      return this.getDefaultVisualStyle();
    }

    const systemPrompt = `你是一个专业的视觉风格分析师。分析这些场景，定义统一的视觉风格。

返回JSON格式：
{
  "artStyle": "艺术风格",
  "colorPalette": "主色调",
  "lighting": "光线风格",
  "mood": "整体氛围",
  "composition": "构图风格"
}`;

    const scenesText = scenes.map((s, i) => `场景${i + 1}: ${s.description}`).join('\n');
    const userPrompt = `分析以下场景，定义统一的视觉风格：\n\n${scenesText}\n\n只返回JSON。`;

    try {
      const response = await this.llmService.chatCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]);

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const style = JSON.parse(jsonMatch[0]);
        console.log('全局视觉风格:', style);
        return style;
      }
    } catch (error) {
      console.warn('解析全局风格失败，使用默认风格:', error.message);
    }

    return this.getDefaultVisualStyle();
  }

  /**
   * 获取默认视觉风格
   */
  getDefaultVisualStyle() {
    return {
      artStyle: '电影级写实风格',
      colorPalette: '自然色调',
      lighting: '戏剧性光影',
      mood: '震撼、神秘',
      composition: '电影宽幅构图'
    };
  }

  /**
   * 分析场景情感
   */
  analyzeSceneEmotion(sceneDescription, narration) {
    if (!this.config.useEmotionalAnalysis) {
      return 'neutral';
    }

    const text = (sceneDescription + narration).toLowerCase();
    
    if (/惊人|震撼|惊呼|不可思议|爆发/.test(text)) return 'excited';
    if (/孤独|寂静|沉默|黑暗|神秘/.test(text)) return 'mysterious';
    if (/紧张|危险|恐惧|警告/.test(text)) return 'tense';
    if (/平静|安详|温和|柔和/.test(text)) return 'calm';
    if (/悲伤|哀伤|痛苦|失落/.test(text)) return 'sad';
    
    return 'neutral';
  }

  /**
   * 生成结构化图像提示词
   */
  async generateStructuredPrompt(sceneDescription, globalStyle, emotion = 'neutral') {
    if (!this.config.useStructuredPrompts) {
      return { subject: sceneDescription };
    }

    const systemPrompt = `你是AI图像生成提示词工程师。生成结构化提示词。

返回JSON：
{
  "subject": "主体",
  "environment": "环境",
  "lighting": "光线",
  "composition": "构图",
  "details": "细节",
  "atmosphere": "氛围"
}`;

    const userPrompt = `场景：${sceneDescription}
风格：${globalStyle.artStyle}，${globalStyle.colorPalette}，${globalStyle.lighting}
情感：${emotion}

生成结构化提示词（JSON）：`;

    try {
      const response = await this.llmService.chatCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]);

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.warn('解析结构化提示词失败:', error.message);
    }

    return {
      subject: sceneDescription,
      environment: '深邃空间',
      lighting: globalStyle.lighting,
      composition: globalStyle.composition,
      details: '高清晰度，精细细节',
      atmosphere: globalStyle.mood
    };
  }

  /**
   * 组合结构化提示词
   */
  combineStructuredPrompt(structured, globalStyle) {
    const parts = [
      structured.subject,
      structured.environment,
      structured.lighting,
      structured.composition,
      structured.details,
      structured.atmosphere,
      globalStyle.artStyle,
      globalStyle.colorPalette,
      '高质量，8K分辨率，专业摄影'
    ];

    return parts.filter(p => p).join('，');
  }

  /**
   * 生成增强的图像提示词
   */
  async generateEnhancedImagePrompt(sceneDescription, globalStyle, emotion) {
    const structured = await this.generateStructuredPrompt(sceneDescription, globalStyle, emotion);
    const fullPrompt = this.combineStructuredPrompt(structured, globalStyle);
    
    console.log('结构化提示词:', JSON.stringify(structured, null, 2));
    console.log('完整提示词:', fullPrompt);
    
    return fullPrompt;
  }

  /**
   * 验证精炼文本
   */
  async validateRefinement(originalText, refinedText) {
    if (!this.config.useRefinementValidation) {
      return { missingKeyInfo: false, score: 85 };
    }

    const systemPrompt = `你是文本质量审核专家。检查精炼文本是否保留关键信息。

返回JSON：
{
  "missingKeyInfo": true/false,
  "missingItems": ["遗漏项"],
  "score": 0-100,
  "feedback": "建议"
}`;

    const userPrompt = `原文（${originalText.length}字）：
${originalText}

精炼文本（${refinedText.length}字）：
${refinedText}

检查是否保留关键信息。只返回JSON。`;

    try {
      const response = await this.llmService.chatCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]);

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const validation = JSON.parse(jsonMatch[0]);
        console.log(`精炼质量评分: ${validation.score}/100`);
        return validation;
      }
    } catch (error) {
      console.warn('验证失败:', error.message);
    }

    return { missingKeyInfo: false, score: 85 };
  }

  /**
   * 分析情感曲线
   */
  async analyzeEmotionalArc(text) {
    if (!this.config.useEmotionalAnalysis) {
      return this.getDefaultEmotionalArc();
    }

    const systemPrompt = `你是情感分析专家。分析文本情感曲线。

返回JSON：
{
  "overallEmotion": "整体情感",
  "emotionalArc": [
    {"position": "开端", "emotion": "平静", "intensity": 3}
  ]
}`;

    const userPrompt = `分析情感曲线：\n\n${text}\n\n只返回JSON。`;

    try {
      const response = await this.llmService.chatCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]);

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.warn('情感分析失败:', error.message);
    }

    return this.getDefaultEmotionalArc();
  }

  /**
   * 获取默认情感曲线
   */
  getDefaultEmotionalArc() {
    return {
      overallEmotion: '神秘震撼',
      emotionalArc: [
        { position: '开端', emotion: '平静', intensity: 3 },
        { position: '发展', emotion: '紧张', intensity: 6 },
        { position: '高潮', emotion: '震撼', intensity: 9 },
        { position: '结尾', emotion: '余韵', intensity: 5 }
      ]
    };
  }
}

module.exports = EnhancedFeatures;
