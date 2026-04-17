import { Hono } from 'hono';
import { serveStatic } from 'hono/serve-static';
import { cors } from 'hono/cors';
import { join } from 'node:path';

const app = new Hono();

// 添加CORS支持
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization']
}));


// 配置常量
const BASE_DIR = process.cwd();
const CONVERTED_IMAGES_DIR = join(BASE_DIR, 'converted');
const DEFAULT_IMAGE_COUNT = 1;
const MAX_IMAGES_PER_REQUEST = 50;
const CURRENT_IMAGE_MODE = 'random';
const API_VERSION = '3.0';

// 设备检测函数
function isMobile(userAgent: string): boolean {
  const useragent_commentsblock = userAgent.match(/\(.*?\)/)?.[0] || '';
  
  function CheckSubstrs(substrs: string[], text: string): boolean {
    for (const substr of substrs) {
      if (text.includes(substr)) {
        return true;
      }
    }
    return false;
  }
  
  const mobile_os_list = ['Google Wireless Transcoder', 'Windows CE', 'WindowsCE', 'Symbian', 'Android', 'armv6l', 'armv5', 'Mobile', 'CentOS', 'mowser', 'AvantGo', 'Opera Mobi', 'J2ME/MIDP', 'Smartphone', 'Go.Web', 'Palm', 'iPAQ'];
  const mobile_token_list = ['Profile/MIDP', 'Configuration/CLDC-', '160×160', '176×220', '240×240', '240×320', '320×240', 'UP.Browser', 'UP.Link', 'SymbianOS', 'PalmOS', 'PocketPC', 'SonyEricsson', 'Nokia', 'BlackBerry', 'Vodafone', 'BenQ', 'Novarra-Vision', 'Iris', 'NetFront', 'HTC_', 'Xda_', 'SAMSUNG-SGH', 'Wapaka', 'DoCoMo', 'iPhone', 'iPod'];
  
  const found_mobile = CheckSubstrs(mobile_os_list, useragent_commentsblock) || CheckSubstrs(mobile_token_list, userAgent);
  return found_mobile;
}

// 智能格式检测函数
function detectOptimalFormat(userAgent: string): string {
  // 检测是否支持WebP (广泛支持)
  if (userAgent.includes('Chrome') || 
      userAgent.includes('Opera') || 
      userAgent.includes('Edge') ||
      userAgent.includes('Firefox') ||
      (userAgent.includes('Safari') && userAgent.includes('Version/14'))) {
    return 'webp';
  }
  
  // 默认返回JPEG (兼容性最好)
  return 'jpeg';
}

// 格式化字节数
function formatBytes(size: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  while (size > 1024 && i < 3) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(2)} ${units[i]}`;
}

// 获取系统信息
function getBasicSystemInfo(userAgent: string, clientIP: string): any {
  return {
    node_version: process.version,
    os: process.platform,
    memory_limit: `${(process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2)} MB`,
    memory_usage: formatBytes(process.memoryUsage().heapUsed),
    current_time: new Date().toISOString(),
    client_ip: clientIP,
    user_agent: userAgent
  };
}

// 静态文件服务
app.use('/converted/*', serveStatic({
  root: BASE_DIR
}));

app.use('/images/*', serveStatic({
  root: BASE_DIR
}));

// 主页面
app.get('/', (c) => {
  const userAgent = c.req.header('User-Agent') || '';
  const clientIP = c.req.header('X-Forwarded-For') || c.req.header('Remote-Addr') || 'Unknown';
  const info = getBasicSystemInfo(userAgent, clientIP);
  
  return c.html(`
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
          <span class="label">Node.js 版本</span>
          <span class="value">${info.node_version}</span>
        </div>
        
        <div class="info-item">
          <span class="label">操作系统</span>
          <span class="value">${info.os}</span>
        </div>
        
        <div class="info-item">
          <span class="label">内存限制</span>
          <span class="value">${info.memory_limit}</span>
        </div>
        
        <div class="info-item">
          <span class="label">内存使用</span>
          <span class="value">${info.memory_usage}</span>
        </div>
        
        <div class="info-item">
          <span class="label">当前时间</span>
          <span class="value">${new Date(info.current_time).toLocaleString()}</span>
        </div>
        
        <div class="info-item">
          <span class="label">客户端IP</span>
          <span class="value">${info.client_ip}</span>
        </div>
        
        <div class="api-link">
          <a href="/api?count=10">测试API接口</a>
        </div>
      </div>
    </body>
    </html>
  `);
});

// API接口
app.get('/api', async (c) => {
  const userAgent = c.req.header('User-Agent') || '';
  const count = Math.max(1, Math.min(MAX_IMAGES_PER_REQUEST, parseInt(c.req.query('count') || DEFAULT_IMAGE_COUNT.toString())));
  const format = c.req.query('format') || 'json';
  const type = c.req.query('type') || (isMobile(userAgent) ? 'pe' : 'pc');
  const imageFormat = c.req.query('img_format') || 'auto';
  const returnType = c.req.query('return') || 'json';
  const external = c.req.query('external') === 'true' || c.req.query('external') === '1';
  
  // 模拟图片数据
  const mockImages = [];
  const baseUrl = c.req.url.split('/api')[0];
  
  if (external) {
    // 外链模式 - 从文件读取
    try {
      const fs = await import('fs/promises');
      const linkFile = join(BASE_DIR, `${type}.txt`);
      const links = await fs.readFile(linkFile, 'utf-8');
      const linkArray = links.split('\n').filter(link => link.trim());
      
      for (let i = 0; i < Math.min(count, linkArray.length); i++) {
        mockImages.push({
          filename: `external_${i + 1}`,
          url: linkArray[i].trim(),
          extension: 'external',
          type: type,
          size: 0,
          external: true,
          format: 'external',
          converted: false,
          external_mode: true
        });
      }
    } catch (error) {
      return c.json({
        success: false,
        message: '外链文件不存在或读取失败',
        count: 0,
        images: []
      });
    }
  } else {
    // 本地图片模式
    const formats = ['jpeg', 'webp'];
    const availableImages = [];
    
    try {
      const fs = await import('fs/promises');
      
      for (const fmt of formats) {
        const formatDir = join(CONVERTED_IMAGES_DIR, type, fmt);
        try {
          const files = await fs.readdir(formatDir);
          for (const file of files) {
            if (file !== '.' && file !== '..') {
              const filePath = join(formatDir, file);
              const stats = await fs.stat(filePath);
              availableImages.push({
                filename: file,
                path: filePath,
                url: `${baseUrl}/converted/${type}/${fmt}/${file}`,
                extension: fmt,
                type: type,
                size: stats.size,
                source: 'converted',
                format: fmt
              });
            }
          }
        } catch (error) {
          // 目录不存在，跳过
        }
      }
      
      // 随机选择图片
      if (availableImages.length > 0) {
        for (let i = 0; i < Math.min(count, availableImages.length); i++) {
          const randomIndex = Math.floor(Math.random() * availableImages.length);
          mockImages.push(availableImages[randomIndex]);
          availableImages.splice(randomIndex, 1);
        }
      }
    } catch (error) {
      return c.json({
        success: false,
        message: '读取图片文件失败',
        count: 0,
        images: []
      });
    }
  }
  
  if (mockImages.length === 0) {
    return c.json({
      success: false,
      message: '没有找到可用的图片',
      count: 0,
      images: []
    });
  }
  
  // 如果只要一张图片且返回类型是重定向，直接重定向
  if (count === 1 && returnType === 'redirect') {
    const image = mockImages[0];
    let redirectUrl = image.url;
    
    // 智能格式处理
    if (!external && imageFormat === 'auto') {
      const optimalFormat = detectOptimalFormat(userAgent);
      const filename = image.filename.split('.')[0];
      redirectUrl = `${baseUrl}/converted/${type}/${optimalFormat}/${filename}.${optimalFormat}`;
    } else if (!external && imageFormat !== 'original' && ['jpeg', 'webp'].includes(imageFormat)) {
      const filename = image.filename.split('.')[0];
      redirectUrl = `${baseUrl}/converted/${type}/${imageFormat}/${filename}.${imageFormat}`;
    }
    
    return c.redirect(redirectUrl, 302);
  }
  
  // 智能格式处理
    if (!external) {
      if (imageFormat === 'auto') {
        const optimalFormat = detectOptimalFormat(userAgent);
        for (const image of mockImages) {
          const filename = image.filename.split('.')[0];
          image.url = `${baseUrl}/converted/${type}/${optimalFormat}/${filename}.${optimalFormat}`;
          image.format = optimalFormat;
          image.converted = true;
          image.optimal_format = optimalFormat;
        }
      } else if (imageFormat !== 'original' && ['jpeg', 'webp'].includes(imageFormat)) {
        for (const image of mockImages) {
          const filename = image.filename.split('.')[0];
          image.url = `${baseUrl}/converted/${type}/${imageFormat}/${filename}.${imageFormat}`;
          image.format = imageFormat;
          image.converted = true;
          image.requested_format = imageFormat;
        }
      }
    }
  
  // 根据格式返回数据
  if (format === 'text' || format === 'url') {
    c.header('Content-Type', 'text/plain; charset=utf-8');
    return c.body(mockImages.map(image => image.url).join('\n'));
  } else {
    // JSON格式 (默认)
    const response = {
      success: true,
      count: mockImages.length,
      type: type,
      mode: CURRENT_IMAGE_MODE,
      total_available: mockImages.length,
      timestamp: Math.floor(Date.now() / 1000),
      api_version: API_VERSION,
      image_format: imageFormat,
      return_type: returnType,
      external_mode: external,
      user_agent: userAgent,
      images: mockImages
    };
    
    if (imageFormat === 'auto') {
      response.detected_format = detectOptimalFormat(userAgent);
    }
    
    return c.json(response);
  }
});

// 健康检查
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default app;