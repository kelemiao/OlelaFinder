import {
  Climate,
  DensityFunction,
  WorldgenRegistries,
  Identifier,
  Holder,
  NoiseGeneratorSettings,
  RandomState,
  NoiseParameters,
  BiomeSource,
} from "deepslate";

export interface BiomeResult {
  x: number;
  z: number;
  y: number;
  biome: string;
  surface?: number;
  terrain?: number;
}

export interface CalculatorState {
  sampler?: Climate.Sampler;
  biomeSource?: BiomeSource;
  surfaceDensityFunction?: DensityFunction;
  terrainDensityFunction?: DensityFunction;
  noiseGeneratorSettings?: NoiseGeneratorSettings;
  randomState?: RandomState;
  seed: bigint;
}

export class BiomeCalculator {
  private state: CalculatorState = {
    seed: BigInt(0),
  };

  /**
   * 初始化计算器
   */
  public initialize(config: {
    biomeSourceJson: unknown;
    noiseGeneratorSettingsJson: unknown;
    densityFunctions?: Record<string, unknown>;
    noises?: Record<string, unknown>;
    surfaceDensityFunctionId?: string;
    terrainDensityFunctionId?: string;
    seed?: bigint;
  }): void {
    this.state.seed = config.seed ?? this.state.seed;

    // 注册密度函数
    if (config.densityFunctions) {
      WorldgenRegistries.DENSITY_FUNCTION.clear();
      for (const id in config.densityFunctions) {
        const df = new DensityFunction.HolderHolder(
          Holder.parser(
            WorldgenRegistries.DENSITY_FUNCTION,
            DensityFunction.fromJson
          )(config.densityFunctions[id])
        );
        WorldgenRegistries.DENSITY_FUNCTION.register(Identifier.parse(id), df);
      }
    }

    // 注册噪声参数
    if (config.noises) {
      WorldgenRegistries.NOISE.clear();
      for (const id in config.noises) {
        const noise = NoiseParameters.fromJson(config.noises[id]);
        WorldgenRegistries.NOISE.register(Identifier.parse(id), noise);
      }
    }

    // 设置生物群系源
    if (config.biomeSourceJson) {
      this.state.biomeSource = BiomeSource.fromJson(config.biomeSourceJson);
    }

    // 设置噪声生成器
    if (config.noiseGeneratorSettingsJson) {
      this.state.noiseGeneratorSettings = NoiseGeneratorSettings.fromJson(
        config.noiseGeneratorSettingsJson
      );
      this.state.randomState = new RandomState(
        this.state.noiseGeneratorSettings,
        this.state.seed
      );
      this.state.sampler = Climate.Sampler.fromRouter(
        this.state.randomState.router
      );
    }

    // 设置表面密度函数
    if (
      this.state.randomState &&
      this.state.noiseGeneratorSettings &&
      config.surfaceDensityFunctionId &&
      config.surfaceDensityFunctionId !== "<none>"
    ) {
      this.state.surfaceDensityFunction = new DensityFunction.HolderHolder(
        Holder.reference(
          WorldgenRegistries.DENSITY_FUNCTION,
          Identifier.parse(config.surfaceDensityFunctionId)
        )
      ).mapAll(
        this.state.randomState.createVisitor(
          this.state.noiseGeneratorSettings.noise,
          this.state.noiseGeneratorSettings.legacyRandomSource
        )
      );
    }

    // 设置地形密度函数
    if (
      this.state.randomState &&
      this.state.noiseGeneratorSettings &&
      config.terrainDensityFunctionId &&
      config.terrainDensityFunctionId !== "<none>"
    ) {
      this.state.terrainDensityFunction = new DensityFunction.HolderHolder(
        Holder.reference(
          WorldgenRegistries.DENSITY_FUNCTION,
          Identifier.parse(config.terrainDensityFunctionId)
        )
      ).mapAll(
        this.state.randomState.createVisitor(
          this.state.noiseGeneratorSettings.noise,
          this.state.noiseGeneratorSettings.legacyRandomSource
        )
      );
    }
  }

  /**
   * 获取单个坐标的生物群系
   */
  public getBiomeAt(x: number, z: number, y: number): BiomeResult {
    if (!this.state.biomeSource || !this.state.sampler) {
      throw new Error("Calculator not initialized");
    }

    const surface = this.state.surfaceDensityFunction?.compute(
      DensityFunction.context(x * 4, y, z * 4)
    );

    const actualY = surface !== undefined ? Math.min(surface, y) : y;

    const biome = this.state.biomeSource
      .getBiome(x >> 2, actualY >> 2, z >> 2, this.state.sampler)
      .toString();

    const terrain = this.state.terrainDensityFunction?.compute(
      DensityFunction.context(x * 4, actualY, z * 4)
    );

    return {
      x,
      z,
      y: actualY,
      biome,
      surface,
      terrain,
    };
  }

  /**
   * 批量获取区域内的生物群系
   */
  public getBiomesInArea(
    minX: number,
    minZ: number,
    maxX: number,
    maxZ: number,
    y: number,
    step: number = 4
  ): BiomeResult[] {
    const results: BiomeResult[] = [];

    for (let x = minX; x <= maxX; x += step) {
      for (let z = minZ; z <= maxZ; z += step) {
        results.push(this.getBiomeAt(x, z, y));
      }
    }

    return results;
  }

  /**
   * 获取气候参数
   */
  public getClimateAt(
    x: number,
    z: number,
    y: number
  ): Climate.TargetPoint | null {
    if (!this.state.sampler) {
      return null;
    }
    return this.state.sampler.sample(x >> 2, y >> 2, z >> 2);
  }

  /**
   * 搜索特定生物群系
   */
  public findBiome(
    targetBiome: string,
    centerX: number,
    centerZ: number,
    y: number,
    maxRadius: number = 6400,
    step: number = 64
  ): { x: number; z: number } | null {
    for (let radius = 0; radius <= maxRadius; radius += step) {
      for (let angle = 0; angle < Math.PI * 2; angle += step / Math.max(radius, step)) {
        const x = centerX + Math.floor(Math.sin(angle) * radius);
        const z = centerZ + Math.floor(Math.cos(angle) * radius);
        const result = this.getBiomeAt(x, z, y);
        if (result.biome === targetBiome) {
          return { x, z };
        }
      }
    }
    return null;
  }

  public getSeed(): bigint {
    return this.state.seed;
  }

  public isInitialized(): boolean {
    return !!(this.state.biomeSource && this.state.sampler);
  }
}
