// ──────────────────────────────────────────────────────────────
//  Pixel2Polygon  — app.js
//
//  Toute la geometrie des tuiles est calculee par le module WASM
//  compile depuis les sources multilingual francophones :
//    src/hexagonify_wasm.ml
//
//  L'application ne fonctionne pas sans ce binaire WASM.
//  Aucun calcul de geometrie n'est effectue en JavaScript pur.
// ──────────────────────────────────────────────────────────────

const MAX_DIM = 1200;

// ── Etat ───────────────────────────────────────────────────────

const state = {
  method: "hex",
  side: 30,
  outlineWidth: 0,
  outlineColor: "#000000",
  outlineOpacity: 47,
  autoApply: false,
};

let wasm = null;
let loadedImage = null;

// ── Chargement WASM ────────────────────────────────────────────

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
      throw new Error("Les exports WASM ne correspondent pas a l'interface hexagonify_wasm.ml.");
    }

    wasm = instance.exports;
    status.textContent = "Moteur WASM charge depuis les sources multilingual francaises.";
    btnApply.disabled = false;
    document.getElementById("upload-zone").style.pointerEvents = "auto";
    document.getElementById("upload-zone").style.opacity = "1";
  } catch (err) {
    wasm = null;
    status.textContent = `WASM requis — compilez d'abord avec : multilingual run scripts/compile_wasm.ml`;
    btnApply.disabled = true;
    // Grey out the upload zone to signal the app is non-functional
    document.getElementById("upload-zone").style.opacity = "0.4";
    document.getElementById("upload-zone").style.pointerEvents = "none";
    console.error("[pixel2polygon] Echec du chargement WASM :", err);
  }
}

function construireImports(module) {
  const obj = {};
  for (const entry of WebAssembly.Module.imports(module)) {
    if (!obj[entry.module]) obj[entry.module] = {};
    if (entry.kind === "function")  obj[entry.module][entry.name] = () => 0;
    else if (entry.kind === "memory") obj[entry.module][entry.name] = new WebAssembly.Memory({ initial: 16 });
    else if (entry.kind === "table")  obj[entry.module][entry.name] = new WebAssembly.Table({ initial: 0, element: "anyfunc" });
    else if (entry.kind === "global") obj[entry.module][entry.name] = new WebAssembly.Global({ value: "i32", mutable: true }, 0);
  }
  if (!obj.env) obj.env = {};
  return obj;
}

function validerExports(exports) {
  // Noms francais issus de hexagonify_wasm.ml
  const requis = [
    "sommet_hex_x", "sommet_hex_y",
    "espacement_horiz", "espacement_vert",
    "hauteur_tri", "sommet_tri_x", "sommet_tri_y",
    "couleur_moyenne",
    "methode_hexagone", "methode_carre", "methode_triangle",
  ];
  for (const nom of requis) {
    if (typeof exports[nom] !== "function") return false;
  }
  // Verification numerique : espacement_horiz(10) doit valoir sqrt(3)*10 ≈ 17.3205
  try {
    const hs = Number(exports.espacement_horiz(10));
    if (Math.abs(hs - 17.320508) > 0.01) return false;
    // sommet_hex_x(0, 0, 10, 0) doit valoir 0
    const vx = Number(exports.sommet_hex_x(0, 0, 10, 0));
    if (Math.abs(vx) > 0.001) return false;
  } catch {
    return false;
  }
  return true;
}

// ── Appels WASM directs (noms francais de hexagonify_wasm.ml) ──

function sommet_hex_x(cx, cy, a, idx)     { return Number(wasm.sommet_hex_x(cx, cy, a, idx)); }
function sommet_hex_y(cx, cy, a, idx)     { return Number(wasm.sommet_hex_y(cx, cy, a, idx)); }
function espacement_horiz(a)              { return Number(wasm.espacement_horiz(a)); }
function espacement_vert(a)              { return Number(wasm.espacement_vert(a)); }
function hauteur_tri(a)                  { return Number(wasm.hauteur_tri(a)); }
function sommet_tri_x(x, a, idx, vh)     { return Number(wasm.sommet_tri_x(x, a, idx, vh)); }
function sommet_tri_y(y, a, idx, vh)     { return Number(wasm.sommet_tri_y(y, a, idx, vh)); }
function couleur_moyenne(total, compte)  { return Number(wasm.couleur_moyenne(total, compte)); }

// ── Generation des tuiles (miroir exact de hexagonify_wasm.ml) ─

function genererTuilesHex(larg, haut, a) {
  const hs = espacement_horiz(a);
  const vs = espacement_vert(a);

  const x_min = -hs,        x_max = larg + hs;
  const y_min = -2 * a,     y_max = haut + 2 * a;

  const tuiles = [];
  let rang = 0;
  let y = y_min;
  while (y <= y_max) {
    const decalage = (rang % 2) * (hs / 2);
    let x = x_min + decalage;
    while (x <= x_max) {
      const sommets = [];
      for (let i = 0; i < 6; i++) {
        sommets.push([sommet_hex_x(x, y, a, i), sommet_hex_y(x, y, a, i)]);
      }
      tuiles.push(sommets);
      x += hs;
    }
    rang++;
    y += vs;
  }
  return tuiles;
}

function genererTuilesCarres(larg, haut, a) {
  const tuiles = [];
  for (let x = 0; x < larg; x += a) {
    for (let y = 0; y < haut; y += a) {
      const x2 = Math.min(larg, x + a);
      const y2 = Math.min(haut, y + a);
      tuiles.push([[x, y], [x2, y], [x2, y2], [x, y2]]);
    }
  }
  return tuiles;
}

function genererTuilesTriangle(larg, haut, a) {
  const h = hauteur_tri(a);
  const cols = Math.ceil((larg + a * 2) / (a / 2)) + 2;
  const rangs = Math.ceil((haut + h * 2) / h) + 2;
  const x_debut = -a, y_debut = -h;
  const tuiles = [];

  for (let rang = 0; rang < rangs; rang++) {
    const y = y_debut + rang * h;
    for (let col = 0; col < cols; col++) {
      const x = x_debut + col * (a / 2);
      const vers_haut = (rang + col) % 2 === 0 ? 1 : 0;
      const sommets = [];
      for (let i = 0; i < 3; i++) {
        sommets.push([sommet_tri_x(x, a, i, vers_haut), sommet_tri_y(y, a, i, vers_haut)]);
      }
      tuiles.push(sommets);
    }
  }
  return tuiles;
}

// ── Point dans polygone (algorithme de lancer de rayon) ────────

function pointDansPolygone(px, py, sommets) {
  let dedans = false;
  const n = sommets.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = sommets[i][0], yi = sommets[i][1];
    const xj = sommets[j][0], yj = sommets[j][1];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      dedans = !dedans;
    }
  }
  return dedans;
}

// ── Couleur moyenne de la tuile ────────────────────────────────

function couleurTuile(pixels, larg, haut, sommets) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [vx, vy] of sommets) {
    if (vx < minX) minX = vx;
    if (vy < minY) minY = vy;
    if (vx > maxX) maxX = vx;
    if (vy > maxY) maxY = vy;
  }

  const x0 = Math.max(0, Math.floor(minX));
  const y0 = Math.max(0, Math.floor(minY));
  const x1 = Math.min(larg, Math.ceil(maxX));
  const y1 = Math.min(haut, Math.ceil(maxY));

  if (x1 <= x0 || y1 <= y0) return null;

  let rTot = 0, gTot = 0, bTot = 0, compte = 0;

  for (let py = y0; py < y1; py++) {
    for (let px = x0; px < x1; px++) {
      if (pointDansPolygone(px + 0.5, py + 0.5, sommets)) {
        const i = (py * larg + px) * 4;
        rTot += pixels[i];
        gTot += pixels[i + 1];
        bTot += pixels[i + 2];
        compte++;
      }
    }
  }

  if (compte === 0) return null;

  // couleur_moyenne vient du WASM (hexagonify_wasm.ml : couleur_moyenne)
  return [
    couleur_moyenne(rTot, compte),
    couleur_moyenne(gTot, compte),
    couleur_moyenne(bTot, compte),
  ];
}

// ── Rendu ──────────────────────────────────────────────────────

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
  const a = (state.outlineOpacity / 100).toFixed(3);
  return `rgba(${r},${g},${b},${a})`;
}

function dimensionsScalees(imgEl) {
  let W = imgEl.naturalWidth, H = imgEl.naturalHeight;
  if (W > MAX_DIM) { H = Math.round(H * MAX_DIM / W); W = MAX_DIM; }
  if (H > MAX_DIM) { W = Math.round(W * MAX_DIM / H); H = MAX_DIM; }
  return [W, H];
}

function afficherSource(imgEl) {
  const srcCanvas = document.getElementById("source-canvas");
  const [W, H] = dimensionsScalees(imgEl);
  srcCanvas.width = W;
  srcCanvas.height = H;
  srcCanvas.getContext("2d").drawImage(imgEl, 0, 0, W, H);
}

async function rendreSortie(imgEl) {
  const srcCanvas = document.getElementById("source-canvas");
  const outCanvas = document.getElementById("output-canvas");
  const overlay   = document.getElementById("processing-overlay");
  const btnDl     = document.getElementById("btn-download");

  overlay.hidden = false;
  btnDl.disabled = true;

  // Laisser le navigateur peindre l'indicateur de progression
  await new Promise((r) => setTimeout(r, 20));

  const W = srcCanvas.width;
  const H = srcCanvas.height;

  const pixelData = srcCanvas.getContext("2d").getImageData(0, 0, W, H).data;

  outCanvas.width  = W;
  outCanvas.height = H;
  const ctx = outCanvas.getContext("2d");
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, W, H);

  const cote      = state.side;
  const cssContour = couleurContourCss();

  let tuiles;
  if (state.method === "hex")      tuiles = genererTuilesHex(W, H, cote);
  else if (state.method === "square") tuiles = genererTuilesCarres(W, H, cote);
  else                               tuiles = genererTuilesTriangle(W, H, cote);

  for (const sommets of tuiles) {
    const couleur = couleurTuile(pixelData, W, H, sommets);
    if (couleur) dessinerTuile(ctx, sommets, couleur, state.outlineWidth, cssContour);
  }

  overlay.hidden = false;
  overlay.hidden = true;
  btnDl.disabled = false;
}

// ── Chargement image ───────────────────────────────────────────

function chargerImageDepuisFichier(fichier) {
  if (!fichier || !fichier.type.startsWith("image/")) return;
  const url = URL.createObjectURL(fichier);
  const img = new Image();
  img.onload = () => {
    loadedImage = img;
    URL.revokeObjectURL(url);
    afficherZoneCanvas();
    afficherSource(img);
    rendreSortie(img);
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
}

// ── Anti-rebond ────────────────────────────────────────────────

function debounce(fn, delai) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delai); };
}

const planifierRendu = debounce(() => {
  if (loadedImage && state.autoApply) rendreSortie(loadedImage);
}, 300);

// ── Liaison des controles ──────────────────────────────────────

function lierControles() {
  // Forme
  document.querySelectorAll('input[name="method"]').forEach((input) => {
    input.addEventListener("change", () => { state.method = input.value; planifierRendu(); });
  });

  // Taille de tuile
  const tileSizeEl = document.getElementById("tile-size");
  const tileSizeDisp = document.getElementById("tile-size-display");
  tileSizeEl.value = String(state.side);
  tileSizeDisp.textContent = String(state.side);
  tileSizeEl.addEventListener("input", () => {
    state.side = parseInt(tileSizeEl.value, 10);
    tileSizeDisp.textContent = String(state.side);
    planifierRendu();
  });

  // Contour — largeur
  const outWEl = document.getElementById("outline-width");
  const outWDisp = document.getElementById("outline-width-display");
  outWEl.value = String(state.outlineWidth);
  outWDisp.textContent = String(state.outlineWidth);
  outWEl.addEventListener("input", () => {
    state.outlineWidth = parseInt(outWEl.value, 10);
    outWDisp.textContent = String(state.outlineWidth);
    planifierRendu();
  });

  // Contour — couleur
  const outCEl = document.getElementById("outline-color");
  outCEl.value = state.outlineColor;
  outCEl.addEventListener("input", () => { state.outlineColor = outCEl.value; planifierRendu(); });

  // Contour — opacite
  const outOEl = document.getElementById("outline-opacity");
  const outODisp = document.getElementById("outline-opacity-display");
  outOEl.value = String(state.outlineOpacity);
  outODisp.textContent = String(state.outlineOpacity);
  outOEl.addEventListener("input", () => {
    state.outlineOpacity = parseInt(outOEl.value, 10);
    outODisp.textContent = String(state.outlineOpacity);
    planifierRendu();
  });

  // Rendu auto
  const autoEl = document.getElementById("auto-apply");
  autoEl.checked = state.autoApply;
  autoEl.addEventListener("change", () => { state.autoApply = autoEl.checked; });

  // Bouton Appliquer
  document.getElementById("btn-apply").addEventListener("click", () => {
    if (loadedImage) rendreSortie(loadedImage);
  });

  // Nouvelle image
  document.getElementById("btn-new-image").addEventListener("click", afficherZoneUpload);

  // Telechargement
  document.getElementById("btn-download").addEventListener("click", () => {
    const canvas = document.getElementById("output-canvas");
    const lien = document.createElement("a");
    lien.href = canvas.toDataURL("image/png");
    lien.download = `pixel2polygon-${state.method}-${state.side}px.png`;
    lien.click();
  });

  // Entree fichier
  const fileInput = document.getElementById("file-input");
  fileInput.addEventListener("change", () => {
    if (fileInput.files[0]) chargerImageDepuisFichier(fileInput.files[0]);
  });

  // Zone de depot — clic
  const uploadZone = document.getElementById("upload-zone");
  uploadZone.addEventListener("click", (e) => {
    if (e.target.tagName !== "LABEL") fileInput.click();
  });

  // Zone de depot — glisser-deposer
  uploadZone.addEventListener("dragover",  (e) => { e.preventDefault(); uploadZone.classList.add("dragover"); });
  uploadZone.addEventListener("dragleave", ()  => { uploadZone.classList.remove("dragover"); });
  uploadZone.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadZone.classList.remove("dragover");
    const fichier = e.dataTransfer.files[0];
    if (fichier) chargerImageDepuisFichier(fichier);
  });

  // Coller depuis le presse-papiers
  document.addEventListener("paste", (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith("image/")) { chargerImageDepuisFichier(item.getAsFile()); break; }
    }
  });
}

// ── Onglets ────────────────────────────────────────────────────

function basculerOnglet(nom) {
  const studio = nom === "studio";
  document.getElementById("studio-panel").hidden = !studio;
  document.getElementById("source-panel").hidden =  studio;
  document.getElementById("tab-studio").classList.toggle("active",  studio);
  document.getElementById("tab-source").classList.toggle("active", !studio);
}

// ── Initialisation ─────────────────────────────────────────────

async function init() {
  // Desactiver le bouton Appliquer jusqu'au chargement du WASM
  document.getElementById("btn-apply").disabled = true;

  lierControles();
  document.getElementById("tab-studio").addEventListener("click", () => basculerOnglet("studio"));
  document.getElementById("tab-source").addEventListener("click", () => basculerOnglet("source"));

  await chargerWasm();
}

init();
