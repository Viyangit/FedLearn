export interface HeatCell {
  layer: number;
  head: number;
  intensity: number;
}

export interface HeatMapModel {
  layers: number;
  heads: number;
  cells: HeatCell[];
}

export function buildHeatMapModel(values: number[][]): HeatMapModel {
  const layers = values.length;
  const heads = layers > 0 ? values[0].length : 0;
  const cells: HeatCell[] = [];

  for (let l = 0; l < layers; l++) {
    for (let h = 0; h < heads; h++) {
      cells.push({
        layer: l,
        head: h,
        intensity: values[l][h] ?? 0
      });
    }
  }

  return { layers, heads, cells };
}

export function normalizeIntensity(model: HeatMapModel): HeatMapModel {
  const max = model.cells.reduce((m, c) => Math.max(m, c.intensity), 0);
  if (max <= 0) {
    return model;
  }
  return {
    ...model,
    cells: model.cells.map((c) => ({ ...c, intensity: c.intensity / max }))
  };
}

