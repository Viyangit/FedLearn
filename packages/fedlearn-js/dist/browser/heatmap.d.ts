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
export declare function buildHeatMapModel(values: number[][]): HeatMapModel;
export declare function normalizeIntensity(model: HeatMapModel): HeatMapModel;
