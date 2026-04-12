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
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 800px;
      margin: 50px auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      background: white;
      padding: 30px;
      border-radius: 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 {
      color: #333;
      text-align: center;
      margin-bottom: 30px;
    }
    .info-item {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #eee;
    }
    .info-item:last-child {
      border-bottom: none;
    }
    .label {
      font-weight: bold;
      color: #555;
    }
    .value {
      color: #777;
    }
    .status {
      text-align: center;
      color: #28a745;
      font-size: 18px;
      margin-bottom: 20px;
    }
    .api-link {
      text-align: center;
      margin-top: 20px;
      padding: 15px;
      background: #f8f9fa;
      border-radius: 5px;
    }
    .api-link a {
      color: #007bff;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>PicFlow API</h1>
    <div class="status">✅ 服务运行中</div>
    
    <div class="info-item">
      <span class="label">服务状态</span>
      <span class="value">正常</span>
    </div>
    
    <div class="info-item">
      <span class="label">API 版本</span>
      <span class="value">3.0</span>
    </div>
    
    <div class="info-item">
      <span class="label">图片格式</span>
      <span class="value">WebP, AVIF, JPEG</span>
    </div>
    
    <div class="info-item">
      <span class="label">设备支持</span>
      <span class="value">PC, 移动端</span>
    </div>
    
    <div class="api-link">
      <a href="/api?count=10">测试API接口</a>
    </div>
  </div>
</body>
</html>
  `;
  fs.writeFileSync(indexHtmlPath, indexHtmlContent);
  console.log('Created index.html');
  
  // 创建API目录
  const apiDir = path.join(process.cwd(), 'dist', 'api');
  fs.mkdirSync(apiDir, { recursive: true });
  
  // 创建API处理文件
  const apiIndexPath = path.join(apiDir, 'index.html');
  const apiIndexContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>API Response</title>
</head>
<body>
  <script>
    // 解析URL参数
    function getParams() {
      const params = {};
      const search = window.location.search.substring(1);
      search.split('&').forEach(pair => {
        const [key, value] = pair.split('=');
        params[key] = decodeURIComponent(value);
      });
      return params;
    }
    
    // 获取随机图片
    function getRandomImage(type, index) {
      const baseUrl = window.location.origin;
      const formats = ['webp', 'avif', 'jpeg'];
      const format = formats[Math.floor(Math.random() * formats.length)];
      
      // 随机生成图片编号
      const maxImages = type === 'pc' ? 3 : 6;
      const randomNum = Math.floor(Math.random() * maxImages) + 1;
      
      return {
        url: baseUrl + '/converted/' + type + '/' + format + '/' + randomNum + '.' + format,
        format: format,
        type: type
      };
    }
    
    // 处理重定向
    function handleRedirect() {
      const params = getParams();
      if (params.return === 'redirect') {
        const type = params.type || 'pc';
        const image = getRandomImage(type, 0);
        window.location.href = image.url;
        return true;
      }
      return false;
    }
    
    // 生成API响应
    function generateResponse() {
      // 先处理重定向
      if (handleRedirect()) {
        return;
      }
      
      const params = getParams();
      const count = Math.max(1, Math.min(50, parseInt(params.count || '1')));
      const type = params.type || 'pc';
      
      const images = [];
      
      for (let i = 0; i < count; i++) {
        images.push(getRandomImage(type, i));
      }
      
      const response = {
        success: true,
        count: images.length,
        images: images
      };
      
      // 输出JSON响应
      document.body.innerHTML = '<pre>' + JSON.stringify(response, null, 2) + '</pre>';
    }
    
    // 执行生成响应
    generateResponse();
  </script>
</body>
</html>`;
  fs.writeFileSync(apiIndexPath, apiIndexContent);
  console.log('Created API directory and index.html');
  
  console.log('Build completed successfully');

}

// 执行构建
build();