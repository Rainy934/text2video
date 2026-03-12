const axios = require('axios');
const fs = require('fs');
const config = require('../config/config');

class SiliconFlowImageService {
  constructor() {
    this.baseUrl = config.siliconflow.image.baseUrl;
    this.apiKey = config.siliconflow.image.apiKey;
    this.model = config.siliconflow.image.model;
    this.imageSize = config.siliconflow.image.imageSize;
    this.numInferenceSteps = config.siliconflow.image.numInferenceSteps;
    this.guidanceScale = config.siliconflow.image.guidanceScale;
    this.negativePrompt = config.siliconflow.image.negativePrompt;
  }

  /**
   * 文生图（txt2img）
   */
  async generateImage(prompt, outputPath) {
    console.log(`生成图像: ${prompt.substring(0, 50)}...`);

    const params = {
      model: this.model,
      prompt: prompt,
      negative_prompt: this.negativePrompt,
      image_size: this.imageSize,
      num_inference_steps: this.numInferenceSteps,
      guidance_scale: this.guidanceScale,
      batch_size: 1,
      seed: Math.floor(Math.random() * 999999999) // 随机但可记录的 seed
    };

    try {
      const response = await axios.post(
        `${this.baseUrl}/images/generations`,
        params,
        {
          timeout: 300000, // 5分钟超时
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.images && response.data.images.length > 0) {
        const imageData = response.data.images[0];
        
        // 检查是否是 base64 格式
        if (imageData.url) {
          // 如果返回的是 URL，下载图片
          const imageResponse = await axios.get(imageData.url, {
            responseType: 'arraybuffer'
          });
          fs.writeFileSync(outputPath, imageResponse.data);
        } else if (imageData.b64_json) {
          // 如果返回的是 base64
          const imageBuffer = Buffer.from(imageData.b64_json, 'base64');
          fs.writeFileSync(outputPath, imageBuffer);
        } else {
          throw new Error('未知的图像数据格式');
        }
        
        console.log(`图像已保存: ${outputPath}`);
        return outputPath;
      }

      throw new Error('API返回的图像数量为0');
    } catch (error) {
      console.error('生成图像失败:', error.message);
      if (error.response) {
        console.error('响应状态:', error.response.status);
        console.error('响应数据:', JSON.stringify(error.response.data));
      }
      throw error;
    }
  }

  /**
   * 检查API可用性
   */
  async checkAvailability() {
    try {
      // 简单检查 API Key 是否配置
      if (!this.apiKey || this.apiKey === 'YOUR_API_KEY') {
        console.error('SiliconFlow API Key 未配置');
        return false;
      }
      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = new SiliconFlowImageService();
