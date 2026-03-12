const fs = require('fs');

class TextProcessor {
  /**
   * 读取并截断文本到指定长度
   */
  readAndTruncate(filePath, maxLength) {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // 清理文本
    let cleaned = content
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .trim();

    // 截断到指定长度
    if (cleaned.length > maxLength) {
      cleaned = cleaned.substring(0, maxLength);
      // 尝试在句子结束处截断
      const lastPeriod = Math.max(
        cleaned.lastIndexOf('。'),
        cleaned.lastIndexOf('！'),
        cleaned.lastIndexOf('？')
      );
      if (lastPeriod > maxLength * 0.8) {
        cleaned = cleaned.substring(0, lastPeriod + 1);
      }
    }

    return cleaned;
  }

  /**
   * 分割文本为段落
   */
  splitIntoParagraphs(text) {
    return text
      .split('\n')
      .map(p => p.trim())
      .filter(p => p.length > 0);
  }
}

module.exports = new TextProcessor();
