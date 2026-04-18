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
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 1000px;
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
    h2 {
      color: #555;
      margin-top: 40px;
      margin-bottom: 20px;
      border-bottom: 1px solid #eee;
      padding-bottom: 10px;
    }
    h3 {
      color: #666;
      margin-top: 20px;
      margin-bottom: 15px;
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
    .documentation {
      margin-top: 40px;
    }
    .endpoint {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 5px;
      margin-bottom: 20px;
    }
    .endpoint h4 {
      margin-top: 0;
      color: #333;
    }
    .parameter {
      margin-left: 20px;
      margin-bottom: 10px;
    }
    .parameter-name {
      font-weight: bold;
      color: #555;
    }
    .parameter-type {
      color: #888;
      font-size: 0.9em;
    }
    .parameter-description {
      margin-top: 5px;
      color: #666;
    }
    .example {
      background: #f0f0f0;
      padding: 15px;
      border-radius: 5px;
      margin: 15px 0;
      font-family: monospace;
      white-space: pre-wrap;
    }
    .response {
      background: #f0f8ff;
      padding: 15px;
      border-radius: 5px;
      margin: 15px 0;
    }
    .error-code {
      margin-left: 20px;
      margin-bottom: 10px;
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
      <span class="value">WebP</span>
    </div>
    
    <div class="info-item">
      <span class="label">设备支持</span>
      <span class="value">PC, 移动端</span>
    </div>
    
    <div class="api-link">
      <a href="/image">测试API接口</a>
    </div>
    
    <div class="documentation">
      <h2>API 文档</h2>
      
      <h3>基本信息</h3>
      <p>PicFlow API 是一个轻量级的随机图片服务，支持多种现代图片格式，自动适配不同设备类型。</p>
      
      <h3>API 端点</h3>
      <div class="endpoint">
        <h4>GET /api</h4>
        <p>获取随机图片</p>
        
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
          <div class="parameter-description">返回类型，可选值：redirect（重定向到图片）、json（返回JSON响应），默认json</div>
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
      "url": "https://example.com/converted/pc/webp/1.webp",
      "format": "webp",
      "type": "pc"
    },
    ...
  ]
}</pre>
        </div>
        
        <h4>使用示例</h4>
        <div class="example">
# 获取10张随机图片
GET /api?count=10

# 获取移动设备图片
GET /api?type=pe&count=5

# 直接重定向到图片
GET /api?count=1&return=redirect

# 指定图片格式
GET /api?format=webp&count=3
        </div>
      </div>
      
      <div class="endpoint">
        <h4>GET /image</h4>
        <p>直接返回随机图片文件流</p>
        
        <h4>请求参数</h4>
        <p>无</p>
        
        <h4>响应</h4>
        <p>返回图片文件流，根据设备类型和浏览器支持自动选择最佳图片格式</p>
        
        <h4>使用示例</h4>
        <div class="example">
# 直接获取随机图片
GET /image

# 在HTML中使用
<img 
      
      <h3>错误码</h3>
      <div class="error-code">
        <div class="parameter-name">400</div>
        <div class="parameter-description">请求参数错误</div>
      </div>
      <div class="error-code">
        <div class="parameter-name">500</div>
        <div class="parameter-description">服务器内部错误</div>
      </div>
      
      <h3>自动检测机制</h3>
      <p>API 会自动检测以下信息：</p>
      <ul>
        <li><strong>设备类型</strong>：根据用户代理字符串检测是电脑还是移动设备</li>
        <li><strong>图片格式</strong>：根据浏览器支持检测最佳图片格式</li>
      </ul>
      <p>这意味着您可以直接访问 <code>/api</code> 而不需要指定任何参数，API 会自动为您选择最合适的配置。</p>
    </div>
    
    <div class="footer" style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #888; font-size: 14px;">
      <p>© 2026-<script>document.write(new Date().getFullYear())</script> <a href="https://www.sylv.top" target="_blank" style="color: #888; text-decoration: none;">Sylvy</a>. All rights reserved.</p>
      <p>
        <a href="https://beian.miit.gov.cn/" target="_blank" style="color: #888; text-decoration: none;">豫ICP备2026013756号-1</a>
      </p>
    </div>
  </div>
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