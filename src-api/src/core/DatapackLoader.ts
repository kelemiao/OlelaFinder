import {
  Datapack,
  DatapackList,
  AnonymousDatapack,
  ResourceLocation,
} from "mc-datapack-loader";
import {
  DensityFunction,
  Holder,
  HolderSet,
  WorldgenRegistries,
  NoiseParameters,
  Identifier,
  Json,
  StructureSet,
  WorldgenStructure,
  StructureTemplatePool,
  Structure,
  NbtFile,
} from "deepslate";
import { getPreset } from "./BiomePresets";

export interface DimensionData {
  biomeSourceJson: unknown;
  noiseSettingsJson: unknown;
  noiseSettingsId: Identifier;
  densityFunctions: Record<string, unknown>;
  noises: Record<string, unknown>;
  levelHeight: { minY: number; height: number };
}

export class DatapackLoader {
  private datapacks: AnonymousDatapack[] = [];
  private compositeDatapack!: AnonymousDatapack;
  public dimensionData: DimensionData | null = null;

  constructor(private mcVersion: string = "1_21_4") {}

  /**
   * 加载原版数据包（通过 URL）
   */
  public async loadVanillaDatapack(url: string): Promise<void> {
    console.log(`Loading vanilla datapack from: ${url}`);
    
    // 先测试 URL 是否可访问
    const response = await fetch(url, { method: 'HEAD' });
    if (!response.ok) {
      throw new Error(`Failed to access ${url}: HTTP ${response.status}`);
    }
    
    const vanillaDatapack = Datapack.fromZipUrl(url, this.getDatapackFormat());
    this.datapacks = [vanillaDatapack];
    this.updateComposite();
    
    // 验证数据包是否正确加载
    const ids = await this.compositeDatapack.getIds(ResourceLocation.WORLDGEN_WORLD_PRESET);
    if (ids.length === 0) {
      throw new Error(`Failed to load vanilla datapack from ${url}`);
    }
    console.log(`Loaded ${ids.length} world presets`);
  }

  /**
   * 从 URL 添加数据包
   */
  public async addDatapackFromUrl(url: string): Promise<void> {
    console.log(`Loading datapack from: ${url}`);
    const datapack = Datapack.fromZipUrl(url, this.getDatapackFormat());
    this.datapacks.push(datapack);
    this.updateComposite();
  }

  private updateComposite(): void {
    const datapacks = this.datapacks;
    this.compositeDatapack = Datapack.compose(
      new (class implements DatapackList {
        async getDatapacks(): Promise<AnonymousDatapack[]> {
          return datapacks;
        }
      })()
    );
  }

  private getDatapackFormat(): number {
    const formats: Record<string, number> = {
      "1_19": 12,
      "1_20": 15,
      "1_20_2": 18,
      "1_20_4": 26,
      "1_20_6": 41,
      "1_21_1": 48,
      "1_21_3": 57,
      "1_21_4": 61,
      "1_21_5": 71,
      "1_21_7": 81,
    };
    return formats[this.mcVersion] ?? 61;
  }

  private getStructureResourceLocation(): ResourceLocation {
    // 1.21 及以上版本使用新的结构位置
    const newVersions = ["1_21_1", "1_21_3", "1_21_4", "1_21_5", "1_21_7"];
    if (newVersions.includes(this.mcVersion)) {
      return ResourceLocation.STRUCTURE;
    }
    return ResourceLocation.LEGACY_STRUCTURE;
  }

  /**
   * 获取所有可用维度
   */
  public async getDimensions(worldPreset: Identifier): Promise<Identifier[]> {
    const worldPresetJson = (await this.compositeDatapack.get(
      ResourceLocation.WORLDGEN_WORLD_PRESET,
      worldPreset
    )) as { dimensions: Record<string, unknown> };

    const dimensionIds = await this.compositeDatapack.getIds(ResourceLocation.DIMENSION);
    const presetDimensions = Object.keys(worldPresetJson.dimensions).map((i) =>
      Identifier.parse(i)
    );

    return [...dimensionIds, ...presetDimensions].filter(
      (value, index, self) => index === self.findIndex((t) => t.equals(value))
    );
  }

  /**
   * 加载维度数据
   */
  public async loadDimension(
    dimensionId: Identifier,
    worldPreset: Identifier = Identifier.create("normal")
  ): Promise<DimensionData> {
    // 注册所有资源
    await this.registerResources();

    let dimensionJson: any;

    if (await this.compositeDatapack.has(ResourceLocation.DIMENSION, dimensionId)) {
      dimensionJson = await this.compositeDatapack.get(
        ResourceLocation.DIMENSION,
        dimensionId
      );
    } else {
      const worldPresetJson = (await this.compositeDatapack.get(
        ResourceLocation.WORLDGEN_WORLD_PRESET,
        worldPreset
      )) as { dimensions: Record<string, any> };
      
      dimensionJson = worldPresetJson?.dimensions?.[dimensionId.toString()];
      if (!dimensionJson) {
        throw new Error(`Dimension ${dimensionId.toString()} not found in world preset ${worldPreset.toString()}`);
      }
    }

    // 获取维度类型
    const dimensionTypeId = Identifier.parse(dimensionJson.type);
    const dimensionTypeJson = (await this.compositeDatapack.get(
      ResourceLocation.DIMENSION_TYPE,
      dimensionTypeId
    )) as any;

    const levelHeight = {
      minY: dimensionTypeJson.min_y,
      height: dimensionTypeJson.height,
    };

    // 获取生成器配置
    const generator = Json.readObject(dimensionJson.generator) ?? {};
    if (generator?.type !== "minecraft:noise") {
      throw new Error("Dimension without noise generator");
    }

    // 获取噪声设置
    let noiseSettingsJson: Record<string, unknown>;
    let noiseSettingsId: Identifier;

    if (typeof generator.settings === "object") {
      noiseSettingsJson = Json.readObject(generator.settings) ?? {};
      noiseSettingsId = Identifier.parse("inline:inline");
    } else if (typeof generator.settings === "string") {
      noiseSettingsId = Identifier.parse(Json.readString(generator.settings) ?? "");
      noiseSettingsJson =
        Json.readObject(
          await this.compositeDatapack.get(
            ResourceLocation.WORLDGEN_NOISE_SETTINGS,
            noiseSettingsId
          )
        ) ?? {};
    } else {
      throw new Error("Malformed generator");
    }

    // 处理生物群系源
    let biomeSourceJson = Json.readObject(generator.biome_source) ?? {};
    if (biomeSourceJson.type === "minecraft:multi_noise" && "preset" in biomeSourceJson) {
      let preset = Json.readString(biomeSourceJson.preset) ?? "";
      const presetId = Identifier.parse(preset);
      if (
        await this.compositeDatapack.has(
          ResourceLocation.WORLDGEN_MULTI_NOISE_BIOME_SOURCE_PRARAMETER_LIST,
          presetId
        )
      ) {
        const parameterList = (await this.compositeDatapack.get(
          ResourceLocation.WORLDGEN_MULTI_NOISE_BIOME_SOURCE_PRARAMETER_LIST,
          presetId
        )) as { preset: string };
        preset = parameterList.preset;
      }
      biomeSourceJson.biomes = getPreset(preset, this.mcVersion);
    }

    // 收集密度函数和噪声
    const densityFunctions: Record<string, unknown> = {};
    for (const id of await this.compositeDatapack.getIds(
      ResourceLocation.WORLDGEN_DENSITY_FUNCTION
    )) {
      densityFunctions[id.toString()] = await this.compositeDatapack.get(
        ResourceLocation.WORLDGEN_DENSITY_FUNCTION,
        id
      );
    }

    const noises: Record<string, unknown> = {};
    for (const id of await this.compositeDatapack.getIds(ResourceLocation.WORLDGEN_NOISE)) {
      noises[id.toString()] = await this.compositeDatapack.get(
        ResourceLocation.WORLDGEN_NOISE,
        id
      );
    }

    return {
      biomeSourceJson,
      noiseSettingsJson,
      noiseSettingsId,
      densityFunctions,
      noises,
      levelHeight,
    };
  }

  /**
   * 加载维度数据并保存
   */
  public async loadDimensionAndSave(
    dimensionId: Identifier,
    worldPreset: Identifier = Identifier.create("normal")
  ): Promise<DimensionData> {
    const data = await this.loadDimension(dimensionId, worldPreset);
    this.dimensionData = data;
    return data;
  }

  private async registerResources(): Promise<void> {
    // 注册密度函数
    WorldgenRegistries.DENSITY_FUNCTION.clear();
    for (const id of await this.compositeDatapack.getIds(
      ResourceLocation.WORLDGEN_DENSITY_FUNCTION
    )) {
      try {
        const data = await this.compositeDatapack.get(
          ResourceLocation.WORLDGEN_DENSITY_FUNCTION,
          id
        );
        const df = new DensityFunction.HolderHolder(
          Holder.parser(WorldgenRegistries.DENSITY_FUNCTION, DensityFunction.fromJson)(data)
        );
        WorldgenRegistries.DENSITY_FUNCTION.register(id, df);
      } catch (e) {
        console.warn(`Failed to register density function: ${id.toString()}`);
      }
    }

    // 注册噪声
    WorldgenRegistries.NOISE.clear();
    for (const id of await this.compositeDatapack.getIds(ResourceLocation.WORLDGEN_NOISE)) {
      try {
        const data = await this.compositeDatapack.get(ResourceLocation.WORLDGEN_NOISE, id);
        const noise = NoiseParameters.fromJson(data);
        WorldgenRegistries.NOISE.register(id, noise);
      } catch (e) {
        console.warn(`Failed to register noise: ${id.toString()}`);
      }
    }

    // 注册生物群系
    WorldgenRegistries.BIOME.clear();
    for (const id of await this.compositeDatapack.getIds(ResourceLocation.WORLDGEN_BIOME)) {
      WorldgenRegistries.BIOME.register(id, {});
    }

    // 注册生物群系标签
    const biomeTagRegistry = WorldgenRegistries.BIOME.getTagRegistry();
    biomeTagRegistry.clear();
    for (const id of await this.compositeDatapack.getIds(ResourceLocation.WORLDGEN_BIOME_TAG)) {
      try {
        const data = await this.compositeDatapack.get(ResourceLocation.WORLDGEN_BIOME_TAG, id);
        const holderSet = HolderSet.fromJson(WorldgenRegistries.BIOME, data, id);
        biomeTagRegistry.register(id, holderSet);
      } catch (e) {
        console.warn(`Failed to register biome tag: ${id.toString()}`);
      }
    }

    // 注册模板池
    StructureTemplatePool.REGISTRY.clear();
    for (const id of await this.compositeDatapack.getIds(ResourceLocation.WORLDGEN_TEMPLATE_POOL)) {
      try {
        const data = await this.compositeDatapack.get(ResourceLocation.WORLDGEN_TEMPLATE_POOL, id);
        const pool = StructureTemplatePool.fromJson(data);
        StructureTemplatePool.REGISTRY.register(id, pool);
      } catch (e) {
        // 静默忽略模板池错误，因为很多模板池依赖于 NBT 结构文件
      }
    }

    // 注册结构模板（NBT 文件）- 这是 Jigsaw 结构所需要的
    Structure.REGISTRY.clear();
    const structureLocation = this.getStructureResourceLocation();
    for (const id of await this.compositeDatapack.getIds(structureLocation)) {
      try {
        const data = await this.compositeDatapack.get(structureLocation, id);
        // data 是 ArrayBuffer，需要转换为 Structure
        Structure.REGISTRY.register(id, () => {
          const nbtFile = NbtFile.read(new Uint8Array(data as ArrayBuffer));
          return Structure.fromNbt(nbtFile.root);
        });
      } catch (e) {
        // 静默忽略结构模板错误
      }
    }
    console.log(`Registered ${Structure.REGISTRY.keys().length} structure templates`);

    // 注册结构
    WorldgenStructure.REGISTRY.clear();
    for (const id of await this.compositeDatapack.getIds(ResourceLocation.WORLDGEN_STRUCTURE)) {
      try {
        const data = await this.compositeDatapack.get(ResourceLocation.WORLDGEN_STRUCTURE, id);
        // 移除 dimension_padding 字段（某些版本不支持）
        const root = Json.readObject(data) ?? {};
        delete root.dimension_padding;
        const structure = WorldgenStructure.fromJson(root);
        WorldgenStructure.REGISTRY.register(id, structure);
      } catch (e) {
        console.warn(`Failed to register structure: ${id.toString()}: ${e}`);
      }
    }

    // 注册结构标签
    const structureTagRegistry = WorldgenStructure.REGISTRY.getTagRegistry();
    structureTagRegistry.clear();
    for (const id of await this.compositeDatapack.getIds(ResourceLocation.WORLDGEN_STRUCTURE_TAG)) {
      try {
        const data = await this.compositeDatapack.get(ResourceLocation.WORLDGEN_STRUCTURE_TAG, id);
        const holderSet = HolderSet.fromJson(WorldgenStructure.REGISTRY, data, id);
        structureTagRegistry.register(id, holderSet);
      } catch (e) {
        console.warn(`Failed to register structure tag: ${id.toString()}`);
      }
    }

    // 注册结构集
    StructureSet.REGISTRY.clear();
    for (const id of await this.compositeDatapack.getIds(ResourceLocation.WORLDGEN_STRUCTURE_SET)) {
      try {
        const data = await this.compositeDatapack.get(ResourceLocation.WORLDGEN_STRUCTURE_SET, id);
        const structureSet = StructureSet.fromJson(data);
        StructureSet.REGISTRY.register(id, structureSet);
      } catch (e) {
        console.warn(`Failed to register structure set: ${id.toString()}`);
      }
    }

    console.log(`Registered ${WorldgenStructure.REGISTRY.keys().length} structures`);
    console.log(`Registered ${StructureSet.REGISTRY.keys().length} structure sets`);
  }

  public getCompositeDatapack(): AnonymousDatapack {
    return this.compositeDatapack;
  }
}
