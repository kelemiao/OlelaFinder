import {
  BiomeSource,
  Climate,
  Identifier,
  NoiseGeneratorSettings,
  StructurePlacement,
  StructureSet,
  WorldgenStructure,
} from "deepslate";

/**
 * deepslate 库中未实现 findGenerationPoint 的结构类型
 * 这些结构无法被查找，是库本身的限制
 */
export const UNSUPPORTED_STRUCTURE_TYPES = [
  "MineshaftStructure",
  "NetherFossilStructure", 
  "OceanMonumentStructure",
  "RuinedPortalStructure",
] as const;

/**
 * 检查结构是否被 deepslate 库支持
 */
export function isStructureSupported(structure: WorldgenStructure): boolean {
  return !(
    structure instanceof WorldgenStructure.MineshaftStructure ||
    structure instanceof WorldgenStructure.NetherFossilStructure ||
    structure instanceof WorldgenStructure.OceanMonumentStructure ||
    structure instanceof WorldgenStructure.RuinedPortalStructure
  );
}

/**
 * 检查结构集是否包含不支持的结构
 */
export function hasUnsupportedStructures(set: StructureSet): boolean {
  for (const entry of set.structures) {
    const structure = entry.structure.value();
    if (structure && !isStructureSupported(structure)) {
      return true;
    }
  }
  return false;
}

export interface StructureResult {
  structureId: string;
  structureSetId: string;
  x: number;
  z: number;
  chunkX: number;
  chunkZ: number;
  distance?: number;
}

export interface StructureFinderConfig {
  biomeSource: BiomeSource;
  sampler: Climate.Sampler;
  noiseGeneratorSettings: NoiseGeneratorSettings;
  levelHeight: { minY: number; height: number };
  seed: bigint;
}

/**
 * 缓存生物群系源 - 与原版保持一致的实现
 * 使用基于坐标的局部缓存策略
 */
const CACHE_SIZE = 11;
const CACHE_CENTER = 4;

class CachedBiomeSource implements BiomeSource {
  private cache: Map<number, Identifier> = new Map();
  private cache_center_x: number = 0;
  private cache_center_z: number = 0;

  constructor(private readonly base: BiomeSource) {}

  /**
   * 设置缓存中心点 - 关键方法！
   * 在检查每个区块的结构前必须调用
   */
  public setupCache(x: number, z: number): void {
    this.cache.clear();
    this.cache_center_x = x;
    this.cache_center_z = z;
  }

  public clearCache(): void {
    this.cache.clear();
  }

  getBiome(x: number, y: number, z: number, climateSampler: Climate.Sampler): Identifier {
    // 如果超出缓存范围，直接查询不缓存
    if (
      Math.abs(x - this.cache_center_x) > CACHE_CENTER ||
      Math.abs(z - this.cache_center_z) > CACHE_CENTER
    ) {
      return this.base.getBiome(x, y, z, climateSampler);
    }

    const cache_index =
      (y + 64) * CACHE_SIZE * CACHE_SIZE +
      (x - this.cache_center_x + CACHE_CENTER) * CACHE_SIZE +
      (z - this.cache_center_z + CACHE_CENTER);

    const cached = this.cache.get(cache_index);
    if (cached) {
      return cached;
    }

    const biome = this.base.getBiome(x, y, z, climateSampler);
    this.cache.set(cache_index, biome);
    return biome;
  }
}

/**
 * 结构查找器 - 用于查找 Minecraft 世界中的结构
 */
export class StructureFinder {
  private config: StructureFinderConfig | null = null;
  private generationContext: WorldgenStructure.GenerationContext | null = null;
  private cachedBiomeSource: CachedBiomeSource | null = null;

  /**
   * 初始化结构查找器
   */
  public initialize(config: StructureFinderConfig): void {
    this.config = config;
    this.cachedBiomeSource = new CachedBiomeSource(config.biomeSource);
    this.generationContext = new WorldgenStructure.GenerationContext(
      config.seed,
      this.cachedBiomeSource,
      config.noiseGeneratorSettings,
      config.levelHeight
    );
  }

  public isInitialized(): boolean {
    return this.config !== null && this.generationContext !== null;
  }

  /**
   * 获取所有已注册的结构集
   */
  public getStructureSets(): string[] {
    return Array.from(StructureSet.REGISTRY.keys()).map((id) => id.toString());
  }

  /**
   * 获取所有已注册的结构
   */
  public getStructures(): string[] {
    return Array.from(WorldgenStructure.REGISTRY.keys()).map((id) => id.toString());
  }

  /**
   * 获取不支持的结构列表（deepslate 库未实现）
   */
  public getUnsupportedStructures(): { structureId: string; structureSetId: string; reason: string }[] {
    const unsupported: { structureId: string; structureSetId: string; reason: string }[] = [];
    
    for (const setId of StructureSet.REGISTRY.keys()) {
      const set = StructureSet.REGISTRY.get(setId);
      if (!set) continue;
      
      for (const entry of set.structures) {
        const structure = entry.structure.value();
        const structureKey = entry.structure.key();
        if (structure && structureKey && !isStructureSupported(structure)) {
          unsupported.push({
            structureId: structureKey.toString(),
            structureSetId: setId.toString(),
            reason: `${structure.constructor.name} - findGenerationPoint not implemented in deepslate`,
          });
        }
      }
    }
    
    return unsupported;
  }

  /**
   * 获取支持的结构集（排除包含不支持结构的集合）
   */
  public getSupportedStructureSets(): string[] {
    const supported: string[] = [];
    
    for (const setId of StructureSet.REGISTRY.keys()) {
      const set = StructureSet.REGISTRY.get(setId);
      if (!set) continue;
      
      if (!hasUnsupportedStructures(set)) {
        supported.push(setId.toString());
      }
    }
    
    return supported;
  }

  /**
   * 查找指定坐标所在或附近的结构
   * 会检查周围 3x3 区块范围
   */
  public getStructureAt(x: number, z: number): StructureResult | null {
    if (!this.config || !this.generationContext) {
      throw new Error("StructureFinder not initialized");
    }

    const centerChunkX = x >> 4;
    const centerChunkZ = z >> 4;

    let nearest: StructureResult | null = null;
    let nearestDistance = Infinity;

    // 检查周围 3x3 区块范围
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const chunkX = centerChunkX + dx;
        const chunkZ = centerChunkZ + dz;

        for (const setId of StructureSet.REGISTRY.keys()) {
          const set = StructureSet.REGISTRY.get(setId);
          if (!set) continue;

          try {
            // 准备同心环放置
            if (set.placement instanceof StructurePlacement.ConcentricRingsStructurePlacement) {
              set.placement.prepare(
                this.config.biomeSource,
                this.config.sampler,
                this.config.seed
              );
            }

            // 检查该区块是否可能有结构
            const potentialChunks = set.placement.getPotentialStructureChunks(
              this.config.seed,
              chunkX,
              chunkZ,
              chunkX,
              chunkZ
            );

            for (const chunk of potentialChunks) {
              if (chunk[0] === chunkX && chunk[1] === chunkZ) {
                try {
                  // 关键：设置缓存中心到当前区块
                  this.cachedBiomeSource?.setupCache(chunkX << 2, chunkZ << 2);
                  const structure = set.getStructureInChunk(
                    chunkX,
                    chunkZ,
                    this.generationContext
                  );
                  if (structure) {
                    const dist = Math.sqrt(
                      Math.pow(structure.pos[0] - x, 2) +
                        Math.pow(structure.pos[2] - z, 2)
                    );
                    if (dist < nearestDistance) {
                      nearestDistance = dist;
                      nearest = {
                        structureId: structure.id.toString(),
                        structureSetId: setId.toString(),
                        x: structure.pos[0],
                        z: structure.pos[2],
                        chunkX,
                        chunkZ,
                        distance: Math.round(dist),
                      };
                    }
                  }
                } catch (e) {
                  // 忽略错误，继续检查其他结构集
                }
              }
            }
          } catch (e) {
            // 忽略错误
          }
        }
      }
    }

    return nearest;
  }

  /**
   * 查找指定坐标周围的所有结构
   */
  public getStructuresInArea(
    centerX: number,
    centerZ: number,
    radius: number
  ): StructureResult[] {
    if (!this.config || !this.generationContext) {
      throw new Error("StructureFinder not initialized");
    }

    const results: StructureResult[] = [];
    const minChunkX = (centerX - radius) >> 4;
    const minChunkZ = (centerZ - radius) >> 4;
    const maxChunkX = (centerX + radius) >> 4;
    const maxChunkZ = (centerZ + radius) >> 4;

    for (const setId of StructureSet.REGISTRY.keys()) {
      const set = StructureSet.REGISTRY.get(setId);
      if (!set) continue;

      try {
        // 准备同心环放置
        if (set.placement instanceof StructurePlacement.ConcentricRingsStructurePlacement) {
          set.placement.prepare(
            this.config.biomeSource,
            this.config.sampler,
            this.config.seed
          );
        }

        const potentialChunks = set.placement.getPotentialStructureChunks(
          this.config.seed,
          minChunkX,
          minChunkZ,
          maxChunkX,
          maxChunkZ
        );

        for (const chunk of potentialChunks) {
          try {
            // 关键：设置缓存中心到当前区块
            this.cachedBiomeSource?.setupCache(chunk[0] << 2, chunk[1] << 2);
            
            const structure = set.getStructureInChunk(
              chunk[0],
              chunk[1],
              this.generationContext
            );
            
            if (structure) {
              const dist = Math.sqrt(
                Math.pow(structure.pos[0] - centerX, 2) +
                  Math.pow(structure.pos[2] - centerZ, 2)
              );
              if (dist <= radius) {
                results.push({
                  structureId: structure.id.toString(),
                  structureSetId: setId.toString(),
                  x: structure.pos[0],
                  z: structure.pos[2],
                  chunkX: chunk[0],
                  chunkZ: chunk[1],
                  distance: Math.round(dist),
                });
              }
            }
          } catch (e) {
            // 忽略单个结构的错误，继续处理其他结构
          }
        }
      } catch (e) {
        // 忽略整个结构集的错误
      }
    }

    // 按距离排序
    results.sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
    return results;
  }

  /**
   * 查找最近的指定结构
   */
  public findNearestStructure(
    structureId: string,
    centerX: number,
    centerZ: number,
    maxRadius: number = 10000
  ): StructureResult | null {
    if (!this.config || !this.generationContext) {
      throw new Error("StructureFinder not initialized");
    }

    const targetId = Identifier.parse(structureId);
    let nearest: StructureResult | null = null;
    let nearestDistance = Infinity;

    // 找到包含目标结构的结构集
    const relevantSets: Identifier[] = [];
    for (const setId of StructureSet.REGISTRY.keys()) {
      const set = StructureSet.REGISTRY.get(setId);
      if (!set) continue;

      for (const entry of set.structures) {
        if (entry.structure.key()?.equals(targetId)) {
          relevantSets.push(setId);
          break;
        }
      }
    }

    if (relevantSets.length === 0) {
      return null;
    }

    // 逐步扩大搜索范围
    const searchStep = 512; // 32 chunks
    for (let radius = searchStep; radius <= maxRadius; radius += searchStep) {
      const minChunkX = (centerX - radius) >> 4;
      const minChunkZ = (centerZ - radius) >> 4;
      const maxChunkX = (centerX + radius) >> 4;
      const maxChunkZ = (centerZ + radius) >> 4;

      for (const setId of relevantSets) {
        const set = StructureSet.REGISTRY.get(setId);
        if (!set) continue;

        try {
          // 准备同心环放置
          if (set.placement instanceof StructurePlacement.ConcentricRingsStructurePlacement) {
            set.placement.prepare(
              this.config.biomeSource,
              this.config.sampler,
              this.config.seed
            );
          }

          const potentialChunks = set.placement.getPotentialStructureChunks(
            this.config.seed,
            minChunkX,
            minChunkZ,
            maxChunkX,
            maxChunkZ
          );

          for (const chunk of potentialChunks) {
            try {
              // 关键：设置缓存中心到当前区块
              this.cachedBiomeSource?.setupCache(chunk[0] << 2, chunk[1] << 2);
              const structure = set.getStructureInChunk(
                chunk[0],
                chunk[1],
                this.generationContext
              );

              if (structure && structure.id.equals(targetId)) {
                const dist = Math.sqrt(
                  Math.pow(structure.pos[0] - centerX, 2) +
                    Math.pow(structure.pos[2] - centerZ, 2)
                );

                if (dist < nearestDistance) {
                  nearestDistance = dist;
                  nearest = {
                    structureId: structure.id.toString(),
                    structureSetId: setId.toString(),
                    x: structure.pos[0],
                    z: structure.pos[2],
                    chunkX: chunk[0],
                    chunkZ: chunk[1],
                    distance: Math.round(dist),
                  };
                }
              }
            } catch (e) {
              // 忽略单个结构的错误
            }
          }
        } catch (e) {
          // 忽略整个结构集的错误
        }
      }

      // 如果在当前半径内找到了结构，且距离小于当前搜索半径，可以提前返回
      if (nearest && nearestDistance < radius - searchStep) {
        return nearest;
      }
    }

    return nearest;
  }
}
