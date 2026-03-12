const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

class VideoComposerService {
  /**
   * 合成视频（图片 + 音频 + SRT 字幕）
   * @param {Array} scenes - 场景数组，包含 imagePath, audioPath
   * @param {string} outputPath - 输出视频路径
   * @param {string} srtPath - SRT 字幕文件路径（可选）
   */
  async composeVideo(scenes, outputPath, srtPath = null) {
    console.log(`开始合成视频，场景数: ${scenes.length}`);

    // 为每个场景创建临时视频片段
    const videoSegments = [];
    
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const segmentPath = path.join(
        path.dirname(outputPath),
        `segment_${i}.mp4`
      );

      await this.createVideoSegment(
        scene.imagePath,
        scene.audioPath,
        segmentPath
      );

      videoSegments.push(segmentPath);
    }

    // 合并所有片段
    const mergedPath = srtPath 
      ? path.join(path.dirname(outputPath), 'merged_no_subtitle.mp4')
      : outputPath;
    
    await this.mergeSegments(videoSegments, mergedPath);

    // 如果提供了 SRT 字幕，添加字幕
    if (srtPath && fs.existsSync(srtPath)) {
      await this.addSubtitles(mergedPath, srtPath, outputPath);
      // 删除无字幕的临时文件
      if (fs.existsSync(mergedPath)) {
        fs.unlinkSync(mergedPath);
      }
    }

    // 清理临时文件
    videoSegments.forEach(segment => {
      if (fs.existsSync(segment)) {
        fs.unlinkSync(segment);
      }
    });

    console.log(`视频合成完成: ${outputPath}`);
    return outputPath;
  }

  /**
   * 创建单个视频片段（图片 + 音频，不含字幕）
   */
  createVideoSegment(imagePath, audioPath, outputPath) {
    return new Promise((resolve, reject) => {
      // 获取音频时长
      ffmpeg.ffprobe(audioPath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }

        const duration = metadata.format.duration;

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
            '-vf', 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2'
          ])
          .output(outputPath)
          .on('end', () => resolve(outputPath))
          .on('error', reject)
          .run();
      });
    });
  }

  /**
   * 添加 SRT 字幕到视频
   */
  addSubtitles(videoPath, srtPath, outputPath) {
    return new Promise((resolve, reject) => {
      console.log('添加字幕:', { videoPath, srtPath, outputPath });
      
      // 使用绝对路径
      const absoluteSrtPath = path.resolve(srtPath);
      console.log('SRT 绝对路径:', absoluteSrtPath);
      
      // 在 Unix 系统上，subtitles 滤镜需要转义路径中的特殊字符
      // 将路径中的 : 和 \ 进行转义
      let escapedPath = absoluteSrtPath.replace(/\\/g, '/');
      escapedPath = escapedPath.replace(/:/g, '\\\\:');
      
      console.log('转义后路径:', escapedPath);
      
      // 构建字幕滤镜字符串
      const vfFilter = `subtitles=${escapedPath}`;
      
      console.log('视频滤镜:', vfFilter);
      
      ffmpeg()
        .input(videoPath)
        .videoFilters(vfFilter)
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

  /**
   * 生成动态字幕滤镜（按语速估算时间）- 已废弃，使用 SRT 字幕替代
   */
  generateDynamicSubtitles(text, duration) {
    // 将文本按句子分段
    const segments = this.splitTextIntoSegments(text, 35);
    
    if (segments.length === 0) return '';
    
    // 根据每段字数估算时长（中文平均语速：每秒4-5个字）
    const avgCharsPerSecond = 4.5;
    const segmentDurations = segments.map(seg => seg.length / avgCharsPerSecond);
    const totalEstimatedDuration = segmentDurations.reduce((a, b) => a + b, 0);
    
    // 计算时间缩放比例（让估算时长匹配实际音频时长）
    const timeScale = duration / totalEstimatedDuration;
    
    // 生成每段字幕的 drawtext 滤镜
    let currentTime = 0;
    const subtitleFilters = segments.map((segment, index) => {
      const segmentDuration = segmentDurations[index] * timeScale;
      const startTime = currentTime;
      const endTime = currentTime + segmentDuration;
      const fadeInDuration = 0.2; // 淡入时间
      const fadeOutDuration = 0.2; // 淡出时间
      
      currentTime = endTime;
      
      // 计算透明度（淡入淡出效果）
      const alphaExpression = `if(lt(t,${startTime.toFixed(2)}),0,if(lt(t,${(startTime + fadeInDuration).toFixed(2)}),(t-${startTime.toFixed(2)})/${fadeInDuration},if(lt(t,${(endTime - fadeOutDuration).toFixed(2)}),1,(${endTime.toFixed(2)}-t)/${fadeOutDuration})))`;
      
      return `drawtext=text='${this.escapeText(segment)}':fontfile=/System/Library/Fonts/PingFang.ttc:fontsize=48:fontcolor=white:box=1:boxcolor=black@0.5:boxborderw=5:x=(w-text_w)/2:y=h-th-50:alpha='${alphaExpression}'`;
    });
    
    console.log(`字幕时间分配 (总时长${duration.toFixed(2)}秒):`);
    segments.forEach((seg, i) => {
      const start = segmentDurations.slice(0, i).reduce((a, b) => a + b, 0) * timeScale;
      const end = start + segmentDurations[i] * timeScale;
      console.log(`  ${i + 1}. [${start.toFixed(2)}s - ${end.toFixed(2)}s] ${seg}`);
    });
    
    return ',' + subtitleFilters.join(',');
  }

  /**
   * 将文本智能分段（按标点符号和长度）
   */
  splitTextIntoSegments(text, maxLength = 35) {
    // 按主要标点符号分句
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
   * 合并视频片段
   */
  mergeSegments(segments, outputPath) {
    return new Promise((resolve, reject) => {
      // 创建concat文件列表，使用绝对路径
      const concatFile = path.join(path.dirname(outputPath), 'concat.txt');
      const concatContent = segments
        .map(s => `file '${path.resolve(s)}'`)
        .join('\n');
      
      fs.writeFileSync(concatFile, concatContent);
      
      console.log('concat.txt 内容:');
      console.log(concatContent);

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
          console.error('合并视频失败:', err);
          if (fs.existsSync(concatFile)) {
            console.error('concat.txt 内容:', fs.readFileSync(concatFile, 'utf8'));
            fs.unlinkSync(concatFile);
          }
          reject(err);
        })
        .run();
    });
  }

  /**
   * 转义字幕文本中的特殊字符
   */
  escapeText(text) {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/:/g, '\\:')
      .replace(/\n/g, ' ');
  }
}

module.exports = new VideoComposerService();
