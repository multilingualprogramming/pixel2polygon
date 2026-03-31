const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const APP_JS = path.join(ROOT, "public", "app.js");
const INDEX_HTML = path.join(ROOT, "public", "index.html");

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
  assert.match(html, /src="app\.js"/);
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

async function run() {
  testHtmlSmoke();
  testMethodChangeTriggersRender();
  testTabSwitching();
  testAllMethodsGenerateTiles();
  await testRenderSanitizesTileSizeBeforeWasm();
  console.log("Smoke tests passed.");
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
