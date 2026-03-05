import { Identifier, WorldgenRegistries } from "deepslate";

/**
 * 解析种子字符串
 */
export function parseSeed(input: string): bigint {
  const MAX_LONG = BigInt("0x8000000000000000");

  if (/^[+-]?\d+$/.test(input)) {
    const value = BigInt(input);
    if (value >= -MAX_LONG && value < MAX_LONG) {
      return value;
    }
  }

  // Java String.hashCode() 实现
  let hash = 0;
  if (input.length === 0) return BigInt(0);
  for (let i = 0; i < input.length; i++) {
    const chr = input.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return BigInt(hash);
}

/**
 * 计算字符串哈希
 */
export function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0, len = str.length; i < len; i++) {
    const chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return hash;
}

/**
 * 计算山体阴影
 */
export function calculateHillshade(
  slopeX: number,
  slopeZ: number,
  scale: number
): number {
  const zenith = (20.0 * Math.PI) / 180.0;
  const azimuth = (135.0 * Math.PI) / 180.0;

  const slope = Math.atan(
    Math.sqrt(slopeX * slopeX + slopeZ * slopeZ) / (8 * scale)
  );

  let aspect: number;
  if (slopeX === 0.0) {
    aspect = slopeZ < 0.0 ? Math.PI : 0.0;
  } else {
    aspect = Math.atan2(slopeZ, -slopeX);
  }

  let hillshade =
    Math.cos(zenith) * Math.cos(slope) +
    Math.sin(zenith) * Math.sin(slope) * Math.cos(azimuth - aspect);

  if (hillshade < 0.0) hillshade = 0.0;
  hillshade = hillshade * 0.7 + 0.3;

  return hillshade;
}

/**
 * 获取自定义密度函数 ID
 */
export function getCustomDensityFunction(
  name: string,
  noiseSettingsId: Identifier,
  dimensionId: Identifier
): Identifier | undefined {
  function idIfExists(id: Identifier): Identifier | undefined {
    if (WorldgenRegistries.DENSITY_FUNCTION.has(id)) return id;
    return undefined;
  }

  function getDimensionDensityFunction(
    name: string,
    noiseSettingsId: Identifier,
    dimensionId: Identifier
  ): Identifier {
    const dimensionName = dimensionId.path.split("/").reverse()[0];
    const noiseSettingsPath = noiseSettingsId.path.split("/");
    noiseSettingsPath[noiseSettingsPath.length - 1] =
      `${dimensionName}_${noiseSettingsPath[noiseSettingsPath.length - 1]}`;
    return new Identifier(
      noiseSettingsId.namespace,
      noiseSettingsPath.join("/") + "/" + name
    );
  }

  return (
    idIfExists(
      new Identifier(noiseSettingsId.namespace, noiseSettingsId.path + "/" + name)
    ) ??
    idIfExists(getDimensionDensityFunction(name, noiseSettingsId, dimensionId)) ??
    idIfExists(new Identifier(noiseSettingsId.namespace, name)) ??
    idIfExists(new Identifier("minecraft", name))
  );
}

/**
 * 生成生物群系颜色
 */
export function getBiomeColor(biomeId: string): { r: number; g: number; b: number } {
  const hash = hashCode(biomeId);
  return {
    r: (hash & 0xff0000) >> 16,
    g: (hash & 0x00ff00) >> 8,
    b: hash & 0x0000ff,
  };
}
