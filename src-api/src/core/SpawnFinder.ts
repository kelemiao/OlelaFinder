import { Climate, Json } from "deepslate";

export enum SpawnAlgorithm {
  LEGACY_ZERO_BIASED = "legacy",
  BEST_CLIMATE = "best",
}

export class SpawnFinder {
  constructor(
    private paramPoints: Climate.ParamPoint[],
    private algorithm: SpawnAlgorithm
  ) {}

  public static fromJson(obj: unknown, algorithm: SpawnAlgorithm): SpawnFinder {
    return new SpawnFinder(
      Json.readArray(obj, Climate.ParamPoint.fromJson) ?? [],
      algorithm
    );
  }

  /**
   * 计算出生点位置
   */
  public getSpawnPoint(climateSampler: Climate.Sampler): { x: number; z: number } {
    const self = this;
    let result: { x: number; z: number } = { x: 0, z: 0 };
    let resultFitness = getFitness(0, 0);

    radialSearch(2048, 512, 0, 0);
    radialSearch(512, 32, result.x, result.z);

    return result;

    function getFitness(x: number, z: number): number | bigint {
      const climate = climateSampler.sample(x >> 2, 0, z >> 2);
      const surfaceClimate = Climate.target(
        climate.temperature,
        climate.humidity,
        climate.continentalness,
        climate.erosion,
        0,
        climate.weirdness
      );
      const climateFitness = Math.min(
        ...self.paramPoints.map((p) => p.fittness(surfaceClimate))
      );

      switch (self.algorithm) {
        case SpawnAlgorithm.LEGACY_ZERO_BIASED:
          const distanceFitness = Math.pow((x * x + z * z) / (2500 * 2500), 2);
          return distanceFitness + climateFitness;
        case SpawnAlgorithm.BEST_CLIMATE:
          return (
            BigInt(x * x + z * z) +
            BigInt(2048 * 2048) * BigInt(Math.floor(10000 * 10000 * climateFitness))
          );
      }
    }

    function radialSearch(
      maxRadius: number,
      radiusStep: number,
      centerX: number,
      centerZ: number
    ) {
      let angle = 0;
      let radius = radiusStep;

      while (radius <= maxRadius) {
        const x = centerX + Math.floor(Math.sin(angle) * radius);
        const z = centerZ + Math.floor(Math.cos(angle) * radius);
        const fitness = getFitness(x, z);
        if (fitness < resultFitness) {
          result = { x, z };
          resultFitness = fitness;
        }

        angle += radiusStep / radius;
        if (angle > Math.PI * 2) {
          angle = 0;
          radius += radiusStep;
        }
      }
    }
  }
}
