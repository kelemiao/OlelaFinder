import path from "path";

const srcApiRoot = process.cwd();
const projectRoot = path.resolve(srcApiRoot, "..");

/**
 * Kelebot Gen2 Finder Configuration Example
 * 
 * Copy this file to config.ts and modify as needed.
 */
export const CONFIG = {
  // World seed - Change this to use a different world
  seed: "877470420230587172",

  // Minecraft version (use underscores instead of dots)
  mcVersion: "1_21_7",

  // Dimension: "minecraft:overworld", "minecraft:the_nether", "minecraft:the_end"
  dimension: "minecraft:overworld",

  // World preset: "minecraft:normal", "minecraft:flat", "minecraft:large_biomes", etc.
  worldPreset: "minecraft:normal",

  // Vanilla datapack filename (required, must be in public/vanilla_datapacks/)
  vanillaDatapackFile: "vanilla_1_21_7.zip",

  // Custom datapacks to load (optional)
  // Place your datapack ZIP files in the project root directory
  // Then add their filenames to this array
  customDatapacks: [
    // Example configurations:
    
    // Tectonic - Overhauled world generation
    // "main_tectonic-datapack-3.0.13 (1).zip",
    
    // Dungeons and Taverns - Additional structures
    // "Dungeons and Taverns v4.7.3.zip",
    
    // Your custom datapacks
    // "my_custom_datapack.zip",
  ] as string[],

  // Vanilla datapack directory (don't change unless you know what you're doing)
  vanillaDatapackDir: path.join(projectRoot, "public", "vanilla_datapacks"),

  // Custom datapacks directory (don't change unless you know what you're doing)
  customDatapacksDir: projectRoot,

  // Server port
  port: process.env.PORT || 3000,
};
