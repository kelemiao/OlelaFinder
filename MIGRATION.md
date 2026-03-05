# Configuration Migration Guide

## Changes in Latest Version

The datapack configuration has been simplified and made more flexible. The hardcoded Tectonic and DNT datapacks have been removed in favor of a unified `customDatapacks` array.

## Old Configuration (Before)

```typescript
export const CONFIG = {
  seed: "877470420230587172",
  mcVersion: "1_21_7",
  dimension: "minecraft:overworld",
  worldPreset: "minecraft:normal",
  vanillaDatapackFile: "vanilla_1_21_7.zip",
  
  // Old hardcoded datapack fields
  tectonicDatapackFile: "main_tectonic-datapack-3.0.13 (1).zip",
  dntDatapackFile: "Dungeons and Taverns v4.7.3.zip",
  additionalDatapacks: [] as string[],
  
  port: process.env.PORT || 3000,
};
```

## New Configuration (After)

```typescript
export const CONFIG = {
  seed: "877470420230587172",
  mcVersion: "1_21_7",
  dimension: "minecraft:overworld",
  worldPreset: "minecraft:normal",
  vanillaDatapackFile: "vanilla_1_21_7.zip",
  
  // New unified datapack array
  customDatapacks: [
    // Add any datapacks you want here
    // "main_tectonic-datapack-3.0.13 (1).zip",
    // "Dungeons and Taverns v4.7.3.zip",
  ] as string[],
  
  port: process.env.PORT || 3000,
};
```

## Migration Steps

1. **If you were using Tectonic**: Add the filename to `customDatapacks` array
   ```typescript
   customDatapacks: ["main_tectonic-datapack-3.0.13 (1).zip"]
   ```

2. **If you were using DNT**: Add the filename to `customDatapacks` array
   ```typescript
   customDatapacks: ["Dungeons and Taverns v4.7.3.zip"]
   ```

3. **If you were using both**: Add both filenames
   ```typescript
   customDatapacks: [
     "main_tectonic-datapack-3.0.13 (1).zip",
     "Dungeons and Taverns v4.7.3.zip",
   ]
   ```

4. **If you had additional datapacks**: Move them from `additionalDatapacks` to `customDatapacks`
   ```typescript
   // Old
   additionalDatapacks: ["my_pack.zip"]
   
   // New
   customDatapacks: ["my_pack.zip"]
   ```

5. **If you want vanilla only**: Leave the array empty (default)
   ```typescript
   customDatapacks: []
   ```

## Benefits of New Configuration

- **Simpler**: One array for all custom datapacks instead of multiple fields
- **More flexible**: No hardcoded datapack assumptions
- **Cleaner**: Default configuration loads vanilla only
- **Easier to understand**: Clear separation between required (vanilla) and optional (custom) datapacks

## Need Help?

Check `src-api/config.example.ts` for a complete configuration example with comments.
