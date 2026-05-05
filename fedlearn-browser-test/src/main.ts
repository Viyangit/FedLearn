import "./style.css";
import {
  initWasm,
  wasmHealthCheck,
  openAdapterDb,
  saveAdapterRecord,
  loadAdapterRecord
} from "fedlearn-core";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <h1>FedLearn Browser Test</h1>
  <p>Check the browser console for API outputs.</p>
  <pre id="output"></pre>
`;

async function run() {
  const output = document.querySelector<HTMLPreElement>("#output");
  const logs: string[] = [];
  const log = (line: string) => {
    logs.push(line);
    if (output) output.textContent = logs.join("\n");
    console.log(line);
  };

  try {
    await initWasm({ wasmUrl: "/fedlearn_wasm_bg.wasm" });
    log("initWasm: success");
  } catch (error) {
    log(`initWasm: failed (${String(error)})`);
  }

  log(`wasmHealthCheck: ${JSON.stringify(wasmHealthCheck())}`);

  const db = await openAdapterDb();
  log(`openAdapterDb: opened (${db.name})`);

  const testRecord = {
    userId: "browser-test-user",
    rank: 4,
    layers: [{ layerIdx: 0, a: [0.1, 0.2], b: [0.3, 0.4] }],
    budgetState: {
      totalEpsilon: 1.0,
      consumedEpsilon: 0.1,
      roundCount: 1,
      hmac: "test-hmac"
    },
    sessionCount: 1,
    lastUpdated: Date.now(),
    version: 1
  };

  await saveAdapterRecord(testRecord);
  log("saveAdapterRecord: success");
  const loaded = await loadAdapterRecord("browser-test-user");
  log(`loadAdapterRecord: ${JSON.stringify(loaded)}`);
}

run().catch((error) => {
  console.error("Browser test failed", error);
});
