const MAX_DIM = 1200;

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

let wasm = null;
let loadedImage = null;
let renderToken = 0;

function afficherOverlay(actif) {
  const overlay = document.getElementById("processing-overlay");
  if (overlay) overlay.classList.toggle("actif", actif);
}

async function chargerWasm() {
  const status = document.getElementById("wasm-status");
  const btnApply = document.getElementById("btn-apply");
  try {
    const response = await fetch("hexagonify.wasm");
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
    status.textContent = "Moteur WASM charge.";
    btnApply.disabled = false;
    document.getElementById("upload-zone").style.pointerEvents = "auto";
    document.getElementById("upload-zone").style.opacity = "1";
  } catch (err) {
    wasm = null;
    status.textContent = "WASM requis. Compilez d'abord avec : multilingual run scripts/compile_wasm.ml";
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
  const requis = [
    "couleur_moyenne",
    "km_init", "km_ajouter", "km_calculer", "km_r", "km_g", "km_b",
    "generer_tuiles", "tuile_n_sommets", "tuile_sommet_x", "tuile_sommet_y",
  ];
  for (const nom of requis) {
    if (typeof exports[nom] !== "function") return false;
  }
  return true;
}

function couleur_moyenne(total, compte) { return Number(wasm.couleur_moyenne(total, compte)); }
function km_init(k) { wasm.km_init(k); }
function km_ajouter(r, g, b) { wasm.km_ajouter(r, g, b); }
function km_calculer(maxIter) { wasm.km_calculer(maxIter); }
function km_resultat() { return [Number(wasm.km_r()), Number(wasm.km_g()), Number(wasm.km_b())]; }

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

function couleurImageKMeans(pixels, larg, haut, maxSamples = 2000) {
  const total = larg * haut;
  const step = Math.max(1, Math.floor(total / maxSamples));
  km_init(3);
  for (let i = 0; i < total; i += step) {
    const idx = i * 4;
    km_ajouter(pixels[idx], pixels[idx + 1], pixels[idx + 2]);
  }
  km_calculer(20);
  return km_resultat();
}

function couleurTuile(pixels, larg, haut, sommets) {
  const box = boitePolygone(sommets);
  const x0 = Math.max(0, Math.floor(box.minX));
  const y0 = Math.max(0, Math.floor(box.minY));
  const x1 = Math.min(larg, Math.ceil(box.maxX));
  const y1 = Math.min(haut, Math.ceil(box.maxY));
  if (x1 <= x0 || y1 <= y0) return null;
  let rTot = 0, gTot = 0, bTot = 0, compte = 0;
  for (let py = y0; py < y1; py++) {
    for (let px = x0; px < x1; px++) {
      if (pointDansPolygone(px + 0.5, py + 0.5, sommets)) {
        const i = (py * larg + px) * 4;
        rTot += pixels[i]; gTot += pixels[i + 1]; bTot += pixels[i + 2];
        compte++;
      }
    }
  }
  if (compte === 0) {
    const cx = Math.min(larg - 1, Math.max(0, Math.round((box.minX + box.maxX) / 2)));
    const cy = Math.min(haut - 1, Math.max(0, Math.round((box.minY + box.maxY) / 2)));
    const i = (cy * larg + cx) * 4;
    return [pixels[i], pixels[i + 1], pixels[i + 2]];
  }
  return [couleur_moyenne(rTot, compte), couleur_moyenne(gTot, compte), couleur_moyenne(bTot, compte)];
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

function dimensionsScalees(imgEl) {
  let w = imgEl.naturalWidth, h = imgEl.naturalHeight;
  if (w > MAX_DIM) { h = Math.round(h * MAX_DIM / w); w = MAX_DIM; }
  if (h > MAX_DIM) { w = Math.round(w * MAX_DIM / h); h = MAX_DIM; }
  return [w, h];
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
  const [w, h] = dimensionsScalees(imgEl);
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

    outCanvas.width = w;
    outCanvas.height = h;
    const ctx = outCanvas.getContext("2d");
    const bgCouleur = couleurImageKMeans(pixelData, w, h);
    ctx.fillStyle = `rgb(${bgCouleur[0]},${bgCouleur[1]},${bgCouleur[2]})`;
    ctx.fillRect(0, 0, w, h);

    const code = entierSecurise(METHODES[state.method], 0, 0);
    const cote = entierSecurise(state.side, 30, 1);
    if (cote !== state.side) state.side = cote;
    const nTuiles = Number(wasm.generer_tuiles(w, h, cote, code));
    const indices = Array.from({ length: nTuiles }, (_, i) => i);
    indices.sort((a, b) => Number(wasm.tuile_n_sommets(a)) - Number(wasm.tuile_n_sommets(b)));

    const cssContour = couleurContourCss();
    for (const ti of indices) {
      const n = Number(wasm.tuile_n_sommets(ti));
      const sommets = [];
      for (let j = 0; j < n; j++)
        sommets.push([Number(wasm.tuile_sommet_x(ti, j)), Number(wasm.tuile_sommet_y(ti, j))]);
      const couleur = couleurTuile(pixelData, w, h, sommets);
      if (couleur) dessinerTuile(ctx, sommets, couleur, state.outlineWidth, cssContour);
    }

    status.textContent = `Rendu termine : ${nTuiles} tuiles pour le mode ${state.method}.`;
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

  const autoEl = document.getElementById("auto-apply");
  autoEl.checked = state.autoApply;
  autoEl.addEventListener("change", () => { state.autoApply = autoEl.checked; });

  document.getElementById("btn-apply").addEventListener("click", () => {
    if (loadedImage) rendreSortie();
  });

  document.getElementById("btn-new-image").addEventListener("click", afficherZoneUpload);

  document.getElementById("btn-download").addEventListener("click", () => {
    const canvas = document.getElementById("output-canvas");
    const lien = document.createElement("a");
    lien.href = canvas.toDataURL("image/png");
    lien.download = `pixel2polygon-${state.method}-${state.side}px.png`;
    lien.click();
  });

  const fileInput = document.getElementById("file-input");
  fileInput.addEventListener("change", () => {
    if (fileInput.files[0]) chargerImageDepuisFichier(fileInput.files[0]);
  });

  const uploadZone = document.getElementById("upload-zone");
  uploadZone.addEventListener("click", (e) => { if (e.target.tagName !== "LABEL") fileInput.click(); });
  uploadZone.addEventListener("dragover", (e) => { e.preventDefault(); uploadZone.classList.add("dragover"); });
  uploadZone.addEventListener("dragleave", () => { uploadZone.classList.remove("dragover"); });
  uploadZone.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadZone.classList.remove("dragover");
    const fichier = e.dataTransfer.files[0];
    if (fichier) chargerImageDepuisFichier(fichier);
  });

  document.addEventListener("paste", (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith("image/")) { chargerImageDepuisFichier(item.getAsFile()); break; }
    }
  });
}

function basculerOnglet(nom) {
  const studio = nom === "studio";
  document.getElementById("studio-panel").hidden = !studio;
  document.getElementById("tab-studio").classList.toggle("active", studio);
}

async function init() {
  const btnApply = document.getElementById("btn-apply");
  if (btnApply) btnApply.disabled = true;
  const tabStudio = document.getElementById("tab-studio");
  if (tabStudio) tabStudio.addEventListener("click", () => basculerOnglet("studio"));
  basculerOnglet("studio");
  try { lierControles(); } catch (err) { console.error("[pixel2polygon] Echec de liaison des controles :", err); }
  try { await chargerWasm(); } catch (err) { console.error("[pixel2polygon] Echec d'initialisation WASM :", err); }
}

init();
