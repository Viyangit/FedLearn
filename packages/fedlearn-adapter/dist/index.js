import { Buffer } from "node:buffer";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { JsAdapter } = require("../native.cjs");
const DEFAULTS = {
    dModel: 512,
    numLayers: 8,
    rank: 4,
    alpha: 4.0,
    ewcLambda: 400.0,
    learningRate: 0.001,
};
function mergeConfig(c = {}) {
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
    js;
    cfg;
    constructor(config = {}) {
        this.cfg = mergeConfig(config);
        this.js = new JsAdapter(this.cfg.dModel, this.cfg.numLayers, this.cfg.rank, this.cfg.alpha, this.cfg.ewcLambda, this.cfg.learningRate);
    }
    static fromJs(js, cfg) {
        const a = Object.create(FedLearnAdapter.prototype);
        a.js = js;
        a.cfg = cfg;
        return a;
    }
    async learnTurn(input, target) {
        const inf = input instanceof Float32Array ? Array.from(input) : [...input];
        const tf = target instanceof Float32Array ? Array.from(target) : [...target];
        const loss = this.js.learnTurn(inf, tf);
        return { loss, turnCount: this.js.turnCount };
    }
    consolidate() {
        this.js.consolidate();
    }
    forward(input, layer) {
        const inf = input instanceof Float32Array ? Array.from(input) : [...input];
        const out = this.js.forward(inf, layer);
        return Float32Array.from(out);
    }
    serialize() {
        const bytes = this.js.toBytes();
        return Buffer.from(Uint8Array.from(bytes));
    }
    static deserialize(bytes, config = {}) {
        const lr = config.learningRate ?? DEFAULTS.learningRate;
        const js = JsAdapter.fromBytes(Array.from(new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength)), lr);
        const cfg = mergeConfig({
            dModel: js.dModel,
            numLayers: js.numLayers,
            learningRate: lr,
        });
        return FedLearnAdapter.fromJs(js, cfg);
    }
    get turnCount() {
        return this.js.turnCount;
    }
    get layerCount() {
        return this.js.numLayers;
    }
    get dModel() {
        return this.js.dModel;
    }
}
