const axios = require('axios');
const config = require('../config/config');

class SiliconFlowLLMService {
  constructor() {
    this.baseUrl = config.siliconflow.llm.baseUrl;
    this.apiKey = config.siliconflow.llm.apiKey;
    this.model = config.siliconflow.llm.model;
    this.temperature = config.siliconflow.llm.temperature;
    this.maxTokens = config.siliconflow.llm.maxTokens;
  }

  /**
   * 将原文精炼成视频解说文本（第一步）
   */
  async refineToNarration(text, targetLength = 400) {
    const systemPrompt = `你是一个专业的视频解说文案编辑。你的任务是将长文本精炼成适合视频解说的文案。

核心原则：
1. 保留完整故事线：开端、发展、高潮、结局都要有
2. 保留关键信息：人物、地点、时间、事件、数据等核心要素
3. 保持逻辑连贯：删减内容但不能让故事跳跃或难以理解
4. 增强叙事节奏：用更紧凑、更有冲击力的语言重新组织
5. 保持原文特色：独特的细节、专有名词、关键描述必须保留

精炼技巧：
- 合并重复信息
- 删除冗余修饰
- 简化复杂句式
- 保留关键转折
- 强化情感张力

输出要求：
- 字数控制在${targetLength}字左右（可以±50字）
- 分段清晰，每段一个核心内容
- 语言流畅，适合口播
- 保持故事的完整性和吸引力`;

    const userPrompt = `请将以下文本精炼成${targetLength}字左右的视频解说文案：

${text}

要求：
1. 保留故事的完整脉络和关键信息
2. 语言要简洁有力，适合视频解说
3. 保持原文的独特细节和专有名词
4. 字数控制在${targetLength}字左右
5. 直接返回精炼后的文本，不要添加任何说明或标题`;

    const refinedText = await this.chatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]);

    console.log(`原文长度: ${text.length}字 -> 精炼后: ${refinedText.length}字`);
    return refinedText.trim();
  }

  /**
   * 将精炼后的解说文本划分成场景（第二步）
   */
  async divideIntoScenes(refinedText, sceneCount = 4) {
    const systemPrompt = `你是一个专业的视频分镜师。你的任务是将一段完整的解说文本划分成${sceneCount}个场景。

分镜原则：
1. 按故事逻辑划分：每个场景是故事的一个自然段落
2. 时长均衡：每个场景的解说词长度尽量接近
3. 画面独立：每个场景要有明确的视觉主体
4. 叙事连贯：场景之间要自然衔接，不能割裂故事

场景构成：
- description: 这个场景的视觉描述（用于生成图像），要具体、有画面感
- narration: 这个场景的解说词（直接从原文中提取，保持原文表达）

返回JSON格式（必须使用双引号"，不要使用单引号'）：
{
  "scenes": [
    {
      "id": 1,
      "description": "场景的详细视觉描述，包含环境、主体、动作、光影、氛围等，用于AI生成图像",
      "narration": "这个场景对应的解说词，直接从原文提取，保持原文的表达方式"
    }
  ]
}

重要：
1. narration 必须完整覆盖原文，不能遗漏内容
2. 每个场景的 narration 长度尽量均衡
3. description 要有丰富的视觉细节，便于生成高质量图像
4. 必须使用标准JSON格式，字符串用双引号"
5. 场景数量必须是${sceneCount}个`;

    const userPrompt = `请将以下解说文本划分成${sceneCount}个场景：

${refinedText}

要求：
1. 严格划分成${sceneCount}个场景
2. 每个场景的解说词长度尽量均衡
3. 解说词要完整覆盖原文，不能遗漏
4. 视觉描述要详细具体，便于生成图像
5. 只返回JSON，不要其他内容`;

    const response = await this.chatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]);

    // 解析JSON响应
    try {
      let jsonStr = null;
      
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      } else {
        throw new Error('响应中未找到JSON对象');
      }

      jsonStr = jsonStr.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F]/g, '');
      jsonStr = this.fixUnescapedQuotes(jsonStr);
      
      const parsed = JSON.parse(jsonStr);
      
      if (!parsed.scenes || !Array.isArray(parsed.scenes)) {
        throw new Error('JSON 格式错误：缺少 scenes 数组');
      }
      
      console.log(`成功划分为${parsed.scenes.length}个场景`);
      return parsed;
      
    } catch (error) {
      console.error('解析场景失败:', error.message);
      console.error('原始响应:', response);
      throw error;
    }
  }

  /**
   * 分析文本并提取关键场景（两步法：先精炼，再划分）
   */
  async extractScenes(text) {
    console.log('=== 开始两步法场景提取 ===');
    
    // 第一步：精炼原文成解说文本
    console.log('第一步：精炼原文...');
    const refinedText = await this.refineToNarration(text, 400);
    
    // 第二步：将精炼文本划分成场景
    console.log('第二步：划分场景...');
    const scenesData = await this.divideIntoScenes(refinedText, 4);
    
    console.log('=== 场景提取完成 ===');
    return scenesData;
  }

  /**
   * 修复 JSON 字符串中未转义的双引号，并将单引号转换为双引号
   */
  fixUnescapedQuotes(jsonStr) {
    // 步骤1: 处理键名的单引号 'key': -> "key":
    jsonStr = jsonStr.replace(/'([^']+)'(\s*:)/g, '"$1"$2');
    
    // 步骤2: 处理值的单引号 : 'value' -> : "value"
    jsonStr = jsonStr.replace(/:\s*'([^']*)'/g, (match, content) => {
      const escaped = content.replace(/"/g, '\\"');
      return `: "${escaped}"`;
    });
    
    // 步骤3: 处理数组中的单引号值 ['value'] -> ["value"]
    jsonStr = jsonStr.replace(/\[\s*'([^']*)'\s*\]/g, (match, content) => {
      const escaped = content.replace(/"/g, '\\"');
      return `["${escaped}"]`;
    });
    
    return jsonStr;
  }

  /**
   * 为场景生成图像提示词
   */
  async generateImagePrompt(sceneDescription, style = '写实风格') {
    const systemPrompt = `你是一个专业的AI图像生成提示词工程师。
请根据场景描述生成详细的中文图像提示词，用于FLUX模型生成写实风格图像。

要求：
1. 主体描述：画面核心内容
2. 风格限定：写实、电影感
3. 细节补充：光影、构图、色调
4. 氛围渲染：情绪基调

只返回提示词文本，不要其他内容。`;

    const userPrompt = `场景描述：${sceneDescription}
图像风格：${style}

请生成中文图像提示词：`;

    return await this.chatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]);
  }

  /**
   * 调用 SiliconFlow Chat Completion API
   */
  async chatCompletion(messages) {
    try {
      console.log('=== LLM API 调用信息 ===');
      console.log('Base URL:', this.baseUrl);
      console.log('Model:', this.model);
      console.log('API Key 前缀:', this.apiKey ? this.apiKey.substring(0, 10) + '...' : '未配置');
      console.log('请求消息数:', messages.length);
      
      const requestBody = {
        model: this.model,
        messages: messages,
        temperature: this.temperature,
        max_tokens: this.maxTokens,
        stream: false
      };
      
      const requestStartTime = Date.now();
      
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 300000 // 5分钟超时
        }
      );

      const requestTime = Date.now() - requestStartTime;
      console.log(`LLM API 响应时间: ${requestTime}ms`);

      if (response.data.choices && response.data.choices.length > 0) {
        return response.data.choices[0].message.content;
      }

      throw new Error('API返回的choices为空');
    } catch (error) {
      console.error('=== SiliconFlow LLM调用失败 ===');
      console.error('错误类型:', error.code);
      console.error('错误消息:', error.message);
      
      if (error.response) {
        console.error('响应状态:', error.response.status);
        console.error('响应数据:', JSON.stringify(error.response.data));
      } else if (error.request) {
        console.error('请求已发送但未收到响应');
        console.error('请求配置:', {
          url: `${this.baseUrl}/chat/completions`,
          method: 'POST',
          hasApiKey: !!this.apiKey
        });
      } else {
        console.error('请求配置错误:', error.message);
      }
      
      // 提供更友好的错误提示
      if (error.code === 'ECONNABORTED') {
        throw new Error('LLM API 请求超时，请检查网络连接或稍后重试');
      } else if (error.response?.status === 401) {
        throw new Error('API Key 无效或未配置，请检查 SILICONFLOW_CN_API_KEY 环境变量');
      } else if (error.response?.status === 404) {
        throw new Error(`模型 ${this.model} 不存在或 API 地址错误`);
      }
      
      throw new Error(`SiliconFlow LLM调用失败: ${error.message}`);
    }
  }
}

module.exports = new SiliconFlowLLMService();
