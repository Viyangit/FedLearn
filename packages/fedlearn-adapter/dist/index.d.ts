/// <reference types="node" resolution-mode="require"/>
/// <reference types="node" resolution-mode="require"/>
import { Buffer } from "node:buffer";
/** Native binding class (napi-rs). */
export type JsAdapterInstance = {
    learnTurn(input: number[], target: number[]): number;
    consolidate(): void;
    forward(input: number[], layer: number): number[];
    readonly turnCount: number;
    toBytes(): number[];
    readonly numLayers: number;
    readonly dModel: number;
};
export interface AdapterConfig {
    dModel?: number;
    numLayers?: number;
    rank?: number;
    alpha?: number;
    ewcLambda?: number;
    learningRate?: number;
}
export interface LearnResult {
    loss: number;
    turnCount: number;
}
export declare class FedLearnAdapter {
    private js;
    private cfg;
    constructor(config?: AdapterConfig);
    private static fromJs;
    learnTurn(input: Float32Array | number[], target: Float32Array | number[]): Promise<LearnResult>;
    consolidate(): void;
    forward(input: Float32Array | number[], layer: number): Float32Array;
    serialize(): Buffer;
    static deserialize(bytes: Buffer, config?: Pick<AdapterConfig, "learningRate">): FedLearnAdapter;
    get turnCount(): number;
    get layerCount(): number;
    get dModel(): number;
}
