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
    "source-panel",
    "tab-studio",
    "tab-source",
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
  lierControles,
  basculerOnglet,
  genererTuiles,
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
  api.basculerOnglet("source");

  assert.strictEqual(elements.get("studio-panel").hidden, true);
  assert.strictEqual(elements.get("source-panel").hidden, false);
  assert.strictEqual(elements.get("tab-source").classList.contains("active"), true);
  assert.strictEqual(elements.get("tab-studio").classList.contains("active"), false);
}

function testAllMethodsGenerateTiles() {
  const { api } = buildHarness();
  api.setWasm({
    sommet_hex_x(cx, cy, a, idx) {
      const angles = [-Math.PI / 2, -Math.PI / 6, Math.PI / 6, Math.PI / 2, (5 * Math.PI) / 6, (7 * Math.PI) / 6];
      return cx + a * Math.cos(angles[idx]);
    },
    sommet_hex_y(cx, cy, a, idx) {
      const angles = [-Math.PI / 2, -Math.PI / 6, Math.PI / 6, Math.PI / 2, (5 * Math.PI) / 6, (7 * Math.PI) / 6];
      return cy + a * Math.sin(angles[idx]);
    },
    espacement_horiz(a) { return Math.sqrt(3) * a; },
    espacement_vert(a) { return 1.5 * a; },
    hauteur_tri(a) { return (Math.sqrt(3) * a) / 2; },
    sommet_tri_x(x, a, idx, versHaut) {
      const up = versHaut === 1;
      const points = up
        ? [[x, (Math.sqrt(3) * a) / 2], [x + a / 2, 0], [x + a, (Math.sqrt(3) * a) / 2]]
        : [[x, 0], [x + a, 0], [x + a / 2, (Math.sqrt(3) * a) / 2]];
      return points[idx][0];
    },
    sommet_tri_y(y, a, idx, versHaut) {
      const h = (Math.sqrt(3) * a) / 2;
      const up = versHaut === 1;
      const points = up ? [[0, y + h], [0, y], [0, y + h]] : [[0, y], [0, y], [0, y + h]];
      return points[idx][1];
    },
    couleur_moyenne(total, count) { return Math.round(total / count); },
  });

  const methods = [
    "hex",
    "square",
    "triangle",
    "trihex",
    "snub_trihex",
    "triangulaire_elongue",
    "carre_snub",
    "rhombitrihex",
    "carre_tronque",
    "grand_rhombitrihex",
    "hex_tronque",
  ];

  for (const method of methods) {
    const tiles = api.genererTuiles(160, 120, 24, method);
    assert.ok(Array.isArray(tiles), `expected an array for ${method}`);
    assert.ok(tiles.length > 0, `expected at least one tile for ${method}`);
  }
}

function run() {
  testHtmlSmoke();
  testMethodChangeTriggersRender();
  testTabSwitching();
  testAllMethodsGenerateTiles();
  console.log("Smoke tests passed.");
}

run();
