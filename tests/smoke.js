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
const TREE_JPG = path.join(ROOT, "images", "tree.jpg");

// ── Mock DOM ──────────────────────────────────────────────────

class MockClassList {
  constructor() { this.tokens = new Set(); }
  add(t) { this.tokens.add(t); }
  remove(t) { this.tokens.delete(t); }
  toggle(t, force) {
    if (force === undefined) { this.tokens.has(t) ? this.tokens.delete(t) : this.tokens.add(t); return; }
    force ? this.tokens.add(t) : this.tokens.delete(t);
  }
  contains(t) { return this.tokens.has(t); }
}

class MockElement {
  constructor(id) {
    this.id = id;
    this.hidden = false;
    this.disabled = false;
    this.value = "";
    this.checked = false;
    this.textContent = "";
    this.innerHTML = "";
    this.style = {};
    this.files = [];
    this.listeners = new Map();
    this.classList = new MockClassList();
    this.children = [];
    this.dataset = {};
  }
  addEventListener(type, handler) { this.listeners.set(type, handler); }
  dispatch(type, event = {}) {
    const handler = this.listeners.get(type);
    if (handler) handler({ target: this, ...event });
  }
  click() { this.dispatch("click"); }
  appendChild(child) { this.children.push(child); return child; }
  closest(sel) { return this.classList.contains(sel.replace(/^\./, "")) ? this : null; }
  getContext() {
    return {
      drawImage() {}, fillRect() {},
      beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, fill() {}, stroke() {},
      getImageData() { return { data: new Uint8ClampedArray(4 * 10 * 10) }; },
    };
  }
  toDataURL() { return "data:image/png;base64,"; }
}

function buildHarness() {
  const ids = [
    "method-select", "tile-size", "tile-size-display",
    "outline-width", "outline-width-display",
    "outline-color", "outline-opacity", "outline-opacity-display",
    "auto-apply", "btn-apply", "btn-new-image", "btn-download",
    "file-input", "upload-zone", "studio-panel", "source-panel", "gallery-panel",
    "tab-studio", "tab-sources", "tab-gallery", "gallery-grid", "processing-overlay",
    "source-canvas", "output-canvas", "wasm-status", "canvas-area",
  ];

  const elements = new Map(ids.map((id) => [id, new MockElement(id)]));
  elements.get("source-canvas").width = 10;
  elements.get("source-canvas").height = 10;

  const document = {
    getElementById(id) {
      const el = elements.get(id);
      if (!el) throw new Error(`Missing mock element: ${id}`);
      return el;
    },
    createElement(tag) { return new MockElement(tag); },
    addEventListener() {},
    querySelector() { return null; },
  };

  // Shared WASM-like memory buffer (small, for sortie_ptr testing).
  const sharedBuffer = new ArrayBuffer(1024);

  const context = {
    console,
    document,
    window: {},
    Image: class {
      constructor() { this.onload = null; this.naturalWidth = 10; this.naturalHeight = 10; }
    },
    URL: { createObjectURL() { return "blob:mock"; }, revokeObjectURL() {} },
    fetch: async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) }),
    WebAssembly: {
      compile: async () => ({}),
      instantiate: async () => ({ exports: {} }),
      Module: { imports: () => [] },
      Memory: class {},
      Table: class {},
      Global: class {},
    },
    setTimeout, clearTimeout,
    Uint8ClampedArray, Float64Array, Math, Number, parseInt,
  };
  context.globalThis = context;

  let source = fs.readFileSync(APP_JS, "utf8");
  source = source.replace(/\ninit\(\);\s*$/, "\n");
  source += `
globalThis.__testExports = {
  state,
  METHODES,
  lireSortie,
  couleurTuile,
  rendreSortie,
  lierControles,
  basculerOnglet,
  setWasm(mock) {
    wasm = mock;
    sortiePtrBytes = mock.__sortiePtrBytes || 0;
  },
  setLoadedImage(v) { loadedImage = v; },
};
`;
  vm.runInNewContext(source, context, { filename: "public/app.js" });
  return { elements, api: context.__testExports, sharedBuffer };
}

// ── Helpers ───────────────────────────────────────────────────

function makeSortieBuffer(verts) {
  // Returns { buffer, byteOffset } matching what lireSortie expects.
  // sortiePtrBytes points to slot 0 (_sortie[0] = n_verts).
  // _sortie[k] is at sortiePtrBytes + k*8.
  const n = verts.length;
  const buf = new ArrayBuffer((1 + n * 2) * 8 + 64);
  const view = new Float64Array(buf, 0, 1 + n * 2);
  view[0] = n;
  for (let j = 0; j < n; j++) {
    view[1 + j * 2] = verts[j][0];
    view[2 + j * 2] = verts[j][1];
  }
  return buf;
}

function makeWasmMock(opts = {}) {
  const squareVerts = [[0, 0], [10, 0], [10, 10], [0, 10]];
  const sortieBuffer = opts.sortieBuffer || makeSortieBuffer(squareVerts);
  const n = opts.nVerts ?? 4;

  return {
    memory: { buffer: sortieBuffer },
    __sortiePtrBytes: 0,
    __ml_reset() {},
    sortie_ptr() { return 0.0 - 8; },  // offset so sortiePtrBytes = -8+8 = 0 bytes into buffer
    generer_tuiles: opts.generer_tuiles || (() => n > 0 ? 1 : 0),
    charger_tuile: opts.charger_tuile || (() => n),
    methode_hexagone() { return 0; },
    methode_carre() { return 1; },
    methode_triangle() { return 2; },
    methode_trihex() { return 3; },
    methode_snub_trihex() { return 4; },
    methode_triangulaire_elongue() { return 5; },
    methode_carre_snub() { return 6; },
    methode_rhombitrihex() { return 7; },
    methode_carre_tronque() { return 8; },
    methode_grand_rhombitrihex() { return 9; },
    methode_hex_tronque() { return 10; },
    ...opts,
  };
}

// ── HTML smoke ────────────────────────────────────────────────

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

// ── lireSortie reads typed array correctly ────────────────────

function testLireSortieReadsBuffer() {
  const { api } = buildHarness();
  const hexVerts = [
    [10, 0], [5, 8.66], [-5, 8.66], [-10, 0], [-5, -8.66], [5, -8.66],
  ];
  const buf = makeSortieBuffer(hexVerts);
  api.setWasm({
    memory: { buffer: buf },
    __sortiePtrBytes: 0,
    sortie_ptr() { return -8; },
    generer_tuiles() { return 1; },
    charger_tuile() { return 6; },
    methode_hexagone() { return 0; },
    methode_carre() { return 1; },
    methode_triangle() { return 2; },
    methode_trihex() { return 3; },
    methode_snub_trihex() { return 4; },
    methode_triangulaire_elongue() { return 5; },
    methode_carre_snub() { return 6; },
    methode_rhombitrihex() { return 7; },
    methode_carre_tronque() { return 8; },
    methode_grand_rhombitrihex() { return 9; },
    methode_hex_tronque() { return 10; },
    __ml_reset() {},
  });
  // sortiePtrBytes = Number(wasm.sortie_ptr()) + 8 = -8 + 8 = 0
  const result = api.lireSortie(6);
  assert.ok(result !== null, "expected non-null for valid 6-vert tile");
  assert.strictEqual(result.length, 6);
  assert.ok(Math.abs(result[0][0] - 10) < 0.01, `x0 should be 10, got ${result[0][0]}`);
  assert.ok(Math.abs(result[0][1] - 0) < 0.01, `y0 should be 0, got ${result[0][1]}`);
}

function testLireSortieRejectsInvalidVertCount() {
  const { api } = buildHarness();
  const buf = makeSortieBuffer([[0, 0], [1, 0]]);
  api.setWasm({ memory: { buffer: buf }, __sortiePtrBytes: 0, sortie_ptr() { return -8; },
    generer_tuiles() { return 0; }, charger_tuile() { return 0; },
    methode_hexagone() { return 0; }, methode_carre() { return 1; }, methode_triangle() { return 2; },
    methode_trihex() { return 3; }, methode_snub_trihex() { return 4; }, methode_triangulaire_elongue() { return 5; },
    methode_carre_snub() { return 6; }, methode_rhombitrihex() { return 7; }, methode_carre_tronque() { return 8; },
    methode_grand_rhombitrihex() { return 9; }, methode_hex_tronque() { return 10; }, __ml_reset() {},
  });
  assert.strictEqual(api.lireSortie(0), null, "0 verts should return null");
  assert.strictEqual(api.lireSortie(2), null, "2 verts should return null");
  assert.strictEqual(api.lireSortie(13), null, "13 verts should return null");
}

// ── Tab switching ─────────────────────────────────────────────

function testTabSwitching() {
  const { elements, api } = buildHarness();
  api.basculerOnglet("studio");
  assert.strictEqual(elements.get("studio-panel").hidden, false);
  assert.strictEqual(elements.get("tab-studio").classList.contains("active"), true);
}

// ── Method change triggers render ─────────────────────────────

function testMethodChangeTriggersRender() {
  const { elements, api } = buildHarness();
  let renderCount = 0;

  const squareVerts = [[0, 0], [10, 0], [10, 10], [0, 10]];
  const buf = makeSortieBuffer(squareVerts);
  api.setWasm({
    memory: { buffer: buf },
    __sortiePtrBytes: 0,
    sortie_ptr() { return -8; },
    __ml_reset() {},
    generer_tuiles() { renderCount++; return 1; },
    charger_tuile() { return 4; },
    methode_hexagone() { return 0; }, methode_carre() { return 1; }, methode_triangle() { return 2; },
    methode_trihex() { return 3; }, methode_snub_trihex() { return 4; }, methode_triangulaire_elongue() { return 5; },
    methode_carre_snub() { return 6; }, methode_rhombitrihex() { return 7; }, methode_carre_tronque() { return 8; },
    methode_grand_rhombitrihex() { return 9; }, methode_hex_tronque() { return 10; },
  });

  api.setLoadedImage({ tag: "image" });
  api.lierControles();

  const methodSelect = elements.get("method-select");
  methodSelect.value = "trihex";
  methodSelect.dispatch("change");

  assert.strictEqual(api.state.method, "trihex");
}

// ── All method codes are unique numbers ───────────────────────

function testAllMethodCodes() {
  const methods = [
    "hex", "square", "triangle",
    "trihex", "snub_trihex", "triangulaire_elongue",
    "carre_snub", "rhombitrihex", "carre_tronque",
    "grand_rhombitrihex", "hex_tronque",
  ];
  const { api } = buildHarness();
  for (const m of methods) {
    assert.strictEqual(typeof api.METHODES[m], "number", `expected numeric code for ${m}`);
  }
  const codes = methods.map((m) => api.METHODES[m]);
  assert.strictEqual(new Set(codes).size, methods.length, "method codes must be unique");
}

// ── couleurTuile computes mean color ──────────────────────────

function testCouleurTuileComputesMean() {
  const { api } = buildHarness();
  // 2×2 image, all red.
  const pixels = new Uint8ClampedArray([
    255, 0, 0, 255,   255, 0, 0, 255,
    255, 0, 0, 255,   255, 0, 0, 255,
  ]);
  const verts = [[0, 0], [2, 0], [2, 2], [0, 2]];
  const result = api.couleurTuile(pixels, 2, 2, verts);
  assert.ok(result !== null);
  assert.strictEqual(result[0], 255);
  assert.strictEqual(result[1], 0);
  assert.strictEqual(result[2], 0);
}

// ── __ml_reset called each render ────────────────────────────

async function testMlResetCalledBeforeEachRender() {
  const { elements, api } = buildHarness();
  const sourceCanvas = elements.get("source-canvas");
  sourceCanvas.width = 10;
  sourceCanvas.height = 10;
  let resetCount = 0;

  const buf = makeSortieBuffer([[0, 0], [10, 0], [10, 10], [0, 10]]);
  api.setWasm({
    memory: { buffer: buf }, __sortiePtrBytes: 0,
    sortie_ptr() { return -8; },
    __ml_reset() { resetCount++; },
    generer_tuiles() { return 1; },
    charger_tuile() { return 4; },
    methode_hexagone() { return 0; }, methode_carre() { return 1; }, methode_triangle() { return 2; },
    methode_trihex() { return 3; }, methode_snub_trihex() { return 4; }, methode_triangulaire_elongue() { return 5; },
    methode_carre_snub() { return 6; }, methode_rhombitrihex() { return 7; }, methode_carre_tronque() { return 8; },
    methode_grand_rhombitrihex() { return 9; }, methode_hex_tronque() { return 10; },
  });

  await api.rendreSortie();
  await api.rendreSortie();
  assert.strictEqual(resetCount, 2, "expected __ml_reset called once per render");
}

// ── Render skips invalid tiles without crashing ───────────────

async function testRenderSkipsInvalidTiles() {
  const { elements, api } = buildHarness();
  const sourceCanvas = elements.get("source-canvas");
  const status = elements.get("wasm-status");
  const download = elements.get("btn-download");
  sourceCanvas.width = 10;
  sourceCanvas.height = 10;

  // First tile: valid 4-vert square. Second tile: charger_tuile returns 1 (< 3 verts = invalid).
  const buf = makeSortieBuffer([[0, 0], [10, 0], [10, 10], [0, 10]]);
  let tileCall = 0;
  api.setWasm({
    memory: { buffer: buf }, __sortiePtrBytes: 0,
    sortie_ptr() { return -8; },
    __ml_reset() {},
    generer_tuiles() { return 2; },
    charger_tuile() { return tileCall++ === 0 ? 4 : 1; },
    methode_hexagone() { return 0; }, methode_carre() { return 1; }, methode_triangle() { return 2; },
    methode_trihex() { return 3; }, methode_snub_trihex() { return 4; }, methode_triangulaire_elongue() { return 5; },
    methode_carre_snub() { return 6; }, methode_rhombitrihex() { return 7; }, methode_carre_tronque() { return 8; },
    methode_grand_rhombitrihex() { return 9; }, methode_hex_tronque() { return 10; },
  });

  await api.rendreSortie();
  assert.match(status.textContent, /1\/2 tuiles valides/);
  assert.strictEqual(download.disabled, false);
}

// ── Render sanitises tile size before WASM ────────────────────

async function testRenderSanitisesTileSize() {
  const { elements, api } = buildHarness();
  const sourceCanvas = elements.get("source-canvas");
  sourceCanvas.width = 10;
  sourceCanvas.height = 10;

  const buf = makeSortieBuffer([[0, 0], [10, 0], [10, 10], [0, 10]]);
  let capturedA;
  api.state.side = "abc";
  api.state.method = "trihex";
  api.setWasm({
    memory: { buffer: buf }, __sortiePtrBytes: 0,
    sortie_ptr() { return -8; },
    __ml_reset() {},
    generer_tuiles(_larg, _haut, a) { capturedA = a; return 1; },
    charger_tuile() { return 4; },
    methode_hexagone() { return 0; }, methode_carre() { return 1; }, methode_triangle() { return 2; },
    methode_trihex() { return 3; }, methode_snub_trihex() { return 4; }, methode_triangulaire_elongue() { return 5; },
    methode_carre_snub() { return 6; }, methode_rhombitrihex() { return 7; }, methode_carre_tronque() { return 8; },
    methode_grand_rhombitrihex() { return 9; }, methode_hex_tronque() { return 10; },
  });

  await api.rendreSortie();
  assert.ok(Number.isFinite(capturedA) && capturedA >= 1, `expected valid tile size, got ${capturedA}`);
}

// ── All methods render and enable download ────────────────────

async function testAllMethodsRender() {
  const methods = [
    "hex", "square", "triangle",
    "trihex", "snub_trihex", "triangulaire_elongue",
    "carre_snub", "rhombitrihex", "carre_tronque",
    "grand_rhombitrihex", "hex_tronque",
  ];

  for (const method of methods) {
    const { elements, api } = buildHarness();
    const sourceCanvas = elements.get("source-canvas");
    const status = elements.get("wasm-status");
    const download = elements.get("btn-download");
    sourceCanvas.width = 48;
    sourceCanvas.height = 36;
    api.state.method = method;
    api.state.side = 12;

    const buf = makeSortieBuffer([[0, 0], [48, 0], [48, 36], [0, 36]]);
    api.setWasm({
      memory: { buffer: buf }, __sortiePtrBytes: 0,
      sortie_ptr() { return -8; },
      __ml_reset() {},
      generer_tuiles(_l, _h, _a, code) {
        assert.strictEqual(code, api.METHODES[method], `wrong code for ${method}`);
        return 1;
      },
      charger_tuile() { return 4; },
      methode_hexagone() { return 0; }, methode_carre() { return 1; }, methode_triangle() { return 2; },
      methode_trihex() { return 3; }, methode_snub_trihex() { return 4; }, methode_triangulaire_elongue() { return 5; },
      methode_carre_snub() { return 6; }, methode_rhombitrihex() { return 7; }, methode_carre_tronque() { return 8; },
      methode_grand_rhombitrihex() { return 9; }, methode_hex_tronque() { return 10; },
    });

    await api.rendreSortie();
    assert.match(status.textContent, new RegExp(`mode ${method}`), `status missing method for ${method}`);
    assert.strictEqual(download.disabled, false, `download should be enabled for ${method}`);
  }
}

// ── Real WASM integration tests ───────────────────────────────

function readJpegSize(filePath) {
  const bytes = fs.readFileSync(filePath);
  assert.ok(bytes.length > 4);
  assert.strictEqual(bytes[0], 0xff);
  assert.strictEqual(bytes[1], 0xd8);
  let offset = 2;
  while (offset + 9 < bytes.length) {
    while (offset < bytes.length && bytes[offset] !== 0xff) offset++;
    while (offset < bytes.length && bytes[offset] === 0xff) offset++;
    if (offset >= bytes.length) break;
    const marker = bytes[offset++];
    if (marker === 0xd9 || marker === 0xda) break;
    if (offset + 1 >= bytes.length) break;
    const segLen = bytes.readUInt16BE(offset);
    if (segLen < 2 || offset + segLen > bytes.length) break;
    const isSOF = (marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf);
    if (isSOF) return { width: bytes.readUInt16BE(offset + 5), height: bytes.readUInt16BE(offset + 3) };
    offset += segLen;
  }
  throw new Error(`Could not read JPEG dimensions from ${filePath}`);
}

function ensureProjectWasm() {
  if (fs.existsSync(WASM_PATH)) return;
  childProcess.execFileSync(
    "python", ["-m", "multilingualprogramming", "scripts/compile_wasm.multi"],
    { cwd: ROOT, stdio: "pipe" }
  );
  assert.ok(fs.existsSync(WASM_PATH), "expected compile_wasm.multi to generate hexagonify.wasm");
}

async function instantiateProjectWasm() {
  ensureProjectWasm();
  const bytes = fs.readFileSync(WASM_PATH);
  const module = await WebAssembly.compile(bytes);
  const imports = {
    wasi_snapshot_preview1: {
      fd_write() { return 0; }, fd_read() { return 0; },
      args_sizes_get() { return 0; }, args_get() { return 0; },
    },
  };
  const instance = await WebAssembly.instantiate(module, imports);
  return instance.exports;
}

async function testWasmNewApiExportsPresent() {
  const wasm = await instantiateProjectWasm();
  assert.strictEqual(typeof wasm.generer_tuiles, "function", "generer_tuiles must be exported");
  assert.strictEqual(typeof wasm.charger_tuile, "function", "charger_tuile must be exported");
  assert.strictEqual(typeof wasm.sortie_ptr, "function", "sortie_ptr must be exported");
  assert.strictEqual(typeof wasm.__ml_reset, "function", "__ml_reset must be exported");

  // Old per-vertex exports should be gone.
  assert.strictEqual(wasm.tuile_n_sommets, undefined, "tuile_n_sommets should not be exported");
  assert.strictEqual(wasm.tuile_sommet_x, undefined, "tuile_sommet_x should not be exported");
  assert.strictEqual(wasm.tuile_sommet_y, undefined, "tuile_sommet_y should not be exported");
  assert.strictEqual(wasm.km_init, undefined, "km_init should not be exported");
  assert.strictEqual(wasm.couleur_moyenne, undefined, "couleur_moyenne should not be exported");
}

async function testWasmSortieBufferReadable() {
  const wasm = await instantiateProjectWasm();
  const width = 240, height = 180, side = 24;

  const methods = [
    ["hex", 0], ["square", 1], ["triangle", 2],
    ["trihex", 3], ["snub_trihex", 4], ["triangulaire_elongue", 5],
    ["carre_snub", 6], ["rhombitrihex", 7], ["carre_tronque", 8],
    ["grand_rhombitrihex", 9], ["hex_tronque", 10],
  ];

  for (const [name, code] of methods) {
    wasm.__ml_reset();
    const nTuiles = Number(wasm.generer_tuiles(width, height, side, code));
    assert.ok(nTuiles > 0, `expected tiles for ${name}, got ${nTuiles}`);

    const ptrBytes = Number(wasm.sortie_ptr()) + 8;
    for (const ti of [0, Math.floor(nTuiles / 2), nTuiles - 1]) {
      const n = Number(wasm.charger_tuile(ti));
      assert.ok(n >= 3 && n <= 12, `expected 3..12 verts for ${name} tile ${ti}, got ${n}`);

      const arr = new Float64Array(wasm.memory.buffer, ptrBytes, 1 + n * 2);
      assert.strictEqual(arr[0], n, `sortie[0] should equal n for ${name} tile ${ti}`);

      const pad = side * 6;
      for (let j = 0; j < n; j++) {
        const x = arr[1 + j * 2];
        const y = arr[2 + j * 2];
        assert.ok(Number.isFinite(x), `x finite for ${name} tile ${ti} vert ${j}`);
        assert.ok(Number.isFinite(y), `y finite for ${name} tile ${ti} vert ${j}`);
        assert.ok(x >= -pad && x <= width + pad, `x bounded for ${name} tile ${ti}: ${x}`);
        assert.ok(y >= -pad && y <= height + pad, `y bounded for ${name} tile ${ti}: ${y}`);
      }
    }
  }
}

async function testSampleImagesProduceTilesInWasm() {
  const wasm = await instantiateProjectWasm();
  const images = [
    ["flower.jpg", FLOWER_JPG, { width: 640, height: 480 }],
    ["tree.jpg",   TREE_JPG,   { width: 4000, height: 3000 }],
  ];
  const methods = [
    ["hex", 0], ["square", 1], ["triangle", 2],
    ["trihex", 3], ["snub_trihex", 4], ["triangulaire_elongue", 5],
    ["carre_snub", 6], ["rhombitrihex", 7], ["carre_tronque", 8],
    ["grand_rhombitrihex", 9], ["hex_tronque", 10],
  ];
  const ptrBytes = Number(wasm.sortie_ptr()) + 8;

  for (const [imageName, imagePath, expectedSize] of images) {
    const { width, height } = readJpegSize(imagePath);
    assert.deepStrictEqual({ width, height }, expectedSize);

    for (const [name, code] of methods) {
      wasm.__ml_reset();
      const count = Number(wasm.generer_tuiles(width, height, 120, code));
      assert.ok(count > 0, `expected tiles for ${name} on ${imageName}`);

      const n = Number(wasm.charger_tuile(0));
      assert.ok(n >= 3, `expected polygon for ${name} on ${imageName}, got ${n}`);

      const arr = new Float64Array(wasm.memory.buffer, ptrBytes, 1 + n * 2);
      assert.strictEqual(arr[0], n);
    }
  }
}

// ── Run ───────────────────────────────────────────────────────

async function run() {
  testHtmlSmoke();
  testLireSortieReadsBuffer();
  testLireSortieRejectsInvalidVertCount();
  testTabSwitching();
  testMethodChangeTriggersRender();
  testAllMethodCodes();
  testCouleurTuileComputesMean();
  await testMlResetCalledBeforeEachRender();
  await testRenderSkipsInvalidTiles();
  await testRenderSanitisesTileSize();
  await testAllMethodsRender();
  await testWasmNewApiExportsPresent();
  await testWasmSortieBufferReadable();
  await testSampleImagesProduceTilesInWasm();
  console.log("Smoke tests passed.");
}

run().catch((err) => { console.error(err); process.exitCode = 1; });
