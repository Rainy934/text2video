const fs = require('fs');

class SRTGenerator {
  /**
   * 从场景数据生成 SRT 字幕文件
   * @param {Array} scenes - 场景数组，每个场景包含 narration
   * @param {string} outputPath - SRT 文件输出路径
   * @param {number} charsPerSecond - 每秒字符数（用于估算时长）
   */
  generateSRT(scenes, outputPath, charsPerSecond = 4.5) {
    const srtEntries = [];
    let currentTime = 0;

    scenes.forEach((scene, index) => {
      const narration = scene.narration || '';
      
      // 将解说词按句子分段
      const segments = this.splitIntoSegments(narration);
      
      segments.forEach(segment => {
        const duration = segment.length / charsPerSecond;
        const startTime = currentTime;
        const endTime = currentTime + duration;
        
        srtEntries.push({
          index: srtEntries.length + 1,
          startTime,
          endTime,
          text: segment
        });
        
        currentTime = endTime;
      });
    });

    // 生成 SRT 格式内容
    const srtContent = srtEntries.map(entry => {
      return [
        entry.index,
        `${this.formatTime(entry.startTime)} --> ${this.formatTime(entry.endTime)}`,
        entry.text,
        ''
      ].join('\n');
    }).join('\n');

    fs.writeFileSync(outputPath, srtContent, 'utf8');
    console.log(`SRT 字幕已生成: ${outputPath}`);
    
    return {
      srtPath: outputPath,
      entries: srtEntries,
      totalDuration: currentTime
    };
  }

  /**
   * 将文本智能分段（按标点符号和长度）
   */
  splitIntoSegments(text, maxLength = 35) {
    const sentences = text.split(/([，。！？；,\.!?;])/);
    const segments = [];
    let currentSegment = '';
    
    for (let i = 0; i < sentences.length; i++) {
      const part = sentences[i];
      
      // 如果是标点符号
      if (/^[，。！？；,\.!?;]$/.test(part)) {
        currentSegment += part;
        // 遇到句号、问号、感叹号时，结束当前段
        if (/^[。！？\.!?]$/.test(part)) {
          if (currentSegment.trim()) {
            segments.push(currentSegment.trim());
          }
          currentSegment = '';
        }
        // 遇到逗号且当前段已经较长，也结束当前段
        else if (/^[，,；;]$/.test(part) && currentSegment.length > maxLength * 0.7) {
          if (currentSegment.trim()) {
            segments.push(currentSegment.trim());
          }
          currentSegment = '';
        }
        continue;
      }
      
      // 如果加上这部分会超长，先保存当前段
      if (currentSegment.length + part.length > maxLength && currentSegment.trim()) {
        segments.push(currentSegment.trim());
        currentSegment = part;
      } else {
        currentSegment += part;
      }
    }
    
    // 保存最后一段
    if (currentSegment.trim()) {
      segments.push(currentSegment.trim());
    }
    
    // 如果没有分段成功，按固定长度强制分段
    if (segments.length === 0 && text.length > 0) {
      for (let i = 0; i < text.length; i += maxLength) {
        segments.push(text.substring(i, i + maxLength));
      }
    }
    
    return segments;
  }

  /**
   * 格式化时间为 SRT 格式 (HH:MM:SS,mmm)
   */
  formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const millis = Math.floor((seconds % 1) * 1000);
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
  }

  /**
   * 解析 SRT 文件
   */
  parseSRT(srtPath) {
    const content = fs.readFileSync(srtPath, 'utf8');
    const entries = [];
    const blocks = content.trim().split('\n\n');
    
    blocks.forEach(block => {
      const lines = block.split('\n');
      if (lines.length >= 3) {
        const index = parseInt(lines[0]);
        const timeMatch = lines[1].match(/(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/);
        
        if (timeMatch) {
          entries.push({
            index,
            startTime: this.parseTime(timeMatch[1]),
            endTime: this.parseTime(timeMatch[2]),
            text: lines.slice(2).join('\n')
          });
        }
      }
    });
    
    return entries;
  }

  /**
   * 解析 SRT 时间格式为秒数
   */
  parseTime(timeStr) {
    const [time, millis] = timeStr.split(',');
    const [hours, minutes, seconds] = time.split(':').map(Number);
    return hours * 3600 + minutes * 60 + seconds + parseInt(millis) / 1000;
  }
}

module.exports = new SRTGenerator();
