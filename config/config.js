module.exports = {
  // 服务器配置
  port: 3000,

  // SiliconFlow API配置
  siliconflow: {
    // LLM模型配置（用于分镜推理）
    llm: {
      apiKey: 'sk-hxvlznlsyggvqhrgubtnneajvurhpaymigfiybiormcogcpx',
      baseUrl: 'https://api.siliconflow.com/v1',
      model: 'deepseek-ai/DeepSeek-V3.2', // Qwen2.5 72B 指令模型（推荐用于分镜和提示词生成）
      // 其他可选模型：
      // 'Qwen/Qwen2.5-32B-Instruct' - 更快，性能也不错
      // 'deepseek-ai/DeepSeek-V3' - 推理能力强
      // 'Qwen/Qwen2.5-7B-Instruct' - 预算有限时使用
      temperature: 0.7,
      maxTokens: 4096
    },
    
    // 图像生成配置
    image: {
      apiKey: 'sk-hxvlznlsyggvqhrgubtnneajvurhpaymigfiybiormcogcpx',
      baseUrl: 'https://api.siliconflow.com/v1',
      model: 'Tongyi-MAI/Z-Image-Turbo', // 通义万相 Z-Image-Turbo
      imageSize: '1920x1080', // 16:9 比例
      numInferenceSteps: 20,
      guidanceScale: 7.5,
      negativePrompt: '人脸特写，半身像，模糊，比例失调，原参考图背景，比例失调，缺肢，低质量，变形'
    },
    
    // TTS配置
    tts: {
      apiKey: 'sk-hxvlznlsyggvqhrgubtnneajvurhpaymigfiybiormcogcpx',
      baseUrl: 'https://api.siliconflow.com/v1',
      model: 'IndexTeam/IndexTTS-2',
      voice: 'IndexTeam/IndexTTS-2:alex',
      responseFormat: 'wav',
      speed: 1.0,
      gain: 0.0,
      timeout: 300000 // 5分钟超时
    }
  },

  // 文本处理限制
  limits: {
    maxTextLength: 1000, // MVP限制1000字
    maxScenes: 5
  },

  // 路径配置
  paths: {
    uploads: './uploads',
    temp: './temp',
    output: './output',
    // refAudio: './assets/ref_audio/ref.wav' // 参考音频（用于自定义音色）
  }
};
