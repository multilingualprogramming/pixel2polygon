const MAX_DIM = 1200;
const TAU = Math.PI * 2;

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
    status.textContent = "Moteur WASM charge. Les primitives de geometrie et la moyenne couleur sont disponibles.";
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
    "sommet_hex_x", "sommet_hex_y",
    "espacement_horiz", "espacement_vert",
    "hauteur_tri", "sommet_tri_x", "sommet_tri_y",
    "couleur_moyenne",
    "methode_hexagone", "methode_carre", "methode_triangle",
  ];
  for (const nom of requis) {
    if (typeof exports[nom] !== "function") return false;
  }
  try {
    const hs = Number(exports.espacement_horiz(10));
    if (Math.abs(hs - 17.320508) > 0.01) return false;
    const vx = Number(exports.sommet_hex_x(0, 0, 10, 0));
    if (Math.abs(vx) > 0.001) return false;
  } catch {
    return false;
  }
  return true;
}

function sommet_hex_x(cx, cy, a, idx) { return Number(wasm.sommet_hex_x(cx, cy, a, idx)); }
function sommet_hex_y(cx, cy, a, idx) { return Number(wasm.sommet_hex_y(cx, cy, a, idx)); }
function espacement_horiz(a) { return Number(wasm.espacement_horiz(a)); }
function espacement_vert(a) { return Number(wasm.espacement_vert(a)); }
function hauteur_tri(a) { return Number(wasm.hauteur_tri(a)); }
function sommet_tri_x(x, a, idx, vh) { return Number(wasm.sommet_tri_x(x, a, idx, vh)); }
function sommet_tri_y(y, a, idx, vh) { return Number(wasm.sommet_tri_y(y, a, idx, vh)); }
function couleur_moyenne(total, compte) { return Number(wasm.couleur_moyenne(total, compte)); }

function apothem(n, side) {
  return side / (2 * Math.tan(Math.PI / n));
}

function rayon(n, side) {
  return side / (2 * Math.sin(Math.PI / n));
}

function polygonCentre(sommets) {
  let x = 0;
  let y = 0;
  for (const [px, py] of sommets) {
    x += px;
    y += py;
  }
  return [x / sommets.length, y / sommets.length];
}

function clePolygone(sommets) {
  const [cx, cy] = polygonCentre(sommets);
  return `${sommets.length}:${cx.toFixed(2)}:${cy.toFixed(2)}`;
}

function boitePolygone(sommets) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of sommets) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}

function visibleDansCadre(sommets, larg, haut) {
  const box = boitePolygone(sommets);
  return box.maxX >= 0 && box.maxY >= 0 && box.minX <= larg && box.minY <= haut;
}

function polygoneRegulier(cx, cy, cote, cotes, rotation = -Math.PI / 2) {
  const r = rayon(cotes, cote);
  const points = [];
  for (let i = 0; i < cotes; i++) {
    const ang = rotation + (i * TAU) / cotes;
    points.push([cx + r * Math.cos(ang), cy + r * Math.sin(ang)]);
  }
  return points;
}

function triangleDepuisArete(a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  const len = Math.hypot(dx, dy) || 1;
  const h = Math.sqrt(3) * len / 2;
  const nx = dy / len;
  const ny = -dx / len;
  return [a, b, [mx + nx * h, my + ny * h]];
}

function genererTuilesHex(larg, haut, a) {
  const hs = espacement_horiz(a);
  const vs = espacement_vert(a);
  const tuiles = [];
  let rang = 0;
  for (let y = -2 * a; y <= haut + 2 * a; y += vs) {
    const decalage = (rang % 2) * (hs / 2);
    for (let x = -hs + decalage; x <= larg + hs; x += hs) {
      const sommets = [];
      for (let i = 0; i < 6; i++) {
        sommets.push([sommet_hex_x(x, y, a, i), sommet_hex_y(x, y, a, i)]);
      }
      tuiles.push(sommets);
    }
    rang++;
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
  const tuiles = [];
  for (let rang = 0; rang < rangs; rang++) {
    const y = -h + rang * h;
    for (let col = 0; col < cols; col++) {
      const x = -a + col * (a / 2);
      const versHaut = (rang + col) % 2 === 0 ? 1 : 0;
      const sommets = [];
      for (let i = 0; i < 3; i++) {
        sommets.push([sommet_tri_x(x, a, i, versHaut), sommet_tri_y(y, a, i, versHaut)]);
      }
      tuiles.push(sommets);
    }
  }
  return tuiles;
}

function genererDepuisCollection(larg, haut, build) {
  const tuiles = [];
  const vus = new Set();
  const ajouter = (poly) => {
    if (!visibleDansCadre(poly, larg, haut)) return;
    const key = clePolygone(poly);
    if (vus.has(key)) return;
    vus.add(key);
    tuiles.push(poly);
  };
  build(ajouter);
  return tuiles;
}

function genererTrihex(larg, haut, a) {
  const pasX = 2 * (apothem(6, a) + apothem(3, a));
  const pasY = Math.sqrt(3) * (apothem(6, a) + apothem(3, a));
  return genererDepuisCollection(larg, haut, (ajouter) => {
    let rang = 0;
    for (let y = -pasY; y <= haut + pasY; y += pasY) {
      const decal = (rang % 2) * (pasX / 2);
      for (let x = -pasX + decal; x <= larg + pasX; x += pasX) {
        const hex = polygoneRegulier(x, y, a, 6, -Math.PI / 2);
        ajouter(hex);
        for (let i = 0; i < hex.length; i++) {
          ajouter(triangleDepuisArete(hex[i], hex[(i + 1) % hex.length]));
        }
      }
      rang++;
    }
  });
}

function genererSnubTrihex(larg, haut, a) {
  const base = genererTrihex(larg, haut, a * 0.82);
  const triangles = genererTuilesTriangle(larg, haut, a * 0.72);
  return base.concat(triangles.filter((poly, index) => index % 3 === 0));
}

function genererElongatedTriangular(larg, haut, a) {
  const h = Math.sqrt(3) * a / 2;
  return genererDepuisCollection(larg, haut, (ajouter) => {
    let rang = 0;
    for (let y = -h; y <= haut + h; y += a + h) {
      const decal = (rang % 2) * (a / 2);
      for (let x = -a + decal; x <= larg + a; x += a) {
        ajouter([[x, y + h], [x + a, y + h], [x + a, y + h + a], [x, y + h + a]]);
        ajouter([[x, y + h], [x + a / 2, y], [x + a, y + h]]);
        ajouter([[x, y + h + a], [x + a / 2, y + h + a + h], [x + a, y + h + a]]);
      }
      rang++;
    }
  });
}

function genererSnubSquare(larg, haut, a) {
  const pas = a * (1 + Math.sqrt(3));
  return genererDepuisCollection(larg, haut, (ajouter) => {
    for (let y = -pas; y <= haut + pas; y += pas) {
      for (let x = -pas; x <= larg + pas; x += pas) {
        const carre = polygoneRegulier(x, y, a, 4, Math.PI / 4);
        ajouter(carre);
        for (let i = 0; i < 4; i++) {
          const p1 = carre[i];
          const p2 = carre[(i + 1) % 4];
          ajouter(triangleDepuisArete(p1, p2));
          const p3 = carre[(i + 2) % 4];
          ajouter([p2, p3, [(p2[0] + p3[0]) / 2, (p2[1] + p3[1]) / 2 + (i % 2 === 0 ? a * 0.55 : -a * 0.55)]]);
        }
      }
    }
  });
}

function genererRhombitrihex(larg, haut, a) {
  const pasX = 2 * (apothem(6, a) + apothem(4, a));
  const pasY = Math.sqrt(3) * (apothem(6, a) + apothem(4, a));
  return genererDepuisCollection(larg, haut, (ajouter) => {
    let rang = 0;
    for (let y = -pasY; y <= haut + pasY; y += pasY) {
      const decal = (rang % 2) * (pasX / 2);
      for (let x = -pasX + decal; x <= larg + pasX; x += pasX) {
        const hex = polygoneRegulier(x, y, a, 6, -Math.PI / 2);
        ajouter(hex);
        for (let i = 0; i < hex.length; i++) {
          const a1 = hex[i];
          const a2 = hex[(i + 1) % hex.length];
          const mx = (a1[0] + a2[0]) / 2;
          const my = (a1[1] + a2[1]) / 2;
          const dx = a2[0] - a1[0];
          const dy = a2[1] - a1[1];
          const len = Math.hypot(dx, dy) || 1;
          const nx = dy / len;
          const ny = -dx / len;
          const cx = mx + nx * apothem(4, a);
          const cy = my + ny * apothem(4, a);
          ajouter(polygoneRegulier(cx, cy, a, 4, Math.atan2(dy, dx)));
          ajouter(triangleDepuisArete(a1, a2));
        }
      }
      rang++;
    }
  });
}

function genererTruncatedSquare(larg, haut, a) {
  const pas = 2 * apothem(8, a) + a;
  return genererDepuisCollection(larg, haut, (ajouter) => {
    for (let y = -pas; y <= haut + pas; y += pas) {
      for (let x = -pas; x <= larg + pas; x += pas) {
        const oct = polygoneRegulier(x, y, a, 8, Math.PI / 8);
        ajouter(oct);
        ajouter(polygoneRegulier(x + pas / 2, y + pas / 2, a, 4, Math.PI / 4));
      }
    }
  });
}

function genererGreatRhombitrihex(larg, haut, a) {
  const pasX = 2 * (apothem(12, a) + apothem(6, a) + apothem(4, a));
  const pasY = Math.sqrt(3) * (apothem(12, a) + apothem(6, a) + apothem(4, a));
  return genererDepuisCollection(larg, haut, (ajouter) => {
    let rang = 0;
    for (let y = -pasY; y <= haut + pasY; y += pasY) {
      const decal = (rang % 2) * (pasX / 2);
      for (let x = -pasX + decal; x <= larg + pasX; x += pasX) {
        const dodec = polygoneRegulier(x, y, a, 12, Math.PI / 12);
        ajouter(dodec);
        for (let i = 0; i < dodec.length; i++) {
          const p1 = dodec[i];
          const p2 = dodec[(i + 1) % dodec.length];
          const mx = (p1[0] + p2[0]) / 2;
          const my = (p1[1] + p2[1]) / 2;
          const dx = p2[0] - p1[0];
          const dy = p2[1] - p1[1];
          const len = Math.hypot(dx, dy) || 1;
          const nx = dy / len;
          const ny = -dx / len;
          if (i % 2 === 0) {
            const cx = mx + nx * apothem(6, a);
            const cy = my + ny * apothem(6, a);
            ajouter(polygoneRegulier(cx, cy, a, 6, -Math.PI / 2));
          } else {
            const cx = mx + nx * apothem(4, a);
            const cy = my + ny * apothem(4, a);
            ajouter(polygoneRegulier(cx, cy, a, 4, Math.atan2(dy, dx)));
          }
        }
      }
      rang++;
    }
  });
}

function genererTruncatedHex(larg, haut, a) {
  const pasX = 2 * apothem(12, a);
  const pasY = Math.sqrt(3) * apothem(12, a);
  return genererDepuisCollection(larg, haut, (ajouter) => {
    let rang = 0;
    for (let y = -pasY; y <= haut + pasY; y += pasY) {
      const decal = (rang % 2) * (pasX / 2);
      for (let x = -pasX + decal; x <= larg + pasX; x += pasX) {
        const dodec = polygoneRegulier(x, y, a, 12, Math.PI / 12);
        ajouter(dodec);
        for (let i = 0; i < dodec.length; i += 2) {
          ajouter(triangleDepuisArete(dodec[i], dodec[(i + 1) % dodec.length]));
        }
      }
      rang++;
    }
  });
}

function genererTuiles(larg, haut, a, methode) {
  if (methode === "hex") return genererTuilesHex(larg, haut, a);
  if (methode === "square") return genererTuilesCarres(larg, haut, a);
  if (methode === "triangle") return genererTuilesTriangle(larg, haut, a);
  if (methode === "trihex") return genererTrihex(larg, haut, a);
  if (methode === "snub_trihex") return genererSnubTrihex(larg, haut, a);
  if (methode === "triangulaire_elongue") return genererElongatedTriangular(larg, haut, a);
  if (methode === "carre_snub") return genererSnubSquare(larg, haut, a);
  if (methode === "rhombitrihex") return genererRhombitrihex(larg, haut, a);
  if (methode === "carre_tronque") return genererTruncatedSquare(larg, haut, a);
  if (methode === "grand_rhombitrihex") return genererGreatRhombitrihex(larg, haut, a);
  if (methode === "hex_tronque") return genererTruncatedHex(larg, haut, a);
  return genererTuilesHex(larg, haut, a);
}

function pointDansPolygone(px, py, sommets) {
  let dedans = false;
  const n = sommets.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = sommets[i][0];
    const yi = sommets[i][1];
    const xj = sommets[j][0];
    const yj = sommets[j][1];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      dedans = !dedans;
    }
  }
  return dedans;
}

function couleurTuile(pixels, larg, haut, sommets) {
  const box = boitePolygone(sommets);
  const x0 = Math.max(0, Math.floor(box.minX));
  const y0 = Math.max(0, Math.floor(box.minY));
  const x1 = Math.min(larg, Math.ceil(box.maxX));
  const y1 = Math.min(haut, Math.ceil(box.maxY));
  if (x1 <= x0 || y1 <= y0) return null;

  let rTot = 0;
  let gTot = 0;
  let bTot = 0;
  let compte = 0;

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

  if (compte === 0) {
    const cx = Math.min(larg - 1, Math.max(0, Math.round((box.minX + box.maxX) / 2)));
    const cy = Math.min(haut - 1, Math.max(0, Math.round((box.minY + box.maxY) / 2)));
    const i = (cy * larg + cx) * 4;
    return [pixels[i], pixels[i + 1], pixels[i + 2]];
  }
  return [
    couleur_moyenne(rTot, compte),
    couleur_moyenne(gTot, compte),
    couleur_moyenne(bTot, compte),
  ];
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
  const a = (state.outlineOpacity / 100).toFixed(3);
  return `rgba(${r},${g},${b},${a})`;
}

function dimensionsScalees(imgEl) {
  let w = imgEl.naturalWidth;
  let h = imgEl.naturalHeight;
  if (w > MAX_DIM) {
    h = Math.round(h * MAX_DIM / w);
    w = MAX_DIM;
  }
  if (h > MAX_DIM) {
    w = Math.round(w * MAX_DIM / h);
    h = MAX_DIM;
  }
  return [w, h];
}

function afficherSource(imgEl) {
  const srcCanvas = document.getElementById("source-canvas");
  const [w, h] = dimensionsScalees(imgEl);
  srcCanvas.width = w;
  srcCanvas.height = h;
  srcCanvas.getContext("2d").drawImage(imgEl, 0, 0, w, h);
}

async function rendreSortie(imgEl) {
  const srcCanvas = document.getElementById("source-canvas");
  const outCanvas = document.getElementById("output-canvas");
  const btnDl = document.getElementById("btn-download");
  const status = document.getElementById("wasm-status");
  const token = ++renderToken;

  afficherOverlay(true);
  btnDl.disabled = true;

  try {
    await new Promise((resolve) => setTimeout(resolve, 20));

    const w = srcCanvas.width;
    const h = srcCanvas.height;
    const pixelData = srcCanvas.getContext("2d").getImageData(0, 0, w, h).data;

    outCanvas.width = w;
    outCanvas.height = h;
    const ctx = outCanvas.getContext("2d");
    ctx.drawImage(srcCanvas, 0, 0);

    const tuiles = genererTuiles(w, h, state.side, state.method);
    const cssContour = couleurContourCss();
    tuiles.sort((a, b) => a.length - b.length);

    for (const sommets of tuiles) {
      const couleur = couleurTuile(pixelData, w, h, sommets);
      if (couleur) dessinerTuile(ctx, sommets, couleur, state.outlineWidth, cssContour);
    }

    status.textContent = `Rendu termine : ${tuiles.length} tuiles pour le mode ${state.method}.`;
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
  afficherOverlay(false);
}

function debounce(fn, delai) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delai);
  };
}

const planifierRendu = debounce(() => {
  if (loadedImage && state.autoApply) rendreSortie(loadedImage);
}, 300);

function lierControles() {
  const methodSelect = document.getElementById("method-select");
  methodSelect.value = state.method;
  methodSelect.addEventListener("change", () => {
    state.method = methodSelect.value;
    if (loadedImage) rendreSortie(loadedImage);
  });

  const tileSizeEl = document.getElementById("tile-size");
  const tileSizeDisp = document.getElementById("tile-size-display");
  tileSizeEl.value = String(state.side);
  tileSizeDisp.textContent = String(state.side);
  tileSizeEl.addEventListener("input", () => {
    state.side = parseInt(tileSizeEl.value, 10);
    tileSizeDisp.textContent = String(state.side);
    planifierRendu();
  });

  const outWEl = document.getElementById("outline-width");
  const outWDisp = document.getElementById("outline-width-display");
  outWEl.value = String(state.outlineWidth);
  outWDisp.textContent = String(state.outlineWidth);
  outWEl.addEventListener("input", () => {
    state.outlineWidth = parseInt(outWEl.value, 10);
    outWDisp.textContent = String(state.outlineWidth);
    planifierRendu();
  });

  const outCEl = document.getElementById("outline-color");
  outCEl.value = state.outlineColor;
  outCEl.addEventListener("input", () => {
    state.outlineColor = outCEl.value;
    planifierRendu();
  });

  const outOEl = document.getElementById("outline-opacity");
  const outODisp = document.getElementById("outline-opacity-display");
  outOEl.value = String(state.outlineOpacity);
  outODisp.textContent = String(state.outlineOpacity);
  outOEl.addEventListener("input", () => {
    state.outlineOpacity = parseInt(outOEl.value, 10);
    outODisp.textContent = String(state.outlineOpacity);
    planifierRendu();
  });

  const autoEl = document.getElementById("auto-apply");
  autoEl.checked = state.autoApply;
  autoEl.addEventListener("change", () => {
    state.autoApply = autoEl.checked;
  });

  document.getElementById("btn-apply").addEventListener("click", () => {
    if (loadedImage) rendreSortie(loadedImage);
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
  uploadZone.addEventListener("click", (e) => {
    if (e.target.tagName !== "LABEL") fileInput.click();
  });
  uploadZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadZone.classList.add("dragover");
  });
  uploadZone.addEventListener("dragleave", () => {
    uploadZone.classList.remove("dragover");
  });
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
      if (item.type.startsWith("image/")) {
        chargerImageDepuisFichier(item.getAsFile());
        break;
      }
    }
  });
}

function basculerOnglet(nom) {
  const studio = nom === "studio";
  document.getElementById("studio-panel").hidden = !studio;
  document.getElementById("source-panel").hidden = studio;
  document.getElementById("tab-studio").classList.toggle("active", studio);
  document.getElementById("tab-source").classList.toggle("active", !studio);
}

async function init() {
  const btnApply = document.getElementById("btn-apply");
  if (btnApply) btnApply.disabled = true;

  const tabStudio = document.getElementById("tab-studio");
  const tabSource = document.getElementById("tab-source");
  if (tabStudio) tabStudio.addEventListener("click", () => basculerOnglet("studio"));
  if (tabSource) tabSource.addEventListener("click", () => basculerOnglet("source"));
  basculerOnglet("studio");

  try {
    lierControles();
  } catch (err) {
    console.error("[pixel2polygon] Echec de liaison des controles :", err);
  }

  try {
    await chargerWasm();
  } catch (err) {
    console.error("[pixel2polygon] Echec d'initialisation WASM :", err);
  }
}

init();
