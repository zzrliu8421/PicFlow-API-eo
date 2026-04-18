// 边缘函数 - API处理

// 检测设备类型
function detectDeviceType(userAgent) {
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  return mobileRegex.test(userAgent) ? 'pe' : 'pc';
}

// 检测浏览器支持的图片格式
function detectImageFormat(userAgent) {
  if (userAgent.includes('Chrome') || 
      userAgent.includes('Opera') || 
      userAgent.includes('Edge') ||
      userAgent.includes('Firefox') ||
      (userAgent.includes('Safari') && userAgent.includes('Version/14'))) {
    return 'webp';
  }
  return 'jpeg';
}

// 扫描图片文件
function scanImageFiles() {
  const fs = require('fs');
  const path = require('path');
  
  const convertedDir = path.join(process.cwd(), 'converted');
  const pcImages = [];
  const peImages = [];
  
  // 扫描PC图片
  const pcWebpDir = path.join(convertedDir, 'pc', 'webp');
  if (fs.existsSync(pcWebpDir)) {
    const files = fs.readdirSync(pcWebpDir);
    files.forEach(file => {
      if (file.endsWith('.webp')) {
        const filename = file.replace('.webp', '');
        pcImages.push(filename);
      }
    });
  }
  
  // 扫描移动设备图片
  const peWebpDir = path.join(convertedDir, 'pe', 'webp');
  if (fs.existsSync(peWebpDir)) {
    const files = fs.readdirSync(peWebpDir);
    files.forEach(file => {
      if (file.endsWith('.webp')) {
        const filename = file.replace('.webp', '');
        peImages.push(filename);
      }
    });
  }
  
  return { pcImages, peImages };
}

// 获取随机图片
function getRandomImage(type, format) {
  const { pcImages, peImages } = scanImageFiles();
  const imageList = type === 'pc' ? pcImages : peImages;
  
  if (imageList.length === 0) {
    return null;
  }
  
  const randomIndex = Math.floor(Math.random() * imageList.length);
  return imageList[randomIndex];
}

// 主处理函数
export default async function handler(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const userAgent = request.headers.get('User-Agent') || '';
  
  // 处理/api路径
  if (pathname === '/api') {
    const params = new URLSearchParams(url.search);
    const count = Math.max(1, Math.min(50, parseInt(params.get('count') || '1')));
    const returnType = params.get('return') || 'json';
    const type = params.get('type') || detectDeviceType(userAgent);
    const format = params.get('format') || detectImageFormat(userAgent);
    
    // 处理重定向
    if (returnType === 'redirect') {
      const randomImage = getRandomImage(type, format);
      if (!randomImage) {
        return new Response(JSON.stringify({
          success: false,
          message: 'No images found'
        }), {
          status: 404,
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }
      
      const imageUrl = `${url.origin}/converted/${type}/${format}/${randomImage}.${format}`;
      return new Response(null, {
        status: 302,
        headers: {
          'Location': imageUrl
        }
      });
    }
    
    // 生成JSON响应
    const images = [];
    for (let i = 0; i < count; i++) {
      const randomImage = getRandomImage(type, format);
      if (randomImage) {
        images.push({
          url: `${url.origin}/converted/${type}/${format}/${randomImage}.${format}`,
          format: format,
          type: type
        });
      }
    }
    
    return new Response(JSON.stringify({
      success: true,
      count: images.length,
      type: type,
      format: format,
      images: images
    }), {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
  
  // 处理/image路径
  if (pathname === '/image') {
    const type = detectDeviceType(userAgent);
    const format = detectImageFormat(userAgent);
    
    const randomImage = getRandomImage(type, format);
    if (!randomImage) {
      return new Response('No images found', {
        status: 404
      });
    }
    
    const imageUrl = `${url.origin}/converted/${type}/${format}/${randomImage}.${format}`;
    return new Response(null, {
      status: 302,
      headers: {
        'Location': imageUrl
      }
    });
  }
  
  // 其他路径，返回404
  return new Response('Not Found', {
    status: 404
  });
}
