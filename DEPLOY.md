# PicFlow API 部署指南

## 📋 项目简介

PicFlow API 是一个轻量级的随机图片服务，专为智能设计，支持多种现代图片格式转换，包括 WebP、AVIF、JPEG 等格式。项目采用 Hono 框架开发，部署简单，性能优异。

## 🚀 部署到 EdgeOne Pages

### 环境要求

- **Node.js**: 20.18.0 或更高版本
- **npm**: 8.0.0 或更高版本
- **EdgeOne Pages 平台账号**

### 部署步骤

#### 1. 准备项目

1. **克隆项目**
   ```bash
   git clone https://github.com/matsuzaka-yuki/PicFlow-API.git
   cd PicFlow-API
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **构建项目**
   ```bash
   npm run build
   ```

#### 2. 配置 EdgeOne Pages

1. **登录 EdgeOne 控制台**
   - 访问 [EdgeOne 控制台](https://console.cloud.tencent.com/edgeone)
   - 选择或创建一个项目

2. **创建 Pages 站点**
   - 进入 "Pages" 页面
   - 点击 "创建站点"
   - 选择 "从代码仓库部署"
   - 连接你的代码仓库（GitHub、GitLab 等）

3. **配置构建参数**
   - **构建命令**: `npm run build`
   - **安装命令**: `npm install`
   - **输出目录**: `./dist`
   - **Node 版本**: `20.18.0`

4. **部署站点**
   - 点击 "部署" 按钮
   - 等待部署完成

### 3. 配置 edgeone.json

项目根目录已包含 `edgeone.json` 文件，用于配置 EdgeOne Pages 的行为：

```json
{
  "buildCommand": "npm run build",
  "installCommand": "npm install",
  "outputDirectory": "./dist",
  "nodeVersion": "20.18.0",
  "redirects": [
    {
      "source": "/api/*",
      "destination": "/api",
      "statusCode": 302
    }
  ],
  "headers": [
    {
      "source": "/*",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "Cache-Control",
          "value": "max-age=7200"
        }
      ]
    },
    {
      "source": "/converted/*",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "max-age=31536000"
        }
      ]
    }
  ],
  "caches": [
    {
      "source": "/converted/*",
      "cacheTtl": 86400
    }
  ]
}
```

### 4. 访问服务

部署完成后，你可以通过 EdgeOne Pages 提供的域名访问服务：

- **主页面**: `https://your-domain.pages.dev/`
- **API 接口**: `https://your-domain.pages.dev/api`
- **健康检查**: `https://your-domain.pages.dev/health`

## 📖 API 使用说明

### 基本参数

- `count`: 返回图片数量（默认：1，最大：50）
- `type`: 设备类型（`pc` 或 `pe`，默认自动检测）
- `img_format`: 图片格式（`auto`、`jpeg`、`webp`、`avif`，默认：`auto`）
- `return`: 返回类型（`json` 或 `redirect`，默认：`json`）
- `external`: 是否使用外链模式（`true` 或 `false`，默认：`false`）
- `format`: 输出格式（`json` 或 `text`，默认：`json`）

### 示例

1. **获取 10 张随机图片**
   ```
   GET /api?count=10
   ```

2. **获取 PC 端图片**
   ```
   GET /api?type=pc&count=5
   ```

3. **获取 WebP 格式图片**
   ```
   GET /api?img_format=webp&count=3
   ```

4. **直接重定向到图片**
   ```
   GET /api?count=1&return=redirect
   ```

5. **使用外链模式**
   ```
   GET /api?external=true&count=5
   ```

## 🛠️ 本地开发

### 启动开发服务器

```bash
npm run dev
```

访问 `http://localhost:8787` 查看服务。

### 构建项目

```bash
npm run build
```

构建结果将输出到 `dist` 目录。

## 📁 目录结构

```
picflow-api/
├── src/               # 源代码目录
│   └── index.ts       # 主入口文件
├── public/            # 静态文件目录
├── converted/         # 转换后图片目录
│   ├── pc/            # PC端转换图片
│   │   ├── webp/      # WebP格式
│   │   ├── avif/      # AVIF格式
│   │   └── jpeg/      # JPEG格式
│   └── pe/            # PE端转换图片
│       ├── webp/      # WebP格式
│       ├── avif/      # AVIF格式
│       └── jpeg/      # JPEG格式
├── images/            # 原始图片目录
│   ├── pc/            # PC端图片
│   └── pe/            # PE端图片
├── edgeone.json       # EdgeOne Pages 配置
├── wrangler.toml      # Cloudflare Workers 配置
└── package.json       # 项目配置
```

## 🔧 优化建议

1. **图片格式转换**
   - 使用 `convert_images.bat` 脚本批量转换图片格式
   - 确保 `converted` 目录下有足够的图片资源

2. **缓存策略**
   - EdgeOne Pages 已配置图片资源缓存时间为 1 天
   - 静态资源缓存时间为 1 年

3. **性能优化**
   - 启用 EdgeOne Pages 的边缘计算特性
   - 利用 CDN 加速图片加载

4. **安全配置**
   - 已配置 `X-Frame-Options: DENY` 防止点击劫持
   - 启用 CORS 支持，允许跨域请求

## 📞 联系方式

- **项目主页**: https://github.com/matsuzaka-yuki/PicFlow-API
- **邮箱**: 3231515355@qq.com

---

**PicFlow API** - 让随机图片处理更简单 🚀