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

// 图片文件列表（静态定义，因为边缘函数可能无法访问文件系统）
const pcImages = [
  '1', '2', '3', '075111cb9f61c92b26ed41d26bb5fc58', '0a052ca49e77335da8ec81b71029866d',
  '0f8c52aaea0c4b047597ef8b391a0bcb', '10fb8d9ac095c65436a009355d053bb2', '126e31b8116249e0d9a5d64d8f6687d1',
  '15b2d55c39d14a85eec96b6c8a33202d', '18119934e465d70deeea8756119b6862', '1aebe6b2949c958291e477531ec0788b',
  '20829b23e3656236f5aca02d85be0468', '260b87c09f200c367036fe971beb97a5', '28c04366ec15e3845234417bd639c0ea',
  '295834deb6b076d6a3a8f08e4a0b280e', '29b6a8ffdca93f3773cf9b02eb425182', '32656fbaab9ec905fd5c58efd09c4c0a',
  '32fa430c4dfeba34d0d8b1f609254cf2', '34ebb0bb10c630859c952a7abd66fc88', '3603d1b8b8a432eed51bb5baa3c2fcc0',
  '502e1326d9935d5b0072d8665421ed40', '5185d400f99ae704cab43876acc1fc7e', '51cd9d15bbc77cf90c1f8fdb2ba13355',
  '57e212087838e36338d6d3f0ffa2f3f4', '5a6ea3858bd4a41a0f57c5bb91b12073', '5b23ff73923a56de14eeafd24622e23c',
  '69dfcc49a6fa1da35c2ad178078268d0', '6b3011992d46ab62ef18e9a93367bdff', '6b6e9de95a0af4e9dc7d1c0fa0b242fb',
  '6c663bff4391dad1c51118dff74e01f0', '715d952605ff4ecb43fa7bf260f6e4c4', '75be3f5ff4755d93b73da377f06f98ed',
  '75e655b500e85b31b621020ca36c49f1', '780311cfcb8e75dc3d706bc6d33ec37b', '78d839c6adb35b1bfeeb75f839347e87',
  '8434aa5aa3faa41fc879aa9c09914477', '88420615de63c088e5ac6b0fc94268a5', '90667b3e805d4070eb8254a437f56701',
  '99aa525b746ad4fee6de8c1e02fa5d00', '9c81a447a53f2a84eced18c9a683380e', 'a1f93bc4dac0820d86e1457227f93828',
  'a31c4b53b51ebd5be2f1ba7df7832a30', 'a36a82dcfa28a0e859a5adb4abfa7fdd', 'a856c91b8b233236064eb5333e27ea06',
  'ad78b51efc39969a35141b1c18dd0570', 'b47633e42fe5e157bef54b5237ef2ddf', 'bfcef13747398bfa0eebc9bed9ea606e',
  'c35e727fbbc1378096574aaab4fed9db', 'cfdad3e8cb5da217197f101b04f72631', 'd077ddd68775aea0b80fbf149ce6e3e3',
  'da8b1e3af176b200502797e9a7cb6928', 'dc7c75c3a6c3aaa2dee614f14f2e81ba', 'dfa055227309405fe3718b0909cd21b0',
  'f4daa981a061a8f268729700541812ed', 'f5f217015b9187ec1ec0398fb694b8b4', 'fe8d4856e74c7e03959f34ff03a0b05a',
  'ff20deb7a16f0a54ac2aca23b6e4b85d'
];

const peImages = [
  '1', '2', '3', '4', '5', '6', '03b443b4d1ddbafac52d042c098fa2a3', '056946d7cac77a7f967dd50dbd6b6efa',
  '0db02cbd1d8ef7de82e8487a865b3d24', '0dc5029a767ab8a1eba609e6354f7506', '1262', '13c3f86f9ecb25bf4eac5723fa3a5f8d',
  '15732140fded3521e64616687072a613', '1f12bc9a2a7cee1235ea1ee2bf37dd14', '1portrait', '269c8bc753d51c37889c6a12c98ea3c3',
  '312aeac564bcc62fa6081a76468a95b5', '3b145596ab0ad19d72367a580e46680e', '3ed34f1b9592654e3e1088626275b810',
  '3ed7258fb1a2f7bd11ec9108134df01e', '43af3faa8e2606c958eee54f56b6da6a', '44c326548b9bf841f50545030a5166d7',
  '538c71f0524e2de6a51b14e9c6ff7b40', '5e16f39ba55e0767a8000fcbb97e0421', '60509bf08c81137e4ffb26e7dda63e39',
  '6cc0f8598e625909c829d06486612b3f', '6cf8d3f689be9183f7b5bafe21beef2c', '6d4d8c9dab3dcd947fdc85a131ab0246',
  '6dc060b0fe537deb949a360dd65b4312', '6f4e655adbbef747f13f3551aeba4c6e', '707009806ba14e951068855a4247a8a0',
  '7279cc35afe4e954653a3d2f99b5d01f', '7458a0ef8ce56547d2db46967215c209', '7b35b5168dd6f51d1fc15abf5dddd28e',
  '8649beef001da4050833617c8b015493', '8a6fa9718db258b5d7394cbece41cfbd', 'af3e222c3de6b223b747b24eff95ed8c',
  'b6f63b8cabca3ee8eb2ca5e81c61cafa', 'bd4592c74310db395ee3f7aecadd5233', 'cfc3f6ec556af9d7181719504e8d1b2e',
  'd1e47ad8ae4c29dac7095e34b89a0c31', 'd2aa3b4ae49f5c79348d1c4df6062ece', 'd3482a58b3ef4c20d71c4425f0281bdf',
  'd519860c149d54dadb5e6d683e006bb1', 'dde5105fa7b29415d0fe36337fa6dc8d', 'deeb4bac8b9bf81b262f0adf7fe81138',
  'e041d3cc37a45724d28585388e54ad7a', 'e13a55ea48c9b949d171b57fa51fe278', 'e215aa21fa8322e477db6dd2aa18b5a0',
  'ee159631f52d5bfeb3acc799af5c80b7', 'portrait'
];

// 获取随机图片
function getRandomImage(type, format) {
  const imageList = type === 'pc' ? pcImages : peImages;
  
  if (imageList.length === 0) {
    return null;
  }
  
  const randomIndex = Math.floor(Math.random() * imageList.length);
  return imageList[randomIndex];
}

// 主处理函数
export default function onRequest(context) {
  const request = context.request;
  const url = new URL(request.url);
  const userAgent = request.headers.get('User-Agent') || '';
  
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
