import path from "path";

// 当从 src-api 目录运行时，cwd 是 src-api，需要向上一级
const srcApiRoot = process.cwd();
const projectRoot = path.resolve(srcApiRoot, "..");

/**
 * OlelaFinder Configuration
 */
export const CONFIG = {
  // World seed
  seed: "877470420230587172",

  // Minecraft version
  mcVersion: "1_21_7",

  // Dimension
  dimension: "minecraft:overworld",

  // World preset
  worldPreset: "minecraft:normal",

  // Vanilla datapack filename (required)
  vanillaDatapackFile: "vanilla_1_21_7.zip",

  // Custom datapacks to load (optional)
  // Add any datapack ZIP files you want to load here
  // Example: ["Tectonic-3.0.13.zip", "Dungeons and Taverns v4.7.3.zip", "custom_pack.zip"]
  customDatapacks: [] as string[],

  // Vanilla datapack directory
  vanillaDatapackDir: path.join(projectRoot, "public", "vanilla_datapacks"),

  // Custom datapacks directory (where your custom datapack ZIP files are stored)
  customDatapacksDir: projectRoot,

  // Server port
  port: process.env.PORT || 3000,
};
