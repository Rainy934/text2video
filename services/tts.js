const axios = require('axios');
const fs = require('fs');
const path = require('path');
const config = require('../config/config');

class SiliconFlowTTSService {
  constructor() {
    this.baseUrl = config.siliconflow.tts.baseUrl;
    this.apiKey = config.siliconflow.tts.apiKey;
    this.model = config.siliconflow.tts.model;
    this.voice = config.siliconflow.tts.voice;
    this.responseFormat = config.siliconflow.tts.responseFormat;
    this.speed = config.siliconflow.tts.speed;
    this.gain = config.siliconflow.tts.gain;
    this.timeout = config.siliconflow.tts.timeout;
    this.refAudioPath = config.paths.refAudio;
    
    // 缓存上传的自定义音色 URI
    this.customVoiceUri = null;
  }

  /**
   * 上传自定义音色（如果需要使用参考音频）
   */
  async uploadCustomVoice() {
    if (this.customVoiceUri) {
      return this.customVoiceUri;
    }

    // 检查参考音频是否存在
    if (!fs.existsSync(this.refAudioPath)) {
      console.log('参考音频不存在，使用系统预置音色');
      return null;
    }

    try {
      console.log('上传自定义音色...');
      
      // 读取音频文件并转换为 base64
      const audioBuffer = fs.readFileSync(this.refAudioPath);
      const base64Audio = audioBuffer.toString('base64');
      const audioExt = path.extname(this.refAudioPath).substring(1);
      const mimeType = audioExt === 'wav' ? 'audio/wav' : 'audio/mpeg';
      
      const response = await axios.post(
        `${this.baseUrl}/uploads/audio/voice`,
        {
          model: this.model,
          customName: 'custom-voice',
          audio: `data:${mimeType};base64,${base64Audio}`,
          text: '这是参考音频的示例文本' // 如果知道参考音频的文本内容，可以在这里填写
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 60000
        }
      );

      if (response.data.uri) {
        this.customVoiceUri = response.data.uri;
        console.log('自定义音色上传成功:', this.customVoiceUri);
        return this.customVoiceUri;
      }

      throw new Error('上传音色失败：未返回 URI');
    } catch (error) {
      console.error('上传自定义音色失败:', error.message);
      if (error.response) {
        console.error('响应状态:', error.response.status);
        console.error('响应数据:', JSON.stringify(error.response.data));
      }
      console.log('将使用系统预置音色');
      return null;
    }
  }

  /**
   * 生成TTS语音
   */
  async generateTTS(text, outputPath) {
    const startTime = Date.now();
    console.log(`开始生成TTS (${text.length}字): ${text.substring(0, 50)}...`);

    try {
      // 尝试上传自定义音色（如果有参考音频）
      const customVoice = await this.uploadCustomVoice();
      const voiceToUse = customVoice || this.voice;

      console.log(`使用音色: ${voiceToUse}`);

      const requestStart = Date.now();
      const response = await axios.post(
        `${this.baseUrl}/audio/speech`,
        {
          model: this.model,
          input: text,
          voice: voiceToUse,
          response_format: this.responseFormat,
          speed: this.speed,
          gain: this.gain
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          responseType: 'arraybuffer',
          timeout: this.timeout,
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        }
      );

      const requestTime = Date.now() - requestStart;
      console.log(`TTS API 响应时间: ${requestTime}ms`);

      // 保存音频文件
      fs.writeFileSync(outputPath, response.data);

      const totalTime = Date.now() - startTime;
      const fileSize = (response.data.length / 1024).toFixed(2);
      console.log(`TTS生成完成: ${outputPath}`);
      console.log(`总耗时: ${totalTime}ms (${(totalTime / 1000).toFixed(2)}秒), 文件大小: ${fileSize}KB`);
      
      return outputPath;

    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error(`TTS生成失败 (耗时${totalTime}ms):`, error.message);
      if (error.response) {
        console.error('响应状态:', error.response.status);
        if (error.response.data) {
          // 尝试解析错误信息
          try {
            const errorText = Buffer.from(error.response.data).toString('utf-8');
            console.error('响应数据:', errorText);
          } catch (e) {
            console.error('无法解析响应数据');
          }
        }
      }
      if (error.code === 'ECONNABORTED') {
        console.error('请求超时，可能是文本太长或服务器负载过高');
      }
      throw new Error(`TTS生成失败: ${error.message}`);
    }
  }

  /**
   * 生成TTS语音（带情感控制）- 使用动态音色
   */
  async generateTTSWithEmotion(text, refAudioPath, outputPath, options = {}) {
    console.log(`开始生成TTS（带情感控制）: ${text.substring(0, 50)}...`);

    try {
      // 读取参考音频并转换为 base64
      const audioBuffer = fs.readFileSync(refAudioPath);
      const base64Audio = audioBuffer.toString('base64');
      const audioExt = path.extname(refAudioPath).substring(1);
      const mimeType = audioExt === 'wav' ? 'audio/wav' : 'audio/mpeg';

      const response = await axios.post(
        `${this.baseUrl}/audio/speech`,
        {
          model: this.model,
          input: text,
          voice: '', // 空值表示使用动态音色
          response_format: this.responseFormat,
          speed: options.speed || this.speed,
          gain: options.gain || this.gain,
          references: [
            {
              audio: `data:${mimeType};base64,${base64Audio}`,
              text: options.refText || '参考音频文本'
            }
          ]
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          responseType: 'arraybuffer',
          timeout: this.timeout
        }
      );

      fs.writeFileSync(outputPath, response.data);
      console.log(`TTS生成完成: ${outputPath}`);
      return outputPath;

    } catch (error) {
      console.error('TTS生成失败:', error.message);
      if (error.response) {
        console.error('响应状态:', error.response.status);
        try {
          const errorText = Buffer.from(error.response.data).toString('utf-8');
          console.error('响应数据:', errorText);
        } catch (e) {
          console.error('无法解析响应数据');
        }
      }
      throw new Error(`TTS生成失败: ${error.message}`);
    }
  }
}

module.exports = new SiliconFlowTTSService();
