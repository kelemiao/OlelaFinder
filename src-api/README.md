# Kelebot Gen2 Finder
## 固定配置

- 种子: `877470420230587172`
- 版本: `1.21.7`
- 数据包: `Tectonic 3.0.13`
- 世界类型: 默认

## 安装

```bash
npm install
```

## 运行

```bash
# 开发模式
npm run dev

# 或直接运行
npx tsx src/server.ts
```

## API 接口

### 获取生物群系

```http
GET /api/biome?x=0&z=0&y=64
```

响应：
```json
{
  "x": 0,
  "z": 0,
  "y": 64,
  "biome": "minecraft:deep_ocean",
  "surface": 71.69
}
```

### 获取区域生物群系

```http
GET /api/biomes/area?minX=-100&minZ=-100&maxX=100&maxZ=100&y=64&step=16
```

### 获取气候参数

```http
GET /api/climate?x=0&z=0&y=64
```

响应：
```json
{
  "x": 0,
  "z": 0,
  "y": 64,
  "temperature": 0.5,
  "humidity": 0.3,
  "continentalness": -0.8,
  "erosion": 0.1,
  "depth": 0,
  "weirdness": 0.4
}
```

### 搜索生物群系

```http
GET /api/find-biome?biome=minecraft:jungle&centerX=0&centerZ=0&y=64&maxRadius=6400&step=64
```

### 查找最近的生物群系

```http
GET /api/locate?biome=minecraft:plains&x=0&z=0&y=64&maxRadius=6400&step=32
```

响应：
```json
{
  "found": true,
  "biome": "minecraft:plains",
  "x": 1214,
  "z": 54,
  "y": 64,
  "distance": 1215,
  "surface": 72.5
}
```

### 获取状态

```http
GET /api/status
```

## 配置

配置文件位于 `src/config.ts`，包含：
- 种子
- MC 版本
- 数据包路径
- 服务器端口
olela啊
olela