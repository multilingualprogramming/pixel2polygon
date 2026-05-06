// Maximum tiles the WASM module will store.
const MAX_TUILES_WASM = 2000;

const DENSITE_METHODE = {
  hex: 0.50, square: 1.0, triangle: 2.50,
  trihex: 1.0, snub_trihex: 2.50, triangulaire_elongue: 1.70,
  carre_snub: 1.30, rhombitrihex: 1.0, carre_tronque: 0.30,
  grand_rhombitrihex: 0.10, hex_tronque: 0.40,
};

function coteSuretePourImage(w, h, methode) {
  const densite = DENSITE_METHODE[methode] ?? 2.0;
  return Math.max(1, Math.ceil(Math.sqrt(densite * w * h / MAX_TUILES_WASM)));
}

const state = {
  method: "hex",
  side: 30,
  outlineWidth: 0,
  outlineColor: "#000000",
  outlineOpacity: 47,
  autoApply: false,
};

const METHODES = {
  hex: 0, square: 1, triangle: 2,
  trihex: 3, snub_trihex: 4, triangulaire_elongue: 5,
  carre_snub: 6, rhombitrihex: 7, carre_tronque: 8,
  grand_rhombitrihex: 9, hex_tronque: 10,
};

const EXPORTS_CODES_METHODES = {
  hex: "methode_hexagone",
  square: "methode_carre",
  triangle: "methode_triangle",
  trihex: "methode_trihex",
  snub_trihex: "methode_snub_trihex",
  triangulaire_elongue: "methode_triangulaire_elongue",
  carre_snub: "methode_carre_snub",
  rhombitrihex: "methode_rhombitrihex",
  carre_tronque: "methode_carre_tronque",
  grand_rhombitrihex: "methode_grand_rhombitrihex",
  hex_tronque: "methode_hex_tronque",
};

const GALERIE_FORMES = [
  { methode: "hex",                 nom: "Hexagone",                notation: "6.6.6",         desc: "Pavage r&eacute;gulier par hexagones &agrave; sommet pointu.",             c1: "#0a2a1a", c2: "#4ade80" },
  { methode: "square",              nom: "Carr&eacute;",            notation: "4.4.4.4",       desc: "Grille orthogonale classique.",                                            c1: "#0a1a2a", c2: "#53b0ff" },
  { methode: "triangle",            nom: "Triangle",                notation: "3.3.3.3.3.3",   desc: "Triangles &eacute;quilat&eacute;raux alternant haut et bas.",              c1: "#2a100a", c2: "#fb923c" },
  { methode: "trihex",              nom: "Hexadeltille",            notation: "3.6.3.6",       desc: "Alternance r&eacute;guli&egrave;re de triangles et d&rsquo;hexagones.",    c1: "#100a2a", c2: "#a78bfa" },
  { methode: "snub_trihex",         nom: "Hexadeltille snub",       notation: "3.3.3.3.6",     desc: "Hexagones entoures de triangles en spirale.",                             c1: "#2a0a18", c2: "#f472b6" },
  { methode: "triangulaire_elongue",nom: "Triangulaire allong&eacute;", notation: "3.3.3.4.4", desc: "Bandes altern&eacute;es de triangles &eacute;quilat&eacute;raux et de carr&eacute;s.", c1: "#0a2a28", c2: "#2dd4bf" },
  { methode: "carre_snub",          nom: "Carr&eacute; snub",       notation: "3.3.4.3.4",     desc: "Carr&eacute;s entoures de quatre triangles &eacute;quilat&eacute;raux.",   c1: "#2a0a10", c2: "#fb7185" },
  { methode: "rhombitrihex",        nom: "Rhombitrihexagonal",      notation: "3.4.6.4",       desc: "Triangles, carr&eacute;s et hexagones en alternance r&eacute;guli&egrave;re.", c1: "#0a2a18", c2: "#34d399" },
  { methode: "carre_tronque",       nom: "Carr&eacute; tronqu&eacute;", notation: "4.8.8",    desc: "Carr&eacute;s et octagones r&eacute;guliers. Proche du carrelage arabe.",  c1: "#2a200a", c2: "#fbbf24" },
  { methode: "grand_rhombitrihex",  nom: "Grand rhombitrihexagonal",notation: "4.6.12",        desc: "Carr&eacute;s, hexagones et dod&eacute;cagones. Le plus complexe.",        c1: "#180a2a", c2: "#c084fc" },
  { methode: "hex_tronque",         nom: "Hexagonal tronqu&eacute;",notation: "3.12.12",       desc: "Triangles et dod&eacute;cagones en alternance r&eacute;guli&egrave;re.",   c1: "#0a2028", c2: "#22d3ee" },
];

let wasm = null;
let loadedImage = null;
let renderToken = 0;

// Byte address of _sortie in WASM linear memory (cached after load).
let sortiePtrBytes = 0;

function urlWasmVersionnee() {
  try {
    if (typeof document.querySelector !== "function") return "hexagonify.wasm";
    const scriptCourant = document.querySelector('script[src*="app.js"]');
    if (!scriptCourant?.src) return "hexagonify.wasm";
    const urlScript = new URL(scriptCourant.src, window.location.href);
    const urlWasm = new URL("hexagonify.wasm", urlScript);
    if (urlScript.search) urlWasm.search = urlScript.search;
    return urlWasm.toString();
  } catch (err) {
    return "hexagonify.wasm";
  }
}

function afficherOverlay(actif) {
  const overlay = document.getElementById("processing-overlay");
  if (overlay) overlay.classList.toggle("actif", actif);
}

async function chargerWasm() {
  const status = document.getElementById("wasm-status");
  const btnApply = document.getElementById("btn-apply");
  try {
    const response = await fetch(urlWasmVersionnee());
    if (!response.ok) throw new Error(`Fichier WASM indisponible (${response.status}).`);
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength < 8) throw new Error("Fichier WASM vide ou tronque.");

    const module = await WebAssembly.compile(bytes);
    const importObject = construireImports(module);
    const instance = await WebAssembly.instantiate(module, importObject);

    if (!validerExports(instance.exports)) {
      throw new Error("Les exports WASM ne correspondent pas a l'interface attendue.");
    }

    wasm = instance.exports;
    synchroniserCodesMethodes(wasm);
    // Cache the byte address of the _sortie output buffer once.
    sortiePtrBytes = Number(wasm.sortie_ptr()) + 8;

    status.textContent = "Moteur WASM charge.";
    btnApply.disabled = false;
    document.getElementById("upload-zone").style.pointerEvents = "auto";
    document.getElementById("upload-zone").style.opacity = "1";
  } catch (err) {
    wasm = null;
    status.textContent = "WASM requis. Compilez d'abord avec : multilingual run scripts/compile_wasm.multi";
    btnApply.disabled = true;
    document.getElementById("upload-zone").style.opacity = "0.4";
    document.getElementById("upload-zone").style.pointerEvents = "none";
    console.error("[pixel2polygon] Echec du chargement WASM :", err);
  }
}

function construireImports(module) {
  const obj = {};
  for (const entry of WebAssembly.Module.imports(module)) {
    if (!obj[entry.module]) obj[entry.module] = {};
    if (entry.kind === "function") obj[entry.module][entry.name] = () => 0;
    else if (entry.kind === "memory") obj[entry.module][entry.name] = new WebAssembly.Memory({ initial: 16 });
    else if (entry.kind === "table") obj[entry.module][entry.name] = new WebAssembly.Table({ initial: 0, element: "anyfunc" });
    else if (entry.kind === "global") obj[entry.module][entry.name] = new WebAssembly.Global({ value: "i32", mutable: true }, 0);
  }
  if (!obj.env) obj.env = {};
  return obj;
}

function validerExports(exports) {
  const requis = ["generer_tuiles", "charger_tuile", "sortie_ptr"];
  for (const nom of requis) {
    if (typeof exports[nom] !== "function") return false;
  }
  return true;
}

function synchroniserCodesMethodes(exports) {
  for (const [nom, exportNom] of Object.entries(EXPORTS_CODES_METHODES)) {
    if (typeof exports[exportNom] !== "function") continue;
    const code = Number(exports[exportNom]());
    if (Number.isInteger(code) && code >= 0) METHODES[nom] = code;
  }
}

// Read the _sortie buffer that charger_tuile(i) filled.
// Returns an array of [x,y] pairs, length = n_verts. Returns null on invalid tile.
function lireSortie(n) {
  if (!Number.isInteger(n) || n < 3 || n > 12) return null;
  const buf = new Float64Array(wasm.memory.buffer, sortiePtrBytes, 1 + n * 2);
  const sommets = [];
  for (let j = 0; j < n; j++) {
    const x = buf[1 + j * 2];
    const y = buf[2 + j * 2];
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    sommets.push([x, y]);
  }
  return sommets;
}

function boitePolygone(sommets) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of sommets) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}

function pointDansPolygone(px, py, sommets) {
  let dedans = false;
  const n = sommets.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = sommets[i][0], yi = sommets[i][1];
    const xj = sommets[j][0], yj = sommets[j][1];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi)
      dedans = !dedans;
  }
  return dedans;
}

function couleurTuile(pixels, larg, haut, sommets) {
  const { minX, minY, maxX, maxY } = boitePolygone(sommets);
  const x0 = Math.max(0, Math.floor(minX));
  const y0 = Math.max(0, Math.floor(minY));
  const x1 = Math.min(larg, Math.ceil(maxX));
  const y1 = Math.min(haut, Math.ceil(maxY));
  if (x1 <= x0 || y1 <= y0) return null;

  const aire = Math.max(1, (x1 - x0) * (y1 - y0));
  const pas = Math.max(1, Math.floor(Math.sqrt(aire / 144)));
  const demiPas = pas / 2;
  let rTot = 0, gTot = 0, bTot = 0, compte = 0;

  for (let py = y0; py < y1; py += pas) {
    for (let px = x0; px < x1; px += pas) {
      const sx = Math.min(x1 - 0.5, px + demiPas);
      const sy = Math.min(y1 - 0.5, py + demiPas);
      if (pointDansPolygone(sx, sy, sommets)) {
        const ix = Math.min(larg - 1, Math.max(0, Math.floor(sx)));
        const iy = Math.min(haut - 1, Math.max(0, Math.floor(sy)));
        const i = (iy * larg + ix) * 4;
        rTot += pixels[i]; gTot += pixels[i + 1]; bTot += pixels[i + 2];
        compte++;
      }
    }
  }

  if (compte === 0) {
    const cx = Math.min(larg - 1, Math.max(0, Math.round((minX + maxX) / 2)));
    const cy = Math.min(haut - 1, Math.max(0, Math.round((minY + maxY) / 2)));
    const i = (cy * larg + cx) * 4;
    return [pixels[i], pixels[i + 1], pixels[i + 2]];
  }
  return [Math.round(rTot / compte), Math.round(gTot / compte), Math.round(bTot / compte)];
}

function dessinerTuile(ctx, sommets, couleur, largContour, couleurContour) {
  ctx.beginPath();
  ctx.moveTo(sommets[0][0], sommets[0][1]);
  for (let i = 1; i < sommets.length; i++) ctx.lineTo(sommets[i][0], sommets[i][1]);
  ctx.closePath();
  ctx.fillStyle = `rgb(${couleur[0]},${couleur[1]},${couleur[2]})`;
  ctx.fill();
  if (largContour > 0) {
    ctx.strokeStyle = couleurContour;
    ctx.lineWidth = largContour;
    ctx.stroke();
  }
}

function couleurContourCss() {
  const hex = state.outlineColor.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${(state.outlineOpacity / 100).toFixed(3)})`;
}

function entierSecurise(valeur, secours, minimum = null, maximum = null) {
  let n = Number.isFinite(valeur) ? Math.trunc(valeur) : Math.trunc(Number(valeur));
  if (!Number.isFinite(n)) n = secours;
  if (minimum !== null) n = Math.max(minimum, n);
  if (maximum !== null) n = Math.min(maximum, n);
  return n;
}

function afficherSource(imgEl) {
  const srcCanvas = document.getElementById("source-canvas");
  const w = imgEl.naturalWidth;
  const h = imgEl.naturalHeight;
  srcCanvas.width = w;
  srcCanvas.height = h;
  srcCanvas.getContext("2d").drawImage(imgEl, 0, 0, w, h);
}

async function rendreSortie() {
  const srcCanvas = document.getElementById("source-canvas");
  const outCanvas = document.getElementById("output-canvas");
  const btnDl = document.getElementById("btn-download");
  const status = document.getElementById("wasm-status");
  const token = ++renderToken;

  afficherOverlay(true);
  btnDl.disabled = true;

  try {
    await new Promise((resolve) => setTimeout(resolve, 20));

    const w = entierSecurise(srcCanvas.width, 0, 1);
    const h = entierSecurise(srcCanvas.height, 0, 1);
    const pixelData = srcCanvas.getContext("2d").getImageData(0, 0, w, h).data;

    if (typeof wasm.__ml_reset === "function") wasm.__ml_reset();

    outCanvas.width = w;
    outCanvas.height = h;
    const ctx = outCanvas.getContext("2d");

    // Background: mean color of image.
    let rTot = 0, gTot = 0, bTot = 0;
    const step = Math.max(1, Math.floor((w * h) / 96));
    for (let i = 0; i < w * h; i += step) {
      rTot += pixelData[i * 4];
      gTot += pixelData[i * 4 + 1];
      bTot += pixelData[i * 4 + 2];
    }
    const nSamples = Math.ceil((w * h) / step);
    ctx.fillStyle = `rgb(${Math.round(rTot/nSamples)},${Math.round(gTot/nSamples)},${Math.round(bTot/nSamples)})`;
    ctx.fillRect(0, 0, w, h);

    let cote = entierSecurise(state.side, 30, 1);
    const coteDemande = cote;
    const coteMin = coteSuretePourImage(w, h, state.method);
    if (cote < coteMin) cote = coteMin;

    const code = entierSecurise(METHODES[state.method], METHODES.hex, 0);
    const nTuiles = Number(wasm.generer_tuiles(w, h, cote, code));

    if (cote !== coteDemande) {
      state.side = cote;
      const tileSizeEl = document.getElementById("tile-size");
      if (tileSizeEl) tileSizeEl.value = String(cote);
      const tileSizeDisp = document.getElementById("tile-size-display");
      if (tileSizeDisp) tileSizeDisp.textContent = String(cote);
    }

    const cssContour = couleurContourCss();
    let tuilesInvalides = 0;

    for (let ti = 0; ti < nTuiles; ti++) {
      const n = Number(wasm.charger_tuile(ti));
      const sommets = lireSortie(n);
      if (!sommets) { tuilesInvalides++; continue; }
      const couleur = couleurTuile(pixelData, w, h, sommets);
      if (couleur) dessinerTuile(ctx, sommets, couleur, state.outlineWidth, cssContour);
    }

    status.textContent = tuilesInvalides > 0
      ? `Rendu termine : ${nTuiles - tuilesInvalides}/${nTuiles} tuiles valides pour le mode ${state.method}.`
      : `Rendu termine : ${nTuiles} tuiles pour le mode ${state.method}.`;
    btnDl.disabled = false;
  } catch (err) {
    console.error("[pixel2polygon] Echec du rendu :", err);
    status.textContent = `Le rendu a echoue pour le mode ${state.method}.`;
  } finally {
    if (token === renderToken) afficherOverlay(false);
  }
}

function chargerImageDepuisFichier(fichier) {
  if (!fichier || !fichier.type.startsWith("image/")) return;
  const url = URL.createObjectURL(fichier);
  const img = new Image();
  img.onload = () => {
    loadedImage = img;
    URL.revokeObjectURL(url);
    afficherZoneCanvas();
    afficherSource(img);
    rendreSortie();
  };
  img.src = url;
}

function afficherZoneCanvas() {
  document.getElementById("upload-zone").hidden = true;
  document.getElementById("canvas-area").hidden = false;
}

function afficherZoneUpload() {
  document.getElementById("upload-zone").hidden = false;
  document.getElementById("canvas-area").hidden = true;
  loadedImage = null;
  document.getElementById("btn-download").disabled = true;
  afficherOverlay(false);
}

function debounce(fn, delai) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delai); };
}

const planifierRendu = debounce(() => {
  if (loadedImage && state.autoApply) rendreSortie();
}, 300);

function basculerOnglet(nom) {
  const panneaux = ["studio-panel", "source-panel", "gallery-panel"];
  const onglets  = ["tab-studio", "tab-sources", "tab-gallery"];
  panneaux.forEach((id) => { const el = document.getElementById(id); if (el) el.hidden = (id !== `${nom}-panel`); });
  onglets.forEach((id)  => { const el = document.getElementById(id); if (el) el.classList.toggle("active", id === `tab-${nom}`); });
}

function dessinerApercu(canvasEl, forme) {
  const W = canvasEl.width;
  const H = canvasEl.height;
  const ctx = canvasEl.getContext("2d");
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, forme.c1);
  grad.addColorStop(1, forme.c2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  if (!wasm) return;
  try {
    const pixelData = ctx.getImageData(0, 0, W, H).data;
    if (typeof wasm.__ml_reset === "function") wasm.__ml_reset();
    const tailleTuile = Math.max(coteSuretePourImage(W, H, forme.methode), 20);
    const code = entierSecurise(METHODES[forme.methode], METHODES.hex, 0);
    const nTuiles = Number(wasm.generer_tuiles(W, H, tailleTuile, code));
    for (let ti = 0; ti < nTuiles; ti++) {
      const n = Number(wasm.charger_tuile(ti));
      const sommets = lireSortie(n);
      if (!sommets) continue;
      const couleur = couleurTuile(pixelData, W, H, sommets);
      if (couleur) dessinerTuile(ctx, sommets, couleur, 1, "rgba(0,0,0,0.22)");
    }
  } catch (err) {
    console.warn("[pixel2polygon] Apercu galerie echoue :", forme.methode, err);
  }
}

function creerCartesGalerie() {
  const grille = document.getElementById("gallery-grid");
  if (!grille || grille.children.length > 0) return;
  for (const forme of GALERIE_FORMES) {
    const carte = document.createElement("article");
    carte.className = "gallery-card";
    carte.innerHTML = `
      <div class="gallery-canvas-wrap">
        <canvas id="gallery-canvas-${forme.methode}" width="240" height="160"></canvas>
      </div>
      <div class="gallery-card-body">
        <div class="gallery-card-header">
          <p class="gallery-card-name">${forme.nom}</p>
          <span class="gallery-notation">${forme.notation}</span>
        </div>
        <p class="gallery-card-desc">${forme.desc}</p>
        <button type="button" class="gallery-use-btn" data-methode="${forme.methode}">Utiliser ce motif &rarr;</button>
      </div>`;
    grille.appendChild(carte);
  }
  grille.addEventListener("click", (e) => {
    const btn = e.target.closest(".gallery-use-btn");
    if (btn) {
      state.method = btn.dataset.methode;
      const sel = document.getElementById("method-select");
      if (sel) sel.value = state.method;
      basculerOnglet("studio");
      if (loadedImage) rendreSortie();
    }
  });
}

function rendreGalerie() {
  creerCartesGalerie();
  for (const forme of GALERIE_FORMES) {
    const canvas = document.getElementById(`gallery-canvas-${forme.methode}`);
    if (canvas) dessinerApercu(canvas, forme);
  }
}

function lierControles() {
  const methodSelect = document.getElementById("method-select");
  methodSelect.value = state.method;
  methodSelect.addEventListener("change", () => {
    state.method = methodSelect.value;
    if (loadedImage) rendreSortie();
  });

  const tileSizeEl = document.getElementById("tile-size");
  const tileSizeDisp = document.getElementById("tile-size-display");
  tileSizeEl.value = String(state.side);
  tileSizeDisp.textContent = String(state.side);
  tileSizeEl.addEventListener("input", () => {
    state.side = entierSecurise(tileSizeEl.value, 30, 1);
    tileSizeDisp.textContent = String(state.side);
    planifierRendu();
  });

  const outWEl = document.getElementById("outline-width");
  const outWDisp = document.getElementById("outline-width-display");
  outWEl.value = String(state.outlineWidth);
  outWDisp.textContent = String(state.outlineWidth);
  outWEl.addEventListener("input", () => {
    state.outlineWidth = entierSecurise(outWEl.value, 0, 0);
    outWDisp.textContent = String(state.outlineWidth);
    planifierRendu();
  });

  const outCEl = document.getElementById("outline-color");
  outCEl.value = state.outlineColor;
  outCEl.addEventListener("input", () => { state.outlineColor = outCEl.value; planifierRendu(); });

  const outOEl = document.getElementById("outline-opacity");
  const outODisp = document.getElementById("outline-opacity-display");
  outOEl.value = String(state.outlineOpacity);
  outODisp.textContent = String(state.outlineOpacity);
  outOEl.addEventListener("input", () => {
    state.outlineOpacity = entierSecurise(outOEl.value, 47, 0, 100);
    outODisp.textContent = String(state.outlineOpacity);
    planifierRendu();
  });

  const autoApplyEl = document.getElementById("auto-apply");
  autoApplyEl.checked = state.autoApply;
  autoApplyEl.addEventListener("change", () => { state.autoApply = autoApplyEl.checked; });

  document.getElementById("btn-apply").addEventListener("click", () => {
    if (loadedImage) rendreSortie();
  });

  document.getElementById("btn-new-image").addEventListener("click", afficherZoneUpload);

  document.getElementById("btn-download").addEventListener("click", () => {
    const outCanvas = document.getElementById("output-canvas");
    const a = document.createElement("a");
    a.download = `pixel2polygon-${state.method}.png`;
    a.href = outCanvas.toDataURL("image/png");
    a.click();
  });

  const fileInput = document.getElementById("file-input");
  fileInput.addEventListener("change", () => {
    if (fileInput.files[0]) chargerImageDepuisFichier(fileInput.files[0]);
  });

  const uploadZone = document.getElementById("upload-zone");
  uploadZone.addEventListener("dragover", (e) => { e.preventDefault(); uploadZone.classList.add("drag-over"); });
  uploadZone.addEventListener("dragleave", () => { uploadZone.classList.remove("drag-over"); });
  uploadZone.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadZone.classList.remove("drag-over");
    const fichier = e.dataTransfer.files[0];
    if (fichier) chargerImageDepuisFichier(fichier);
  });

  document.getElementById("tab-studio").addEventListener("click", () => basculerOnglet("studio"));
  document.getElementById("tab-gallery").addEventListener("click", () => { basculerOnglet("gallery"); rendreGalerie(); });
}

async function init() {
  lierControles();
  await chargerWasm();
}

init();
