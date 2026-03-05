import { Router, Request, Response } from "express";
import { BiomeSource, Identifier, NoiseGeneratorSettings, Climate, RandomState } from "deepslate";
import {
  BiomeCalculator,
  DatapackLoader,
  StructureFinder,
  parseSeed,
  getCustomDensityFunction,
} from "../core/index";
import { CONFIG } from "../config";

const router = Router();

// 全局实例
let datapackLoader: DatapackLoader | null = null;
let biomeCalculator: BiomeCalculator | null = null;
let structureFinder: StructureFinder | null = null;

/**
 * 初始化计算器（服务启动时调用）
 */
export async function initializeCalculator(): Promise<void> {
  datapackLoader = new DatapackLoader(CONFIG.mcVersion);

  // 通过 HTTP 加载原版数据包
  const vanillaUrl = `http://localhost:${CONFIG.port}/vanilla/${CONFIG.vanillaDatapackFile}`;
  console.log(`Loading vanilla datapack from: ${vanillaUrl}`);
  await datapackLoader.loadVanillaDatapack(vanillaUrl);

  // 通过 HTTP 加载 Tectonic 数据包
  const tectonicUrl = `http://localhost:${CONFIG.port}/datapacks/${encodeURIComponent(CONFIG.tectonicDatapackFile)}`;
  console.log(`Loading Tectonic datapack from: ${tectonicUrl}`);
  await datapackLoader.addDatapackFromUrl(tectonicUrl);

  // 加载 DNT (Dungeons and Taverns) 数据包
  if (CONFIG.dntDatapackFile) {
    const dntUrl = `http://localhost:${CONFIG.port}/datapacks/${encodeURIComponent(CONFIG.dntDatapackFile)}`;
    console.log(`Loading DNT datapack from: ${dntUrl}`);
    try {
      await datapackLoader.addDatapackFromUrl(dntUrl);
      console.log("DNT datapack loaded successfully");
    } catch (error) {
      console.warn(`Failed to load DNT datapack: ${error instanceof Error ? error.message : error}`);
    }
  }

  // 加载额外数据包
  for (const datapackFile of CONFIG.additionalDatapacks) {
    const url = `http://localhost:${CONFIG.port}/datapacks/${encodeURIComponent(datapackFile)}`;
    console.log(`Loading additional datapack from: ${url}`);
    try {
      await datapackLoader.addDatapackFromUrl(url);
    } catch (error) {
      console.warn(`Failed to load datapack ${datapackFile}: ${error instanceof Error ? error.message : error}`);
    }
  }

  // 加载维度数据
  console.log("Loading dimension data...");
  const dimensionId = Identifier.parse(CONFIG.dimension);
  const worldPresetId = Identifier.parse(CONFIG.worldPreset);
  console.log(`Dimension: ${dimensionId.toString()}, WorldPreset: ${worldPresetId.toString()}`);

  const dimensionData = await datapackLoader.loadDimensionAndSave(dimensionId, worldPresetId);
  console.log("Dimension data loaded successfully");

  // 初始化生物群系计算器
  biomeCalculator = new BiomeCalculator();
  const seedBigInt = parseSeed(CONFIG.seed);

  const surfaceDfId = getCustomDensityFunction(
    "snowcapped_surface",
    dimensionData.noiseSettingsId,
    dimensionId
  );
  const terrainDfId = getCustomDensityFunction(
    "map_simple_terrain",
    dimensionData.noiseSettingsId,
    dimensionId
  );

  biomeCalculator.initialize({
    biomeSourceJson: dimensionData.biomeSourceJson,
    noiseGeneratorSettingsJson: dimensionData.noiseSettingsJson,
    densityFunctions: dimensionData.densityFunctions,
    noises: dimensionData.noises,
    surfaceDensityFunctionId: surfaceDfId?.toString(),
    terrainDensityFunctionId: terrainDfId?.toString(),
    seed: seedBigInt,
  });

  // 初始化结构查找器
  structureFinder = new StructureFinder();
  const biomeSource = BiomeSource.fromJson(dimensionData.biomeSourceJson);
  const noiseGeneratorSettings = NoiseGeneratorSettings.fromJson(dimensionData.noiseSettingsJson);
  const randomState = new RandomState(noiseGeneratorSettings, seedBigInt);
  const sampler = Climate.Sampler.fromRouter(randomState.router);

  structureFinder.initialize({
    biomeSource,
    sampler,
    noiseGeneratorSettings,
    levelHeight: dimensionData.levelHeight,
    seed: seedBigInt,
  });

  console.log(`Level height: minY=${dimensionData.levelHeight.minY}, height=${dimensionData.levelHeight.height}`);
  console.log(`Available structures: ${structureFinder.getStructures().length}`);
  console.log(`Available structure sets: ${structureFinder.getStructureSets().length}`);
}

/**
 * GET /api/biome
 * 获取单个坐标的生物群系
 */
router.get("/biome", (req: Request, res: Response) => {
  try {
    if (!biomeCalculator?.isInitialized()) {
      return res.status(400).json({ error: "Calculator not initialized" });
    }

    const x = parseInt(req.query.x as string) || 0;
    const z = parseInt(req.query.z as string) || 0;
    const y = parseInt(req.query.y as string) || 64;

    const result = biomeCalculator.getBiomeAt(x, z, y);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/biomes/area
 * 获取区域内的生物群系
 */
router.get("/biomes/area", (req: Request, res: Response) => {
  try {
    if (!biomeCalculator?.isInitialized()) {
      return res.status(400).json({ error: "Calculator not initialized" });
    }

    const minX = parseInt(req.query.minX as string) || 0;
    const minZ = parseInt(req.query.minZ as string) || 0;
    const maxX = parseInt(req.query.maxX as string) || 256;
    const maxZ = parseInt(req.query.maxZ as string) || 256;
    const y = parseInt(req.query.y as string) || 64;
    const step = parseInt(req.query.step as string) || 16;

    const results = biomeCalculator.getBiomesInArea(minX, minZ, maxX, maxZ, y, step);
    res.json({
      count: results.length,
      biomes: results,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/climate
 * 获取气候参数
 */
router.get("/climate", (req: Request, res: Response) => {
  try {
    if (!biomeCalculator?.isInitialized()) {
      return res.status(400).json({ error: "Calculator not initialized" });
    }

    const x = parseInt(req.query.x as string) || 0;
    const z = parseInt(req.query.z as string) || 0;
    const y = parseInt(req.query.y as string) || 64;

    const climate = biomeCalculator.getClimateAt(x, z, y);
    if (!climate) {
      return res.status(500).json({ error: "Failed to get climate" });
    }

    res.json({
      x,
      z,
      y,
      temperature: climate.temperature,
      humidity: climate.humidity,
      continentalness: climate.continentalness,
      erosion: climate.erosion,
      depth: climate.depth,
      weirdness: climate.weirdness,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/find-biome
 * 搜索特定生物群系
 */
router.get("/find-biome", (req: Request, res: Response) => {
  try {
    if (!biomeCalculator?.isInitialized()) {
      return res.status(400).json({ error: "Calculator not initialized" });
    }

    const biome = req.query.biome as string;
    if (!biome) {
      return res.status(400).json({ error: "Biome parameter required" });
    }

    const centerX = parseInt(req.query.centerX as string) || 0;
    const centerZ = parseInt(req.query.centerZ as string) || 0;
    const y = parseInt(req.query.y as string) || 64;
    const maxRadius = parseInt(req.query.maxRadius as string) || 6400;
    const step = parseInt(req.query.step as string) || 64;

    const result = biomeCalculator.findBiome(biome, centerX, centerZ, y, maxRadius, step);

    if (result) {
      res.json({ found: true, ...result });
    } else {
      res.json({ found: false, message: "Biome not found within radius" });
    }
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/locate
 * 查找指定坐标周围最近的指定生物群系
 * 返回真正距离最近的位置
 */
router.get("/locate", (req: Request, res: Response) => {
  try {
    if (!biomeCalculator?.isInitialized()) {
      return res.status(400).json({ error: "Calculator not initialized" });
    }

    const biome = req.query.biome as string;
    if (!biome) {
      return res.status(400).json({ error: "biome parameter required" });
    }

    const x = parseInt(req.query.x as string) || 0;
    const z = parseInt(req.query.z as string) || 0;
    const y = parseInt(req.query.y as string) || 64;
    const maxRadius = parseInt(req.query.maxRadius as string) || 6400;
    const step = parseInt(req.query.step as string) || 32;

    // 螺旋搜索找到最近的目标生物群系
    const result = findNearestBiome(biomeCalculator, biome, x, z, y, maxRadius, step);

    if (result) {
      const distance = Math.sqrt(
        Math.pow(result.x - x, 2) + Math.pow(result.z - z, 2)
      );
      res.json({
        found: true,
        biome: result.biome,
        x: result.x,
        z: result.z,
        y: result.y,
        distance: Math.round(distance),
        surface: result.surface,
      });
    } else {
      res.json({
        found: false,
        message: `Biome '${biome}' not found within ${maxRadius} blocks`,
      });
    }
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * 螺旋搜索算法，找到真正最近的生物群系
 */
function findNearestBiome(
  calculator: BiomeCalculator,
  targetBiome: string,
  centerX: number,
  centerZ: number,
  y: number,
  maxRadius: number,
  step: number
): { x: number; z: number; y: number; biome: string; surface?: number } | null {
  // 先检查中心点
  const centerResult = calculator.getBiomeAt(centerX, centerZ, y);
  if (centerResult.biome === targetBiome) {
    return centerResult;
  }

  // 螺旋搜索：从内向外逐层搜索
  for (let radius = step; radius <= maxRadius; radius += step) {
    // 在当前半径的正方形边界上搜索
    // 上边 (从左到右)
    for (let dx = -radius; dx <= radius; dx += step) {
      const result = calculator.getBiomeAt(centerX + dx, centerZ - radius, y);
      if (result.biome === targetBiome) {
        return result;
      }
    }
    // 下边 (从左到右)
    for (let dx = -radius; dx <= radius; dx += step) {
      const result = calculator.getBiomeAt(centerX + dx, centerZ + radius, y);
      if (result.biome === targetBiome) {
        return result;
      }
    }
    // 左边 (不含角，从上到下)
    for (let dz = -radius + step; dz < radius; dz += step) {
      const result = calculator.getBiomeAt(centerX - radius, centerZ + dz, y);
      if (result.biome === targetBiome) {
        return result;
      }
    }
    // 右边 (不含角，从上到下)
    for (let dz = -radius + step; dz < radius; dz += step) {
      const result = calculator.getBiomeAt(centerX + radius, centerZ + dz, y);
      if (result.biome === targetBiome) {
        return result;
      }
    }
  }

  return null;
}

// 当前维度
let currentDimension = CONFIG.dimension;

/**
 * GET /api/status
 * 获取当前状态
 */
router.get("/status", (req: Request, res: Response) => {
  const datapacks = ["Tectonic 3.0.13"];
  if (CONFIG.dntDatapackFile) {
    datapacks.push("Dungeons and Taverns v4.7.3");
  }
  if (CONFIG.additionalDatapacks.length > 0) {
    datapacks.push(...CONFIG.additionalDatapacks);
  }

  res.json({
    initialized: biomeCalculator?.isInitialized() ?? false,
    structuresInitialized: structureFinder?.isInitialized() ?? false,
    config: {
      seed: CONFIG.seed,
      mcVersion: CONFIG.mcVersion,
      dimension: currentDimension,
      datapacks: datapacks,
    },
  });
});

/**
 * POST /api/dimension
 * 切换维度
 */
router.post("/dimension", async (req: Request, res: Response) => {
  try {
    const dimension = req.query.dimension as string || req.body?.dimension;
    if (!dimension) {
      return res.status(400).json({ error: "dimension parameter required" });
    }

    // 验证维度
    const validDimensions = ["minecraft:overworld", "minecraft:the_nether", "minecraft:the_end"];
    if (!validDimensions.includes(dimension)) {
      return res.status(400).json({ 
        error: `Invalid dimension. Valid options: ${validDimensions.join(", ")}` 
      });
    }

    if (dimension === currentDimension) {
      return res.json({ 
        success: true, 
        message: `Already in dimension ${dimension}`,
        dimension: currentDimension 
      });
    }

    console.log(`Switching dimension to: ${dimension}`);

    // 重新加载维度数据
    if (!datapackLoader) {
      return res.status(500).json({ error: "Datapack loader not initialized" });
    }

    const dimensionId = Identifier.parse(dimension);
    const worldPresetId = Identifier.parse(CONFIG.worldPreset);
    const dimensionData = await datapackLoader.loadDimensionAndSave(dimensionId, worldPresetId);

    // 重新初始化生物群系计算器
    biomeCalculator = new BiomeCalculator();
    const seedBigInt = parseSeed(CONFIG.seed);

    const surfaceDfId = getCustomDensityFunction(
      "snowcapped_surface",
      dimensionData.noiseSettingsId,
      dimensionId
    );
    const terrainDfId = getCustomDensityFunction(
      "map_simple_terrain",
      dimensionData.noiseSettingsId,
      dimensionId
    );

    biomeCalculator.initialize({
      biomeSourceJson: dimensionData.biomeSourceJson,
      noiseGeneratorSettingsJson: dimensionData.noiseSettingsJson,
      densityFunctions: dimensionData.densityFunctions,
      noises: dimensionData.noises,
      surfaceDensityFunctionId: surfaceDfId?.toString(),
      terrainDensityFunctionId: terrainDfId?.toString(),
      seed: seedBigInt,
    });

    // 重新初始化结构查找器
    structureFinder = new StructureFinder();
    const biomeSource = BiomeSource.fromJson(dimensionData.biomeSourceJson);
    const noiseGeneratorSettings = NoiseGeneratorSettings.fromJson(dimensionData.noiseSettingsJson);
    const randomState = new RandomState(noiseGeneratorSettings, seedBigInt);
    const sampler = Climate.Sampler.fromRouter(randomState.router);

    structureFinder.initialize({
      biomeSource,
      sampler,
      noiseGeneratorSettings,
      levelHeight: dimensionData.levelHeight,
      seed: seedBigInt,
    });

    currentDimension = dimension;

    console.log(`Dimension switched to: ${dimension}`);
    console.log(`Available structures: ${structureFinder.getStructures().length}`);

    res.json({
      success: true,
      dimension: currentDimension,
      structures: structureFinder.getStructures().length,
      structureSets: structureFinder.getStructureSets().length,
    });
  } catch (error) {
    console.error("Failed to switch dimension:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/structures
 * 获取所有可用的结构列表
 */
router.get("/structures", (req: Request, res: Response) => {
  try {
    if (!structureFinder?.isInitialized()) {
      return res.status(400).json({ error: "Structure finder not initialized" });
    }

    const unsupported = structureFinder.getUnsupportedStructures();
    const supported = structureFinder.getSupportedStructureSets();

    res.json({
      structures: structureFinder.getStructures(),
      structureSets: structureFinder.getStructureSets(),
      supportedStructureSets: supported,
      unsupportedStructures: unsupported,
      note: unsupported.length > 0 
        ? "Some structures are not supported by deepslate library (findGenerationPoint not implemented)"
        : undefined,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/structure
 * 获取指定坐标的结构
 */
router.get("/structure", (req: Request, res: Response) => {
  try {
    if (!structureFinder?.isInitialized()) {
      return res.status(400).json({ error: "Structure finder not initialized" });
    }

    const x = parseInt(req.query.x as string) || 0;
    const z = parseInt(req.query.z as string) || 0;

    const result = structureFinder.getStructureAt(x, z);

    if (result) {
      res.json({ found: true, ...result });
    } else {
      res.json({ found: false, message: "No structure at this location" });
    }
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/structures/area
 * 获取指定坐标周围的所有结构
 */
router.get("/structures/area", (req: Request, res: Response) => {
  try {
    if (!structureFinder?.isInitialized()) {
      return res.status(400).json({ error: "Structure finder not initialized" });
    }

    const x = parseInt(req.query.x as string) || 0;
    const z = parseInt(req.query.z as string) || 0;
    const radius = parseInt(req.query.radius as string) || 1000;

    const results = structureFinder.getStructuresInArea(x, z, radius);

    res.json({
      count: results.length,
      centerX: x,
      centerZ: z,
      radius,
      structures: results,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/locate/structure
 * 查找最近的指定结构
 */
router.get("/locate/structure", (req: Request, res: Response) => {
  try {
    if (!structureFinder?.isInitialized()) {
      return res.status(400).json({ error: "Structure finder not initialized" });
    }

    const structure = req.query.structure as string;
    if (!structure) {
      return res.status(400).json({ error: "structure parameter required" });
    }

    const x = parseInt(req.query.x as string) || 0;
    const z = parseInt(req.query.z as string) || 0;
    const maxRadius = parseInt(req.query.maxRadius as string) || 10000;

    const result = structureFinder.findNearestStructure(structure, x, z, maxRadius);

    if (result) {
      res.json({ found: true, ...result });
    } else {
      res.json({
        found: false,
        message: `Structure '${structure}' not found within ${maxRadius} blocks`,
      });
    }
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
