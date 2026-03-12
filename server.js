const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const config = require('./config/config');
const apiRoutes = require('./routes/api');

const app = express();

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务
app.use(express.static('public'));
app.use('/output', express.static(config.paths.output));

// 确保必要的目录存在
const dirs = [
  config.paths.uploads,
  config.paths.temp,
  config.paths.output,
  // path.dirname(config.paths.refAudio)
];

dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`创建目录: ${dir}`);
  }
});

// API路由
app.use('/api', apiRoutes);

// 启动服务器
app.listen(config.port, () => {
  console.log(`🚀 服务器运行在 http://localhost:${config.port}`);
  console.log(`📁 上传目录: ${config.paths.uploads}`);
  console.log(`📁 输出目录: ${config.paths.output}`);
  console.log(`\n配置的服务：`);
  console.log(`  - SiliconFlow API: ${config.siliconflow.baseUrl}`);
  console.log(`  - LLM模型: ${config.siliconflow.llm.model}`);
  console.log(`  - 图像模型: ${config.siliconflow.image.model}`);
  console.log(`  - TTS模型: ${config.siliconflow.tts.model}`);
});
