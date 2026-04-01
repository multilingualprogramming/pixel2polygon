// Maximum tiles the WASM module will store (matches _MAX_TUILES in hexagonify_wasm.ml).
const MAX_TUILES_WASM = 2000;

// Tile density per (cote² / image area) for each tiling method, used to warn
// the user when the requested tile size would exceed the WASM tile cap.
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

let wasm = null;
let loadedImage = null;
let renderToken = 0;

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

function synchroniserCodesMethodes(exports) {
  for (const [nom, exportNom] of Object.entries(EXPORTS_CODES_METHODES)) {
    if (typeof exports[exportNom] !== "function") continue;
    const code = Number(exports[exportNom]());
    if (Number.isInteger(code) && code >= 0) METHODES[nom] = code;
  }
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

function pasEchantillonnageTuile(largeur, hauteur, maxSamples = 144) {
  const aireBoite = Math.max(1, largeur * hauteur);
  return Math.max(1, Math.floor(Math.sqrt(aireBoite / maxSamples)));
}

function couleurImageMoyenne(pixels, larg, haut, maxSamples = 96) {
  const total = larg * haut;
  if (total <= 0) return [0, 0, 0];
  const step = Math.max(1, Math.floor(total / maxSamples));
  let rTot = 0, gTot = 0, bTot = 0, compte = 0;
  for (let i = 0; i < total; i += step) {
    const idx = i * 4;
    rTot += pixels[idx];
    gTot += pixels[idx + 1];
    bTot += pixels[idx + 2];
    compte++;
  }
  if (compte === 0) return [0, 0, 0];
  return [
    couleur_moyenne(rTot, compte),
    couleur_moyenne(gTot, compte),
    couleur_moyenne(bTot, compte),
  ];
}

function couleurImageKMeans(pixels, larg, haut, maxSamples = 96) {
  try {
    const total = larg * haut;
    const step = Math.max(1, Math.floor(total / maxSamples));
    km_init(3);
    for (let i = 0; i < total; i += step) {
      const idx = i * 4;
      km_ajouter(pixels[idx], pixels[idx + 1], pixels[idx + 2]);
    }
    km_calculer(20);
    return km_resultat();
  } catch (err) {
    console.warn("[pixel2polygon] K-means indisponible, repli sur la moyenne :", err);
    return couleurImageMoyenne(pixels, larg, haut, maxSamples);
  }
}

function couleurTuile(pixels, larg, haut, sommets) {
  const box = boitePolygone(sommets);
  const x0 = Math.max(0, Math.floor(box.minX));
  const y0 = Math.max(0, Math.floor(box.minY));
  const x1 = Math.min(larg, Math.ceil(box.maxX));
  const y1 = Math.min(haut, Math.ceil(box.maxY));
  if (x1 <= x0 || y1 <= y0) return null;
  const pas = pasEchantillonnageTuile(x1 - x0, y1 - y0);
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

function lireSommetsTuile(ti) {
  const n = Number(wasm.tuile_n_sommets(ti));
  if (!Number.isInteger(n) || n < 3 || n > 64) return null;
  const sommets = [];
  for (let j = 0; j < n; j++) {
    const x = Number(wasm.tuile_sommet_x(ti, j));
    const y = Number(wasm.tuile_sommet_y(ti, j));
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    sommets.push([x, y]);
  }
  return sommets;
}

function lireNombreSommetsTuile(ti) {
  try {
    const n = Number(wasm.tuile_n_sommets(ti));
    return Number.isInteger(n) && n >= 0 ? n : Number.MAX_SAFE_INTEGER;
  } catch (err) {
    return Number.MAX_SAFE_INTEGER;
  }
}

function entierSecurise(valeur, secours, minimum = null, maximum = null) {
  let n = Number.isFinite(valeur) ? Math.trunc(valeur) : Math.trunc(Number(valeur));
  if (!Number.isFinite(n)) n = secours;
  if (minimum !== null) n = Math.max(minimum, n);
  if (maximum !== null) n = Math.min(maximum, n);
  return n;
}

function genererTuilesAvecRepli(w, h, cote, methodeDemandee) {
  const code = entierSecurise(METHODES[methodeDemandee], METHODES.hex, 0);
  const nTuiles = Number(wasm.generer_tuiles(w, h, cote, code));
  if (!Number.isInteger(nTuiles) || nTuiles < 0) {
    throw new Error(`Nombre de tuiles invalide renvoye par WASM: ${nTuiles}`);
  }
  return { nTuiles, methodeUtilisee: methodeDemandee };
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

    outCanvas.width = w;
    outCanvas.height = h;
    const ctx = outCanvas.getContext("2d");
    const bgCouleur = couleurImageKMeans(pixelData, w, h);
    ctx.fillStyle = `rgb(${bgCouleur[0]},${bgCouleur[1]},${bgCouleur[2]})`;
    ctx.fillRect(0, 0, w, h);

    let cote = entierSecurise(state.side, 30, 1);
    const coteDemande = cote;
    const coteMin = coteSuretePourImage(w, h, state.method);
    if (cote < coteMin) cote = coteMin;
    const { nTuiles, methodeUtilisee } = genererTuilesAvecRepli(w, h, cote, state.method);
    if (cote !== coteDemande) {
      status.textContent = `Taille ajustee a ${cote}px (limite du mode ${state.method}).`;
    }
    if (cote !== state.side) {
      state.side = cote;
      const tileSizeEl = document.getElementById("tile-size");
      if (tileSizeEl) tileSizeEl.value = String(cote);
      const tileSizeDisp = document.getElementById("tile-size-display");
      if (tileSizeDisp) tileSizeDisp.textContent = String(cote);
    }
    const indices = Array.from({ length: nTuiles }, (_, i) => i);
    indices.sort((a, b) => lireNombreSommetsTuile(a) - lireNombreSommetsTuile(b));

    const cssContour = couleurContourCss();
    let tuilesInvalides = 0;
    for (const ti of indices) {
      let sommets = null;
      try {
        sommets = lireSommetsTuile(ti);
      } catch (err) {
        tuilesInvalides++;
        console.warn(`[pixel2polygon] Tuile ${ti} ignoree :`, err);
        continue;
      }
      if (!sommets) {
        tuilesInvalides++;
        continue;
      }
      const couleur = couleurTuile(pixelData, w, h, sommets);
      if (couleur) dessinerTuile(ctx, sommets, couleur, state.outlineWidth, cssContour);
    }

    const libelleMode = `mode ${methodeUtilisee}`;
    status.textContent = tuilesInvalides > 0
      ? `Rendu termine : ${nTuiles - tuilesInvalides}/${nTuiles} tuiles valides pour le ${libelleMode}.`
      : `Rendu termine : ${nTuiles} tuiles pour le ${libelleMode}.`;
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
