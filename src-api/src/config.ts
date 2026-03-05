import path from "path";

// 当从 src-api 目录运行时，cwd 是 src-api，需要向上一级
const srcApiRoot = process.cwd();
const projectRoot = path.resolve(srcApiRoot, "..");

/**
 * Kelebot Gen2 Finder 固定配置
 */
export const CONFIG = {
  // 世界种子
  seed: "877470420230587172",

  // Minecraft 版本
  mcVersion: "1_21_7",

  // 维度
  dimension: "minecraft:overworld",

  // 世界预设
  worldPreset: "minecraft:normal",

  // 原版数据包文件名
  vanillaDatapackFile: "vanilla_1_21_7.zip",

  // Tectonic 数据包文件名
  tectonicDatapackFile: "main_tectonic-datapack-3.0.13 (1).zip",

  // DNT (Dungeons and Taverns) 数据包文件名
  // 设置为空字符串则不加载
  dntDatapackFile: "Dungeons and Taverns v4.7.3.zip",

  // 额外数据包列表（可选，用于加载更多数据包）
  additionalDatapacks: [] as string[],

  // 原版数据包目录
  vanillaDatapackDir: path.join(projectRoot, "public", "vanilla_datapacks"),

  // Tectonic 数据包目录
  tectonicDatapackDir: projectRoot,

  // 服务器端口
  port: process.env.PORT || 3000,
};
