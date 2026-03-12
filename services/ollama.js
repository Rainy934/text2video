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
   * 分析文本并提取关键场景
   */
  async extractScenes(text) {
    const systemPrompt = `你是一个专业的影视分镜师和故事分析专家。你的任务是从文本中提取最核心、最具戏剧张力的视觉场景。

分镜原则：
1. 聚焦故事转折点：选择推动情节发展的关键时刻
2. 捕捉情感高潮：选择情绪最强烈、最具冲击力的瞬间
3. 视觉冲击力：选择最具画面感、最容易被记住的场景
4. 叙事完整性：场景之间要有逻辑连贯性，能串联起完整故事线

场景选择标准（按优先级）：
- 故事的开端/引入（设定背景和氛围）
- 核心冲突或转折点（故事的关键变化）
- 情感或视觉高潮（最震撼的时刻）
- 悬念或揭秘时刻（引发好奇或解答疑问）
- 结局或余韵（故事的收尾或启示）

避免选择：
- 纯粹的对话场景（缺乏视觉元素）
- 过渡性的描述（没有戏剧性）
- 重复性的内容（信息冗余）

关键要求：
1. 必须保留原文中的核心信息和关键细节（如：龙尸、外星飞船、特定人物名等）
2. 不要用泛化的词语替代原文的具体描述（如：不要把"龙尸"改成"尸体"）
3. 保持原文的独特性和辨识度
4. 场景描述要忠实于原文，只补充视觉化细节

返回JSON格式（必须使用双引号"，不要使用单引号'）：
{
  "scenes": [
    {
      "id": 1,
      "description": "场景的详细视觉描述（必须包含原文的关键信息，如具体物体、人物、地点等，然后补充环境、动作、光影、氛围等视觉细节）",
      "narration": "这个场景的解说词（20-30秒可以读完，要有故事性和感染力，必须保留原文的核心信息）"
    }
  ]
}

重要：
1. 确保返回完整有效的JSON
2. 必须使用双引号"作为字符串分隔符，不要使用单引号'
3. 字符串内部如果需要引用对话，使用中文引号「」或『』
4. 提取3-5个场景，每个场景都必须是故事的核心节点
5. 严格保留原文的关键信息，不要泛化或替换`;

    const userPrompt = `请分析以下文本，提取3-5个最核心、最具戏剧张力的关键场景：

${text}

要求：
1. 只选择推动情节发展的关键时刻
2. 每个场景要有强烈的视觉冲击力
3. 场景之间要能串联起完整的故事线
4. 解说词要有感染力，能引发观众情绪共鸣
5. 必须使用标准JSON格式，字符串用双引号"，对话使用中文引号「」
6. 【重要】严格保留原文中的关键信息和具体细节，不要用泛化词语替代（例如：原文是"龙尸"就必须写"龙尸"，不要改成"尸体"或"遗骸"）

只返回JSON，不要其他内容。`;

    const response = await this.chatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]);
    
    // 解析JSON响应
    try {
      // 尝试找到完整的 JSON 对象
      let jsonStr = null;
      
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      } else {
        throw new Error('响应中未找到JSON对象');
      }

      // 清理非法控制字符
      jsonStr = jsonStr.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F]/g, '');
      
      // 修复未转义的双引号问题
      jsonStr = this.fixUnescapedQuotes(jsonStr);
      
      const parsed = JSON.parse(jsonStr);
      
      // 验证返回的数据结构
      if (!parsed.scenes || !Array.isArray(parsed.scenes)) {
        throw new Error('JSON 格式错误：缺少 scenes 数组');
      }
      
      return parsed;
      
    } catch (error) {
      console.error('解析场景失败:', error.message);
      console.error('原始响应长度:', response.length);
      console.error('原始响应:', response);
      throw error;
    }
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
