import express from "express";
import cors from "cors";
import apiRoutes, { initializeCalculator } from "./api/routes";
import { CONFIG } from "./config";

const app = express();

// 中间件
app.use(cors());
app.use(express.json());

// 静态文件服务（用于加载数据包）
app.use("/vanilla", express.static(CONFIG.vanillaDatapackDir));
app.use("/datapacks", express.static(CONFIG.tectonicDatapackDir));

// API 路由
app.use("/api", apiRoutes);

// 健康检查
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// 根路由 - API 文档
app.get("/", (req, res) => {
  res.json({
    name: "Kelebot Gen2 Finder",
    version: "1.0.0",
    config: {
      seed: CONFIG.seed,
      mcVersion: CONFIG.mcVersion,
      dimension: CONFIG.dimension,
      datapack: "Tectonic 3.0.13",
    },
    endpoints: {
      "GET /api/biome": {
        description: "获取指定坐标的生物群系",
        params: { x: "X 坐标", z: "Z 坐标", y: "Y 坐标 (默认 64)" },
      },
      "GET /api/biomes/area": {
        description: "获取区域内的生物群系",
        params: {
          minX: "最小 X",
          minZ: "最小 Z",
          maxX: "最大 X",
          maxZ: "最大 Z",
          y: "Y 坐标",
          step: "采样步长",
        },
      },
      "GET /api/climate": {
        description: "获取气候参数",
        params: { x: "X 坐标", z: "Z 坐标", y: "Y 坐标" },
      },
      "GET /api/find-biome": {
        description: "搜索特定生物群系",
        params: {
          biome: "生物群系 ID",
          centerX: "搜索中心 X",
          centerZ: "搜索中心 Z",
          y: "Y 坐标",
          maxRadius: "最大搜索半径",
          step: "搜索步长",
        },
      },
      "GET /api/locate": {
        description: "查找指定坐标周围最近的指定生物群系",
        params: {
          biome: "生物群系 ID (如 minecraft:plains)",
          x: "当前 X 坐标",
          z: "当前 Z 坐标",
          y: "Y 坐标 (默认 64)",
          maxRadius: "最大搜索半径 (默认 6400)",
          step: "搜索步长 (默认 32)",
        },
        response: {
          found: "是否找到",
          biome: "生物群系 ID",
          x: "目标 X 坐标",
          z: "目标 Z 坐标",
          distance: "距离 (方块)",
        },
      },
      "GET /api/status": {
        description: "获取当前状态",
      },
      "GET /api/structures": {
        description: "获取所有可用的结构列表",
      },
      "GET /api/structure": {
        description: "获取指定坐标的结构",
        params: {
          x: "X 坐标",
          z: "Z 坐标",
        },
      },
      "GET /api/structures/area": {
        description: "获取指定坐标周围的所有结构",
        params: {
          x: "中心 X 坐标",
          z: "中心 Z 坐标",
          radius: "搜索半径 (默认 1000)",
        },
      },
      "GET /api/locate/structure": {
        description: "查找最近的指定结构",
        params: {
          structure: "结构 ID (如 minecraft:village_plains)",
          x: "当前 X 坐标",
          z: "当前 Z 坐标",
          maxRadius: "最大搜索半径 (默认 10000)",
        },
      },
    },
  });
});

// 启动服务器
async function start() {
  console.log("Kelebot Gen2 Finder 正在启动...");
  console.log(`   种子: ${CONFIG.seed}`);
  console.log(`   版本: ${CONFIG.mcVersion}`);
  console.log(`   数据包: Tectonic 3.0.13`);

  // 先启动服务器
  await new Promise<void>((resolve) => {
    app.listen(CONFIG.port, () => {
      console.log(`服务器运行在 http://localhost:${CONFIG.port}`);
      resolve();
    });
  });

  // 等待服务器完全启动
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // 然后初始化计算器
  console.log("正在加载数据包...");
  try {
    await initializeCalculator();
    console.log("计算器初始化完成");
  } catch (error) {
    console.error("初始化失败:", error);
    process.exit(1);
  }
}

start();
