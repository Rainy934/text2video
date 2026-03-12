let selectedFile = null;
let currentTaskId = null;
let statusCheckInterval = null;

// DOM元素
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const uploadBtn = document.getElementById('uploadBtn');
const progressSection = document.getElementById('progressSection');
const resultSection = document.getElementById('resultSection');
const progressBar = document.getElementById('progressBar');
const progressPercent = document.getElementById('progressPercent');
const currentStep = document.getElementById('currentStep');
const logArea = document.getElementById('logArea');
const videoPlayer = document.getElementById('videoPlayer');
const downloadBtn = document.getElementById('downloadBtn');

// 文件选择
fileInput.addEventListener('change', (e) => {
  selectedFile = e.target.files[0];
  if (selectedFile) {
    fileName.textContent = selectedFile.name;
    fileInfo.classList.remove('hidden');
    uploadBtn.disabled = false;
  }
});

// 上传并开始处理
uploadBtn.addEventListener('click', async () => {
  if (!selectedFile) return;

  uploadBtn.disabled = true;
  uploadBtn.textContent = '处理中...';
  progressSection.classList.remove('hidden');
  resultSection.classList.add('hidden');

  const formData = new FormData();
  formData.append('file', selectedFile);

  try {
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });

    const data = await response.json();
    
    if (data.taskId) {
      currentTaskId = data.taskId;
      addLog('任务已创建: ' + currentTaskId);
      startStatusCheck();
    } else {
      throw new Error(data.error || '上传失败');
    }
  } catch (error) {
    addLog('错误: ' + error.message, 'error');
    uploadBtn.disabled = false;
    uploadBtn.textContent = '开始生成视频';
  }
});

// 开始轮询任务状态
function startStatusCheck() {
  if (statusCheckInterval) {
    clearInterval(statusCheckInterval);
  }

  statusCheckInterval = setInterval(async () => {
    try {
      const response = await fetch(`/api/status/${currentTaskId}`);
      const data = await response.json();

      updateProgress(data.progress, data.currentStep);

      if (data.status === 'completed') {
        clearInterval(statusCheckInterval);
        showResult(data.videoUrl);
      } else if (data.status === 'failed') {
        clearInterval(statusCheckInterval);
        addLog('处理失败: ' + data.error, 'error');
        uploadBtn.disabled = false;
        uploadBtn.textContent = '开始生成视频';
      }
    } catch (error) {
      console.error('状态查询失败:', error);
    }
  }, 2000); // 每2秒查询一次
}

// 更新进度
function updateProgress(progress, step) {
  progressBar.style.width = progress + '%';
  progressPercent.textContent = progress + '%';
  currentStep.textContent = step;
  addLog(`[${progress}%] ${step}`);
}

// 添加日志
function addLog(message, type = 'info') {
  const logEntry = document.createElement('div');
  logEntry.className = type === 'error' ? 'text-red-600' : 'text-gray-700';
  logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
  logArea.appendChild(logEntry);
  logArea.scrollTop = logArea.scrollHeight;
}

// 显示结果
function showResult(videoUrl) {
  resultSection.classList.remove('hidden');
  videoPlayer.src = videoUrl;
  downloadBtn.href = videoUrl;
  addLog('✅ 视频生成完成！', 'success');
  uploadBtn.disabled = false;
  uploadBtn.textContent = '开始生成视频';
}
