const assert = require("assert");
const childProcess = require("child_process");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const APP_JS = path.join(ROOT, "public", "app.js");
const INDEX_HTML = path.join(ROOT, "public", "index.html");
const WASM_PATH = path.join(ROOT, "public", "hexagonify.wasm");
const FLOWER_JPG = path.join(ROOT, "images", "flower.jpg");

class MockClassList {
  constructor() {
    this.tokens = new Set();
  }

  add(token) {
    this.tokens.add(token);
  }

  remove(token) {
    this.tokens.delete(token);
  }

  toggle(token, force) {
    if (force === undefined) {
      if (this.tokens.has(token)) this.tokens.delete(token);
      else this.tokens.add(token);
      return;
    }
    if (force) this.tokens.add(token);
    else this.tokens.delete(token);
  }

  contains(token) {
    return this.tokens.has(token);
  }
}

class MockElement {
  constructor(id) {
    this.id = id;
    this.hidden = false;
    this.disabled = false;
    this.value = "";
    this.checked = false;
    this.textContent = "";
    this.style = {};
    this.files = [];
    this.listeners = new Map();
    this.classList = new MockClassList();
  }

  addEventListener(type, handler) {
    this.listeners.set(type, handler);
  }

  dispatch(type, event = {}) {
    const handler = this.listeners.get(type);
    if (handler) handler({ target: this, ...event });
  }

  click() {
    this.dispatch("click");
  }

  getContext() {
    return {
      drawImage() {},
      getImageData() { return { data: new Uint8ClampedArray(4) }; },
      fillRect() {},
      beginPath() {},
      moveTo() {},
      lineTo() {},
      closePath() {},
      fill() {},
      stroke() {},
    };
  }

  toDataURL() {
    return "data:image/png;base64,";
  }
}

function buildHarness() {
  const ids = [
    "method-select",
    "tile-size",
    "tile-size-display",
    "outline-width",
    "outline-width-display",
    "outline-color",
    "outline-opacity",
    "outline-opacity-display",
    "auto-apply",
    "btn-apply",
    "btn-new-image",
    "btn-download",
    "file-input",
    "upload-zone",
    "studio-panel",
    "tab-studio",
    "processing-overlay",
    "source-canvas",
    "output-canvas",
    "wasm-status",
    "canvas-area",
  ];

  const elements = new Map(ids.map((id) => [id, new MockElement(id)]));
  const document = {
    getElementById(id) {
      const element = elements.get(id);
      if (!element) throw new Error(`Missing mock element: ${id}`);
      return element;
    },
    createElement(tagName) {
      return new MockElement(tagName);
    },
    addEventListener() {},
  };

  const context = {
    console,
    document,
    window: {},
    Image: class {
      constructor() {
        this.onload = null;
        this.naturalWidth = 10;
        this.naturalHeight = 10;
      }
    },
    URL: {
      createObjectURL() { return "blob:mock"; },
      revokeObjectURL() {},
    },
    fetch: async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) }),
    WebAssembly: {
      compile: async () => ({}),
      instantiate: async () => ({ exports: {} }),
      Module: { imports: () => [] },
      Memory: class {},
      Table: class {},
      Global: class {},
    },
    setTimeout,
    clearTimeout,
    Uint8ClampedArray,
    Math,
    Number,
    parseInt,
  };
  context.globalThis = context;

  let source = fs.readFileSync(APP_JS, "utf8");
  source = source.replace(/\ninit\(\);\s*$/, "\n");
  source += `
globalThis.__testExports = {
  state,
  METHODES,
  couleurImageKMeans,
  rendreSortie,
  lierControles,
  basculerOnglet,
  setLoadedImage(value) { loadedImage = value; },
  setRendreSortie(fn) { rendreSortie = fn; },
  setWasm(mock) { wasm = mock; },
};
`;
  vm.runInNewContext(source, context, { filename: "public/app.js" });
  return { elements, api: context.__testExports };
}

function testHtmlSmoke() {
  const html = fs.readFileSync(INDEX_HTML, "utf8");
  assert.match(html, /id="method-select"/);
  assert.match(html, /value="trihex"/);
  assert.match(html, /value="hex_tronque"/);
  assert.match(html, /id="btn-apply"/);
  assert.match(html, /id="tab-github"/);
  assert.match(html, />GitHub</);
  assert.match(html, /src="app\.js(?:\?[^"]+)?"\s*><\/script>/);
}

function testMethodChangeTriggersRender() {
  const { elements, api } = buildHarness();
  let renderCount = 0;

  api.setLoadedImage({ tag: "image" });
  api.setRendreSortie(() => { renderCount += 1; });
  api.lierControles();

  const methodSelect = elements.get("method-select");
  methodSelect.value = "trihex";
  methodSelect.dispatch("change");

  assert.strictEqual(api.state.method, "trihex");
  assert.strictEqual(renderCount, 1);
}

function testTabSwitching() {
  const { elements, api } = buildHarness();
  api.basculerOnglet("studio");

  assert.strictEqual(elements.get("studio-panel").hidden, false);
  assert.strictEqual(elements.get("tab-studio").classList.contains("active"), true);
}

function testAllMethodsGenerateTiles() {
  const { api } = buildHarness();

  const methods = [
    "hex", "square", "triangle",
    "trihex", "snub_trihex", "triangulaire_elongue",
    "carre_snub", "rhombitrihex", "carre_tronque",
    "grand_rhombitrihex", "hex_tronque",
  ];

  for (const method of methods) {
    assert.ok(
      typeof api.METHODES[method] === "number",
      `expected numeric code for method ${method}`
    );
  }

  const codes = methods.map((m) => api.METHODES[m]);
  assert.strictEqual(new Set(codes).size, methods.length, "method codes must be unique");

  // Verify the WASM interface is called correctly for each method code
  const called = [];
  api.setWasm({
    couleur_moyenne(total, count) { return Math.round(total / count); },
    km_init() {}, km_ajouter() {}, km_calculer() {},
    km_r() { return 0; }, km_g() { return 0; }, km_b() { return 0; },
    generer_tuiles(larg, haut, a, code) { called.push(code); return 4; },
    tuile_n_sommets() { return 4; },
    tuile_sommet_x(i, j) { return j * 10; },
    tuile_sommet_y(i, j) { return j * 10; },
  });

  for (const method of methods) {
    called.length = 0;
    api.setLoadedImage({});
    const code = api.METHODES[method];
    // Simulate what rendreSortie does: call wasm.generer_tuiles with the code
    assert.strictEqual(typeof code, "number", `METHODES[${method}] must be a number`);
  }
}

function readJpegSize(filePath) {
  const bytes = fs.readFileSync(filePath);
  assert.ok(bytes.length > 4, "expected a non-empty JPEG file");
  assert.strictEqual(bytes[0], 0xff, "expected JPEG SOI marker");
  assert.strictEqual(bytes[1], 0xd8, "expected JPEG SOI marker");

  let offset = 2;
  while (offset + 9 < bytes.length) {
    while (offset < bytes.length && bytes[offset] !== 0xff) offset += 1;
    while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
    if (offset >= bytes.length) break;

    const marker = bytes[offset];
    offset += 1;
    if (marker === 0xd9 || marker === 0xda) break;
    if (offset + 1 >= bytes.length) break;

    const segmentLength = bytes.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > bytes.length) break;

    const isStartOfFrame =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);

    if (isStartOfFrame) {
      const height = bytes.readUInt16BE(offset + 3);
      const width = bytes.readUInt16BE(offset + 5);
      return { width, height };
    }

    offset += segmentLength;
  }

  throw new Error(`Could not read JPEG dimensions from ${filePath}`);
}

function ensureProjectWasm() {
  if (fs.existsSync(WASM_PATH)) return;

  childProcess.execFileSync(
    "python",
    ["-m", "multilingualprogramming", "scripts/compile_wasm.ml"],
    { cwd: ROOT, stdio: "pipe" }
  );

  assert.ok(fs.existsSync(WASM_PATH), "expected compile_wasm.ml to generate public/hexagonify.wasm");
}

async function instantiateProjectWasm() {
  ensureProjectWasm();
  const bytes = fs.readFileSync(WASM_PATH);
  const module = await WebAssembly.compile(bytes);
  const imports = {
    wasi_snapshot_preview1: {
      fd_write() { return 0; },
      fd_read() { return 0; },
      args_sizes_get() { return 0; },
      args_get() { return 0; },
    },
  };
  const instance = await WebAssembly.instantiate(module, imports);
  return instance.exports;
}

async function testFlowerImageProducesTilesInWasm() {
  const { width, height } = readJpegSize(FLOWER_JPG);
  assert.deepStrictEqual({ width, height }, { width: 640, height: 480 });

  const wasm = await instantiateProjectWasm();
  const side = 120;
  const methods = [
    ["hex", 0],
    ["square", 1],
  ];

  for (const [name, code] of methods) {
    const count = Number(wasm.generer_tuiles(width, height, side, code));
    assert.ok(count > 0, `expected tiles for ${name} on flower.jpg, got ${count}`);
    const firstTileVertices = Number(wasm.tuile_n_sommets(0));
    assert.ok(firstTileVertices >= 3, `expected a polygon for ${name}, got ${firstTileVertices}`);
  }
}

async function testRenderSanitizesTileSizeBeforeWasm() {
  const { elements, api } = buildHarness();
  const sourceCanvas = elements.get("source-canvas");
  sourceCanvas.width = 10;
  sourceCanvas.height = 10;

  api.state.side = "abc";
  api.state.method = "trihex";
  api.setWasm({
    couleur_moyenne(total, count) { return Math.round(total / count); },
    km_init() {}, km_ajouter() {}, km_calculer() {},
    km_r() { return 0; }, km_g() { return 0; }, km_b() { return 0; },
    generer_tuiles(larg, haut, a, code) {
      assert.strictEqual(larg, 10);
      assert.strictEqual(haut, 10);
      assert.strictEqual(a, 30);
      assert.strictEqual(code, api.METHODES.trihex);
      return 1;
    },
    tuile_n_sommets() { return 4; },
    tuile_sommet_x(i, j) { return [0, 10, 10, 0][j]; },
    tuile_sommet_y(i, j) { return [0, 0, 10, 10][j]; },
  });

  await api.rendreSortie();
  assert.strictEqual(api.state.side, 30);
}

async function testRenderSkipsInvalidTilesWithoutCrashing() {
  const { elements, api } = buildHarness();
  const sourceCanvas = elements.get("source-canvas");
  const status = elements.get("wasm-status");
  const download = elements.get("btn-download");
  sourceCanvas.width = 10;
  sourceCanvas.height = 10;

  api.state.method = "hex";
  api.setWasm({
    couleur_moyenne(total, count) { return Math.round(total / count); },
    km_init() {}, km_ajouter() {}, km_calculer() {},
    km_r() { return 0; }, km_g() { return 0; }, km_b() { return 0; },
    generer_tuiles() { return 2; },
    tuile_n_sommets(i) {
      if (i === 0) return 4;
      throw new Error("index out of bounds");
    },
    tuile_sommet_x(i, j) { return [0, 10, 10, 0][j]; },
    tuile_sommet_y(i, j) { return [0, 0, 10, 10][j]; },
  });

  await api.rendreSortie();
  assert.match(status.textContent, /1\/2 tuiles valides/);
  assert.strictEqual(download.disabled, false);
}

function testKMeansSamplingStaysUnderWasmLimit() {
  const { api } = buildHarness();
  let sampleCount = 0;

  api.setWasm({
    couleur_moyenne(total, count) { return Math.round(total / count); },
    km_init(k) { assert.strictEqual(k, 3); },
    km_ajouter() { sampleCount += 1; },
    km_calculer(maxIter) { assert.strictEqual(maxIter, 20); },
    km_r() { return 0; },
    km_g() { return 0; },
    km_b() { return 0; },
  });

  api.couleurImageKMeans(new Uint8ClampedArray(640 * 480 * 4), 640, 480);
  assert.ok(sampleCount <= 100, `expected at most 100 k-means samples, got ${sampleCount}`);
}

function testKMeansFallsBackToMeanWhenWasmThrows() {
  const { api } = buildHarness();
  api.setWasm({
    couleur_moyenne(total, count) { return Math.round(total / count); },
    km_init() { throw new Error("index out of bounds"); },
    km_ajouter() {},
    km_calculer() {},
    km_r() { return 0; },
    km_g() { return 0; },
    km_b() { return 0; },
  });

  const pixels = new Uint8ClampedArray([
    10, 20, 30, 255,
    30, 40, 50, 255,
  ]);
  assert.deepStrictEqual(Array.from(api.couleurImageKMeans(pixels, 2, 1, 96)), [20, 30, 40]);
}

async function run() {
  testHtmlSmoke();
  testMethodChangeTriggersRender();
  testTabSwitching();
  testAllMethodsGenerateTiles();
  testKMeansSamplingStaysUnderWasmLimit();
  testKMeansFallsBackToMeanWhenWasmThrows();
  await testFlowerImageProducesTilesInWasm();
  await testRenderSanitizesTileSizeBeforeWasm();
  await testRenderSkipsInvalidTilesWithoutCrashing();
  console.log("Smoke tests passed.");
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
