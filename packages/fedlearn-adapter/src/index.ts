import { Buffer } from "node:buffer";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { JsAdapter } = require("../native.cjs") as {
  JsAdapter: {
    new (
      dModel: number,
      numLayers: number,
      rank: number,
      alpha: number,
      ewcLambda: number,
      lr: number
    ): JsAdapterInstance;
    fromBytes(bytes: number[], lr: number): JsAdapterInstance;
  };
};

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

const DEFAULTS: Required<AdapterConfig> = {
  dModel: 512,
  numLayers: 8,
  rank: 4,
  alpha: 4.0,
  ewcLambda: 400.0,
  learningRate: 0.001,
};

function mergeConfig(c: AdapterConfig = {}): Required<AdapterConfig> {
  return {
    dModel: c.dModel ?? DEFAULTS.dModel,
    numLayers: c.numLayers ?? DEFAULTS.numLayers,
    rank: c.rank ?? DEFAULTS.rank,
    alpha: c.alpha ?? DEFAULTS.alpha,
    ewcLambda: c.ewcLambda ?? DEFAULTS.ewcLambda,
    learningRate: c.learningRate ?? DEFAULTS.learningRate,
  };
}

export class FedLearnAdapter {
  private js: JsAdapterInstance;
  private cfg: Required<AdapterConfig>;

  constructor(config: AdapterConfig = {}) {
    this.cfg = mergeConfig(config);
    this.js = new JsAdapter(
      this.cfg.dModel,
      this.cfg.numLayers,
      this.cfg.rank,
      this.cfg.alpha,
      this.cfg.ewcLambda,
      this.cfg.learningRate
    );
  }

  private static fromJs(js: JsAdapterInstance, cfg: Required<AdapterConfig>): FedLearnAdapter {
    const a = Object.create(FedLearnAdapter.prototype) as FedLearnAdapter;
    a.js = js;
    a.cfg = cfg;
    return a;
  }

  async learnTurn(
    input: Float32Array | number[],
    target: Float32Array | number[]
  ): Promise<LearnResult> {
    const inf = input instanceof Float32Array ? Array.from(input) : [...input];
    const tf = target instanceof Float32Array ? Array.from(target) : [...target];
    const loss = this.js.learnTurn(inf, tf);
    return { loss, turnCount: this.js.turnCount };
  }

  consolidate(): void {
    this.js.consolidate();
  }

  forward(input: Float32Array | number[], layer: number): Float32Array {
    const inf = input instanceof Float32Array ? Array.from(input) : [...input];
    const out = this.js.forward(inf, layer);
    return Float32Array.from(out);
  }

  serialize(): Buffer {
    const bytes = this.js.toBytes() as unknown as number[];
    return Buffer.from(Uint8Array.from(bytes));
  }

  static deserialize(
    bytes: Buffer,
    config: Pick<AdapterConfig, "learningRate"> = {}
  ): FedLearnAdapter {
    const lr = config.learningRate ?? DEFAULTS.learningRate;
    const js = JsAdapter.fromBytes(
      Array.from(new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength)),
      lr
    );
    const cfg = mergeConfig({
      dModel: js.dModel,
      numLayers: js.numLayers,
      learningRate: lr,
    });
    return FedLearnAdapter.fromJs(js, cfg);
  }

  get turnCount(): number {
    return this.js.turnCount;
  }

  get layerCount(): number {
    return this.js.numLayers;
  }

  get dModel(): number {
    return this.js.dModel;
  }
}

