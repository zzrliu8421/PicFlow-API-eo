import fs from 'node:fs';
import path from 'node:path';

// 清理dist目录
function cleanDist() {
  const distPath = path.join(process.cwd(), 'dist');
  if (fs.existsSync(distPath)) {
    fs.rmSync(distPath, { recursive: true, force: true });
  }
  fs.mkdirSync(distPath, { recursive: true });
}

// 复制目录
function copyDirectory(source, target) {
  fs.mkdirSync(target, { recursive: true });
  const files = fs.readdirSync(source);
  for (const file of files) {
    const sourcePath = path.join(source, file);
    const targetPath = path.join(target, file);
    if (fs.statSync(sourcePath).isDirectory()) {
      copyDirectory(sourcePath, targetPath);
    } else {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

// 生成API边缘函数
function generateApiFunction(imageFileList) {
  const imageListJson = JSON.stringify(imageFileList);
  
  return `// 边缘函数 - API处理

// 图片文件列表（构建时嵌入）
const IMAGE_LIST = ${imageListJson};

// 检测设备类型
function detectDeviceType(userAgent) {
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  return mobileRegex.test(userAgent) ? 'pe' : 'pc';
}

// 检测浏览器支持的图片格式
function detectImageFormat(acceptHeader) {
  return 'webp';
}

// 主处理函数
export default function onRequest(context) {
  const request = context.request;
  const url = new URL(request.url);
  const userAgent = request.headers.get('User-Agent') || '';
  const acceptHeader = request.headers.get('Accept') || '';
  
  const params = new URLSearchParams(url.search);
  const count = Math.max(1, Math.min(50, parseInt(params.get('count') || '1')));
  const returnType = params.get('return') || 'json';
  const type = params.get('type') || detectDeviceType(userAgent);
  const format = params.get('format') || detectImageFormat(acceptHeader);
  
  // 获取图片列表
  const files = IMAGE_LIST[type]?.[format];
  if (!files || files.length === 0) {
    return new Response(JSON.stringify({
      success: false,
      message: 'No images found'
    }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  const fileCount = files.length;
  
  // 处理重定向
  if (returnType === 'redirect') {
    const randomImage = files[Math.floor(Math.random() * fileCount)];
    const imageUrl = \`\${url.origin}/converted/\${type}/\${format}/\${randomImage}.\${format}\`;
    
    return new Response(null, {
      status: 302,
      headers: { 'Location': imageUrl }
    });
  }
  
  // 生成图片URL列表
  const images = [];
  for (let i = 0; i < count; i++) {
    const randomImage = files[Math.floor(Math.random() * fileCount)];
    images.push({
      url: \`\${url.origin}/converted/\${type}/\${format}/\${randomImage}.\${format}\`,
      format,
      type
    });
  }
  
  // 处理文本返回类型
  if (returnType === 'text') {
    return new Response(images.map(img => img.url).join('\\n'), {
      headers: { 'Content-Type': 'text/plain' }
    });
  }
  
  // 返回JSON响应
  return new Response(JSON.stringify({
    success: true,
    count: images.length,
    type,
    format,
    images
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
`;
}

// 生成Image边缘函数
function generateImageFunction(imageFileList) {
  const imageListJson = JSON.stringify(imageFileList);
  
  return `// 边缘函数 - Image处理

// 图片文件列表（构建时嵌入）
const IMAGE_LIST = ${imageListJson};

// 检测设备类型
function detectDeviceType(userAgent) {
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  return mobileRegex.test(userAgent) ? 'pe' : 'pc';
}

// 检测浏览器支持的图片格式
function detectImageFormat(acceptHeader) {
  return 'webp';
}

// 主处理函数
export default function onRequest(context) {
  const request = context.request;
  const url = new URL(request.url);
  const userAgent = request.headers.get('User-Agent') || '';
  const acceptHeader = request.headers.get('Accept') || '';
  
  const type = detectDeviceType(userAgent);
  const format = detectImageFormat(acceptHeader);
  
  const files = IMAGE_LIST[type]?.[format];
  if (!files || files.length === 0) {
    return new Response('No images found', { status: 404 });
  }
  
  const randomImage = files[Math.floor(Math.random() * files.length)];
  const imageUrl = \`\${url.origin}/converted/\${type}/\${format}/\${randomImage}.\${format}\`;
  
  return new Response(null, {
    status: 302,
    headers: { 'Location': imageUrl }
  });
}
`;
}

// 构建函数
function build() {
  cleanDist();
  
  // 复制converted目录
  const convertedSource = path.join(process.cwd(), 'converted');
  const convertedTarget = path.join(process.cwd(), 'dist', 'converted');
  if (fs.existsSync(convertedSource)) {
    copyDirectory(convertedSource, convertedTarget);
    console.log('Copied converted directory');
  }
  
  // 复制images目录
  const imagesSource = path.join(process.cwd(), 'images');
  const imagesTarget = path.join(process.cwd(), 'dist', 'images');
  if (fs.existsSync(imagesSource)) {
    copyDirectory(imagesSource, imagesTarget);
    console.log('Copied images directory');
  }
  
  // 生成图片文件列表
  console.log('Generating image file list...');
  const imageFileList = {
    pc: {
      webp: []
    },
    pe: {
      webp: []
    }
  };

  // 扫描PC目录
  const pcWebpDir = path.join(convertedSource, 'pc', 'webp');
  const peWebpDir = path.join(convertedSource, 'pe', 'webp');

  // 处理PC目录
  if (fs.existsSync(pcWebpDir)) {
    try {
      const pcWebpFiles = fs.readdirSync(pcWebpDir);
      imageFileList.pc.webp = pcWebpFiles.map(file => path.basename(file, '.webp'));
      console.log(`Processed ${imageFileList.pc.webp.length} PC images`);
    } catch (error) {
      console.error('Error processing PC images:', error);
    }
  }

  // 处理PE目录
  if (fs.existsSync(peWebpDir)) {
    try {
      const peWebpFiles = fs.readdirSync(peWebpDir);
      imageFileList.pe.webp = peWebpFiles.map(file => path.basename(file, '.webp'));
      console.log(`Processed ${imageFileList.pe.webp.length} PE images`);
    } catch (error) {
      console.error('Error processing PE images:', error);
    }
  }

  // 保存图片文件列表到JSON文件
  try {
    const imageListPath = path.join(process.cwd(), 'dist', 'image-list.json');
    fs.writeFileSync(imageListPath, JSON.stringify(imageFileList, null, 2));
    console.log('Generated image-list.json');
  } catch (error) {
    console.error('Error saving image-list.json:', error);
  }
  
  // 生成API边缘函数（包含图片列表）
  try {
    const apiFunctionPath = path.join(process.cwd(), 'edge-functions', 'api', 'index.js');
    const apiFunctionContent = generateApiFunction(imageFileList);
    fs.writeFileSync(apiFunctionPath, apiFunctionContent);
    console.log('Generated API edge function');
  } catch (error) {
    console.error('Error generating API edge function:', error);
  }
  
  // 生成Image边缘函数（包含图片列表）
  try {
    const imageFunctionPath = path.join(process.cwd(), 'edge-functions', 'image', 'index.js');
    const imageFunctionContent = generateImageFunction(imageFileList);
    fs.writeFileSync(imageFunctionPath, imageFunctionContent);
    console.log('Generated Image edge function');
  } catch (error) {
    console.error('Error generating Image edge function:', error);
  }
  
  // 创建package.json文件
  const packageJsonPath = path.join(process.cwd(), 'dist', 'package.json');
  fs.writeFileSync(packageJsonPath, JSON.stringify({}, null, 2));
  console.log('Created package.json');
  
  // 创建index.html文件
  const indexHtmlPath = path.join(process.cwd(), 'dist', 'index.html');
  const indexHtmlContent = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PicFlow API</title>
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>️</text></svg>">
  <style>
    :root {
      --bg-primary: #0d1117;
      --bg-secondary: #161b22;
      --bg-card: #1c2333;
      --bg-hover: #21262d;
      --text-primary: #e6edf3;
      --text-secondary: #8b949e;
      --accent: #58a6ff;
      --accent-hover: #79b8ff;
      --accent-gradient: linear-gradient(135deg, #58a6ff 0%, #a371f7 100%);
      --border: #30363d;
      --success: #3fb950;
      --danger: #f85149;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: var(--bg-primary);
      min-height: 100vh;
      color: var(--text-primary);
      line-height: 1.6;
    }
    
    .container {
      max-width: 1100px;
      margin: 0 auto;
      padding: 20px;
    }
    
    .header {
      text-align: center;
      padding: 40px 0 30px;
    }
    
    .header h1 {
      font-size: 2.5em;
      font-weight: 700;
      margin-bottom: 10px;
      background: var(--accent-gradient);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    
    .header p {
      font-size: 1.1em;
      color: var(--text-secondary);
    }
    
    /* 导航栏 */
    .nav {
      display: flex;
      justify-content: center;
      gap: 15px;
      margin-bottom: 30px;
    }
    
    .nav a {
      display: inline-block;
      padding: 12px 30px;
      background: var(--bg-secondary);
      color: var(--text-primary);
      text-decoration: none;
      border-radius: 50px;
      font-weight: 500;
      transition: all 0.3s ease;
      border: 1px solid var(--border);
    }
    
    .nav a:hover {
      background: var(--bg-hover);
      transform: translateY(-2px);
    }
    
    .nav a.active {
      background: var(--accent-gradient);
      color: white;
      border-color: transparent;
    }
    
    /* 卡片样式 */
    .card {
      background: var(--bg-card);
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
      overflow: hidden;
      border: 1px solid var(--border);
    }
    
    .card-header {
      background: var(--accent-gradient);
      color: white;
      padding: 20px 30px;
    }
    
    .card-header h2 {
      font-size: 1.5em;
      margin: 0;
    }
    
    .card-body {
      padding: 30px;
    }
    
    /* 状态信息 */
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: rgba(63, 185, 80, 0.15);
      color: var(--success);
      border-radius: 20px;
      font-weight: 500;
      font-size: 0.9em;
      border: 1px solid rgba(63, 185, 80, 0.3);
    }
    
    .status-badge::before {
      content: '';
      width: 8px;
      height: 8px;
      background: var(--success);
      border-radius: 50%;
      animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin: 25px 0;
    }
    
    .info-item {
      background: var(--bg-secondary);
      padding: 15px 20px;
      border-radius: 10px;
      border-left: 4px solid var(--accent);
    }
    
    .info-item .label {
      font-size: 0.85em;
      color: var(--text-secondary);
      margin-bottom: 5px;
    }
    
    .info-item .value {
      font-weight: 600;
      color: var(--text-primary);
    }
    
    /* 测试按钮 */
    .test-section {
      text-align: center;
      margin: 25px 0;
    }
    
    .btn {
      display: inline-block;
      padding: 14px 40px;
      background: var(--accent-gradient);
      color: white;
      text-decoration: none;
      border-radius: 50px;
      font-weight: 600;
      font-size: 1em;
      border: none;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(88, 166, 255, 0.3);
    }
    
    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(88, 166, 255, 0.4);
    }
    
    .btn:active {
      transform: translateY(0);
    }
    
    .btn-secondary {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      box-shadow: 0 4px 15px rgba(245, 87, 108, 0.4);
    }
    
    .btn-secondary:hover {
      box-shadow: 0 6px 20px rgba(245, 87, 108, 0.5);
    }
    
    /* 预览图片 */
    .preview-container {
      margin-top: 20px;
      text-align: center;
    }
    
    .preview-image {
      max-width: 100%;
      max-height: 400px;
      border-radius: 12px;
      box-shadow: 0 5px 20px rgba(0,0,0,0.4);
      display: block;
      margin: 0 auto;
    }
    
    /* 图库样式 */
    .gallery-controls {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      flex-wrap: wrap;
      gap: 10px;
    }
    
    .gallery-controls .device-toggle {
      display: flex;
      gap: 10px;
    }
    
    .device-toggle button {
      padding: 8px 20px;
      border: 2px solid var(--accent);
      background: transparent;
      color: var(--accent);
      border-radius: 20px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.3s ease;
    }
    
    .device-toggle button.active {
      background: var(--accent);
      color: white;
    }
    
    .device-toggle button:hover {
      background: var(--bg-hover);
    }
    
    .gallery-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 15px;
    }
    
    .gallery-item {
      aspect-ratio: 1;
      border-radius: 10px;
      overflow: hidden;
      cursor: pointer;
      transition: all 0.3s ease;
      position: relative;
    }
    
    .gallery-item:hover {
      transform: scale(1.05);
      box-shadow: 0 5px 20px rgba(0,0,0,0.5);
    }
    
    .gallery-item img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    .pagination {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 15px;
      margin: 30px auto 0;
    }
    
    .pagination button {
      padding: 10px 24px;
      background: var(--bg-secondary);
      color: var(--accent);
      border: 2px solid var(--border);
      border-radius: 50px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.3s ease;
    }
    
    .pagination button:hover:not(:disabled) {
      background: var(--bg-hover);
      border-color: var(--accent);
    }
    
    .pagination button:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
    
    .pagination .page-info {
      color: var(--text-secondary);
      font-size: 0.9em;
    }
    
    .image-modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.95);
      z-index: 1000;
      cursor: pointer;
      justify-content: center;
      align-items: center;
    }
    
    .image-modal.active {
      display: flex;
    }
    
    .image-modal img {
      max-width: 90%;
      max-height: 90vh;
      object-fit: contain;
      border-radius: 8px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
    }
    
    .modal-close {
      position: absolute;
      top: 20px;
      right: 30px;
      font-size: 40px;
      color: white;
      cursor: pointer;
      transition: all 0.3s ease;
      user-select: none;
    }
    
    .modal-close:hover {
      color: var(--accent);
      transform: rotate(90deg);
    }
    
    /* 文档样式 */
    .doc-section {
      margin-top: 30px;
    }
    
    .doc-section h3 {
      color: var(--accent);
      margin: 25px 0 15px;
      font-size: 1.2em;
    }
    
    .endpoint {
      background: var(--bg-secondary);
      padding: 20px;
      border-radius: 12px;
      margin-bottom: 20px;
      border: 1px solid var(--border);
    }
    
    .endpoint h4 {
      color: var(--text-primary);
      margin-bottom: 10px;
      font-size: 1.1em;
    }
    
    .parameter {
      margin: 10px 0;
      padding-left: 15px;
      border-left: 2px solid var(--accent);
    }
    
    .parameter-name {
      font-weight: 600;
      color: var(--accent);
    }
    
    .parameter-type {
      color: var(--text-secondary);
      font-size: 0.9em;
    }
    
    .parameter-description {
      color: var(--text-secondary);
      margin-top: 5px;
    }
    
    .example {
      background: #2d3748;
      color: #e2e8f0;
      padding: 20px;
      border-radius: 10px;
      margin: 15px 0;
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 0.9em;
      overflow-x: auto;
    }
    
    .response {
      background: var(--bg-card);
      padding: 15px;
      border-radius: 10px;
      margin: 15px 0;
      border: 1px solid var(--border);
    }
    
    .response pre {
      color: var(--text-primary);
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 0.9em;
      overflow-x: auto;
    }
    
    .error-code {
      margin: 10px 0;
      padding: 10px 15px;
      background: #fff3f3;
      border-radius: 8px;
      border-left: 4px solid #f56565;
    }
    
    .error-code .parameter-name {
      color: #f56565;
    }
    
    /* 页脚 */
    .footer {
      text-align: center;
      padding: 30px 0;
      color: rgba(255,255,255,0.8);
      font-size: 0.9em;
    }
    
    .footer a {
      color: white;
      text-decoration: none;
    }
    
    .footer a:hover {
      text-decoration: underline;
    }
    
    /* 页面切换 */
    .page {
      display: none;
    }
    
    .page.active {
      display: block;
    }
    
    /* 响应式 */
    @media (max-width: 768px) {
      .header h1 {
        font-size: 2em;
      }
      
      .nav {
        flex-direction: column;
        align-items: center;
      }
      
      .nav a {
        width: 80%;
        text-align: center;
      }
      
      .info-grid {
        grid-template-columns: 1fr;
      }
      
      .gallery-grid {
        grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>PicFlow API</h1>
      <p>基于边缘计算的随机图片服务</p>
    </div>
    
    <div class="nav">
      <a href="#" class="active" onclick="showPage('home', this); return false;">首页</a>
      <a href="#" onclick="showPage('gallery', this); return false;">图库</a>
      <a href="#" onclick="showPage('docs', this); return false;">文档</a>
    </div>
    
    <!-- 首页 -->
    <div id="home-page" class="page active">
      <div class="card">
        <div class="card-header">
          <h2>服务状态</h2>
        </div>
        <div class="card-body">
          <div class="status-badge">服务运行中</div>
          
          <div class="info-grid">
            <div class="info-item">
              <div class="label">API 版本</div>
              <div class="value">3.0</div>
            </div>
            <div class="info-item">
              <div class="label">图片格式</div>
              <div class="value">WebP</div>
            </div>
            <div class="info-item">
              <div class="label">设备支持</div>
              <div class="value">PC / 移动端</div>
            </div>
            <div class="info-item">
              <div class="label">部署平台</div>
              <div class="value">EdgeOne Pages</div>
            </div>
          </div>
          
          <div class="test-section">
            <button class="btn" id="testBtn" onclick="fetchRandomImage()">获取随机图片</button>
          </div>
          
          <div class="preview-container">
            <img id="previewImage" class="preview-image" style="display:none;" alt="预览图片" />
            <p id="previewInfo" style="margin-top:10px;color:#888;font-size:0.9em;"></p>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 图库页 -->
    <div id="gallery-page" class="page">
      <div class="card">
        <div class="card-header">
          <h2>图库浏览</h2>
        </div>
        <div class="card-body">
          <div class="gallery-controls">
            <div class="device-toggle">
              <button class="active" onclick="switchDevice('pc', this)">PC 端</button>
              <button onclick="switchDevice('pe', this)">移动端</button>
            </div>
            <span id="imageCount" style="color: var(--text-secondary);"></span>
          </div>
          <div id="galleryGrid" class="gallery-grid"></div>
          <div class="pagination">
            <button id="prevBtn" onclick="prevPage()" disabled>上一页</button>
            <span class="page-info" id="pageInfo">1 / 1</span>
            <button id="nextBtn" onclick="nextPage()">下一页</button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 图片预览模态框 -->
    <div id="imageModal" class="image-modal" onclick="closeModal()">
      <span class="modal-close">&times;</span>
      <img id="modalImage" src="" alt="图片预览" />
    </div>
    
    <!-- 文档页 -->
    <div id="docs-page" class="page">
      <div class="card">
        <div class="card-header">
          <h2>API 文档</h2>
        </div>
        <div class="card-body doc-section">
          <h3>基本信息</h3>
          <p>PicFlow API 是一个轻量级的随机图片服务，基于EdgeOne Pages边缘函数实现，支持WebP图片格式，自动适配不同设备类型。</p>
          
          <h3>API 端点</h3>
          <div class="endpoint">
            <h4>GET /api</h4>
            <p>获取随机图片，支持多种返回格式</p>
            
            <h4>请求参数</h4>
            <div class="parameter">
              <div class="parameter-name">count</div>
              <div class="parameter-type">可选，整数</div>
              <div class="parameter-description">返回图片数量，默认1，最大50</div>
            </div>
            <div class="parameter">
              <div class="parameter-name">type</div>
              <div class="parameter-type">可选，字符串</div>
              <div class="parameter-description">设备类型，可选值：pc（电脑）、pe（移动设备），默认自动检测</div>
            </div>
            <div class="parameter">
              <div class="parameter-name">format</div>
              <div class="parameter-type">可选，字符串</div>
              <div class="parameter-description">图片格式，可选值：webp，默认webp</div>
            </div>
            <div class="parameter">
              <div class="parameter-name">return</div>
              <div class="parameter-type">可选，字符串</div>
              <div class="parameter-description">返回类型，可选值：redirect（重定向到图片）、json（返回JSON响应）、text（纯文本链接），默认json</div>
            </div>
            
            <h4>响应格式</h4>
            <div class="response">
              <pre>{
  "success": true,
  "count": 10,
  "type": "pc",
  "format": "webp",
  "images": [
    {
      "url": "https://example.com/converted/pc/webp/xxx.webp",
      "format": "webp",
      "type": "pc"
    }
  ]
}</pre>
            </div>
            
            <h4>使用示例</h4>
            <div class="example"># 获取10张随机图片
GET /api?count=10

# 获取移动设备图片
GET /api?type=pe&count=5

# 直接重定向到图片
GET /api?count=1&return=redirect

# 获取纯文本链接
GET /api?count=5&return=text</div>
          </div>
          
          <div class="endpoint">
            <h4>GET /image</h4>
            <p>直接返回随机图片文件流（302重定向）</p>
            
            <h4>请求参数</h4>
            <p>无</p>
            
            <h4>使用示例</h4>
            <div class="example"># 直接获取随机图片
GET /image

# 在HTML中使用
&lt;img src="https://your-domain.com/image" /&gt;

# 在CSS中使用
background-image: url('https://your-domain.com/image');</div>
          </div>
          
          <h3>错误码</h3>
          <div class="error-code">
            <div class="parameter-name">404</div>
            <div class="parameter-description">未找到图片</div>
          </div>
          <div class="error-code">
            <div class="parameter-name">500</div>
            <div class="parameter-description">服务器内部错误</div>
          </div>
          
          <h3>自动检测机制</h3>
          <p>API 会自动检测以下信息：</p>
          <ul style="margin-left:20px;">
            <li><strong>设备类型</strong>：根据用户代理字符串检测是电脑还是移动设备</li>
            <li><strong>图片格式</strong>：根据浏览器支持检测最佳图片格式（WebP）</li>
          </ul>
          <p style="margin-top:10px;">这意味着您可以直接访问 <code>/api</code> 或 <code>/image</code> 而不需要指定任何参数，API 会自动为您选择最合适的配置。</p>
        </div>
      </div>
    </div>
  </div>
  
  <div class="footer">
    <p>&copy; 2026 <a href="https://www.sylv.top" target="_blank">Sylvy</a>. All rights reserved.</p>
    <p>
      <a href="https://beian.miit.gov.cn/" target="_blank">豫ICP备2026013756号-1</a>
    </p>
  </div>
  
  <script>
    // 页面切换
    function showPage(page, el) {
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.nav a').forEach(a => a.classList.remove('active'));
      document.getElementById(page + '-page').classList.add('active');
      el.classList.add('active');
      
      if (page === 'gallery') {
        loadGallery('pc');
      }
    }
    
    // 获取随机图片
    function fetchRandomImage() {
      const btn = document.getElementById('testBtn');
      const img = document.getElementById('previewImage');
      const info = document.getElementById('previewInfo');
      
      btn.textContent = '加载中...';
      btn.disabled = true;
      
      // 使用时间戳避免缓存
      fetch('/api?count=1&_t=' + Date.now())
        .then(r => r.json())
        .then(data => {
          if (data.success && data.images.length > 0) {
            img.src = data.images[0].url + '?_t=' + Date.now();
            img.style.display = 'block';
            info.textContent = '格式: ' + data.format + ' | 类型: ' + data.type;
          }
        })
        .catch(err => {
          info.textContent = '加载失败，请重试';
        })
        .finally(() => {
          btn.textContent = '获取随机图片';
          btn.disabled = false;
        });
    }
    
    // 图库相关
    let imageData = null;
    let currentType = 'pc';
    let currentPage = 1;
    const imagesPerPage = 10;
    
    function switchDevice(type, btn) {
      document.querySelectorAll('.device-toggle button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentType = type;
      currentPage = 1;
      loadGallery(type);
    }
    
    function loadGallery(type) {
      if (!imageData) {
        fetch('/image-list.json')
          .then(r => r.json())
          .then(data => {
            imageData = data;
            renderGallery(type);
          });
      } else {
        renderGallery(type);
      }
    }
    
    function renderGallery(type) {
      const grid = document.getElementById('galleryGrid');
      const count = document.getElementById('imageCount');
      const images = imageData[type]?.webp || [];
      
      count.textContent = '共 ' + images.length + ' 张图片';
      
      const totalPages = Math.ceil(images.length / imagesPerPage);
      const startIndex = (currentPage - 1) * imagesPerPage;
      const endIndex = Math.min(startIndex + imagesPerPage, images.length);
      const pageImages = images.slice(startIndex, endIndex);
      
      grid.innerHTML = pageImages.map(name => 
        '<div class="gallery-item" onclick="openModal(this)">' +
          '<img src="/converted/' + type + '/webp/' + name + '.webp" loading="lazy" alt="' + name + '" />' +
        '</div>'
      ).join('');
      
      document.getElementById('pageInfo').textContent = currentPage + ' / ' + totalPages;
      document.getElementById('prevBtn').disabled = currentPage <= 1;
      document.getElementById('nextBtn').disabled = currentPage >= totalPages;
    }
    
    function prevPage() {
      if (currentPage > 1) {
        currentPage--;
        renderGallery(currentType);
      }
    }
    
    function nextPage() {
      const images = imageData[currentType]?.webp || [];
      const totalPages = Math.ceil(images.length / imagesPerPage);
      if (currentPage < totalPages) {
        currentPage++;
        renderGallery(currentType);
      }
    }
    
    function openModal(element) {
      const img = element.querySelector('img');
      const modal = document.getElementById('imageModal');
      const modalImg = document.getElementById('modalImage');
      modalImg.src = img.src;
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
    
    function closeModal() {
      const modal = document.getElementById('imageModal');
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
    
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        closeModal();
      }
    });
  </script>
</body>
</html>
  `;
  fs.writeFileSync(indexHtmlPath, indexHtmlContent);
  console.log('Created index.html');
  
  // 构建完成，不需要创建API和image目录，使用边缘函数处理这些路径
  console.log('Build completed successfully!');
}

// 执行构建
build();