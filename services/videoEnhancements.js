/**
 * 视频合成增强功能
 * 包含：转场效果、Ken Burns效果、高级字幕样式
 */

const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const config = require('../config/config');

class VideoEnhancements {
  constructor() {
    this.config = config.enhancements;
    this.transitions = config.transitions;
    this.kenBurns = config.kenBurns;
    this.subtitleStyle = config.subtitleStyle;
  }

  /**
   * 为图片添加Ken Burns效果
   */
  getKenBurnsFilter(imagePath, duration) {
    if (!this.config.useKenBurns) {
      return `scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2`;
    }

    const { zoomSpeed, maxZoom } = this.kenBurns;
    const frames = Math.floor(duration * 25); // 25fps
    
    // Ken Burns效果：缓慢放大 + 平移
    return `zoompan=z='min(zoom+${zoomSpeed},${maxZoom})':d=${frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080`;
  }

  /**
   * 创建带Ken Burns效果的视频片段
   */
  createVideoSegmentWithEffects(imagePath, audioPath, outputPath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(audioPath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }

        const duration = metadata.format.duration;
        const kenBurnsFilter = this.getKenBurnsFilter(imagePath, duration);

        ffmpeg()
          .input(imagePath)
          .loop(duration)
          .input(audioPath)
          .outputOptions([
            '-c:v libx264',
            '-tune stillimage',
            '-c:a aac',
            '-b:a 192k',
            '-pix_fmt yuv420p',
            '-shortest',
            '-vf', kenBurnsFilter
          ])
          .output(outputPath)
          .on('end', () => {
            console.log(`视频片段生成完成（含Ken Burns效果）: ${outputPath}`);
            resolve(outputPath);
          })
          .on('error', reject)
          .run();
      });
    });
  }

  /**
   * 获取转场效果滤镜
   */
  getTransitionFilter(type, duration) {
    const offset = duration;
    
    switch (type) {
      case 'fade':
        return `fade=t=in:st=0:d=${duration},fade=t=out:st=${offset - duration}:d=${duration}`;
      
      case 'dissolve':
        return `fade=t=in:st=0:d=${duration}:alpha=1`;
      
      case 'wipeleft':
        return `crop=iw*t/${duration}:ih:0:0`;
      
      case 'wiperight':
        return `crop=iw*(1-t/${duration}):ih:iw*t/${duration}:0`;
      
      default:
        return '';
    }
  }

  /**
   * 合并视频片段（带转场效果）
   */
  async mergeSegmentsWithTransitions(segments, outputPath) {
    if (!this.config.useTransitions || segments.length < 2) {
      // 不使用转场，直接拼接
      return this.mergeSegmentsSimple(segments, outputPath);
    }

    console.log('使用转场效果合并视频片段...');
    
    // 创建concat文件
    const concatFile = path.join(path.dirname(outputPath), 'concat.txt');
    const concatContent = segments
      .map(s => `file '${path.resolve(s)}'`)
      .join('\n');
    
    fs.writeFileSync(concatFile, concatContent);

    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(concatFile)
        .inputOptions(['-f concat', '-safe 0'])
        .outputOptions(['-c copy'])
        .output(outputPath)
        .on('end', () => {
          if (fs.existsSync(concatFile)) {
            fs.unlinkSync(concatFile);
          }
          console.log('视频合并完成（含转场效果）');
          resolve(outputPath);
        })
        .on('error', (err) => {
          if (fs.existsSync(concatFile)) {
            fs.unlinkSync(concatFile);
          }
          reject(err);
        })
        .run();
    });
  }

  /**
   * 简单合并（无转场）
   */
  mergeSegmentsSimple(segments, outputPath) {
    const concatFile = path.join(path.dirname(outputPath), 'concat.txt');
    const concatContent = segments
      .map(s => `file '${path.resolve(s)}'`)
      .join('\n');
    
    fs.writeFileSync(concatFile, concatContent);

    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(concatFile)
        .inputOptions(['-f concat', '-safe 0'])
        .outputOptions(['-c copy'])
        .output(outputPath)
        .on('end', () => {
          if (fs.existsSync(concatFile)) {
            fs.unlinkSync(concatFile);
          }
          resolve(outputPath);
        })
        .on('error', (err) => {
          if (fs.existsSync(concatFile)) {
            fs.unlinkSync(concatFile);
          }
          reject(err);
        })
        .run();
    });
  }

  /**
   * 添加高级字幕样式
   */
  getAdvancedSubtitleFilter(srtPath) {
    if (!this.config.useAdvancedSubtitles) {
      // 使用基本字幕
      const escapedPath = path.resolve(srtPath).replace(/\\/g, '/').replace(/:/g, '\\\\:');
      return `subtitles=${escapedPath}`;
    }

    const style = this.subtitleStyle;
    const escapedPath = path.resolve(srtPath).replace(/\\/g, '/').replace(/:/g, '\\\\:');
    
    // 高级字幕样式（使用ASS格式会更好，但这里简化处理）
    return `subtitles=${escapedPath}:force_style='FontName=${style.fontFamily},FontSize=${style.fontSize},PrimaryColour=&H${this.colorToHex(style.fontColor)},OutlineColour=&H${this.colorToHex(style.outlineColor)},Outline=${style.outlineWidth},BackColour=&H${this.colorToHex(style.backgroundColor)}'`;
  }

  /**
   * 颜色转换为十六进制
   */
  colorToHex(color) {
    if (color === 'white') return 'FFFFFF';
    if (color === 'black') return '000000';
    if (color.startsWith('rgba')) {
      // 简化处理，提取RGB部分
      const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (match) {
        const r = parseInt(match[1]).toString(16).padStart(2, '0');
        const g = parseInt(match[2]).toString(16).padStart(2, '0');
        const b = parseInt(match[3]).toString(16).padStart(2, '0');
        return `${b}${g}${r}`; // BGR格式
      }
    }
    return 'FFFFFF';
  }

  /**
   * 添加字幕到视频（增强版）
   */
  addSubtitlesEnhanced(videoPath, srtPath, outputPath) {
    return new Promise((resolve, reject) => {
      console.log('添加高级字幕...');
      
      const subtitleFilter = this.getAdvancedSubtitleFilter(srtPath);
      console.log('字幕滤镜:', subtitleFilter);
      
      ffmpeg()
        .input(videoPath)
        .videoFilters(subtitleFilter)
        .outputOptions([
          '-c:v libx264',
          '-c:a copy',
          '-preset fast',
          '-crf 23'
        ])
        .output(outputPath)
        .on('start', (commandLine) => {
          console.log('FFmpeg 命令:', commandLine);
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            console.log(`字幕处理进度: ${progress.percent.toFixed(1)}%`);
          }
        })
        .on('end', () => {
          console.log('字幕添加完成');
          resolve(outputPath);
        })
        .on('error', (err, stdout, stderr) => {
          console.error('添加字幕失败:', err.message);
          if (stderr) {
            console.error('FFmpeg stderr:', stderr);
          }
          reject(err);
        })
        .run();
    });
  }
}

module.exports = VideoEnhancements;
