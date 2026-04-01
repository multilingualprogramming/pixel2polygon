importer math


def rayon_carre(a):
    retour a / math.sqrt(2.0)


def sommet_carre_pointe_x(cx, cy, a, idx):
    r = rayon_carre(a)
    si idx == 0:
        retour cx + 0.0
    si idx == 1:
        retour cx + r
    si idx == 2:
        retour cx + 0.0
    retour cx - r


def sommet_carre_pointe_y(cx, cy, a, idx):
    r = rayon_carre(a)
    si idx == 0:
        retour cy - r
    si idx == 1:
        retour cy + 0.0
    si idx == 2:
        retour cy + r
    retour cy + 0.0


def apotheme_oct(a):
    retour a / (2.0 * (math.sqrt(2.0) - 1.0))


def sommet_oct_x(cx, cy, a, idx):
    ap = apotheme_oct(a)
    h = a / 2.0
    si idx == 0:
        retour cx + ap
    si idx == 1:
        retour cx + h
    si idx == 2:
        retour cx - h
    si idx == 3:
        retour cx - ap
    si idx == 4:
        retour cx - ap
    si idx == 5:
        retour cx - h
    si idx == 6:
        retour cx + h
    retour cx + ap


def sommet_oct_y(cx, cy, a, idx):
    ap = apotheme_oct(a)
    h = a / 2.0
    si idx == 0:
        retour cy - h
    si idx == 1:
        retour cy - ap
    si idx == 2:
        retour cy - ap
    si idx == 3:
        retour cy - h
    si idx == 4:
        retour cy + h
    si idx == 5:
        retour cy + ap
    si idx == 6:
        retour cy + ap
    retour cy + h


def rayon_dodec(a):
    retour (2.0 * a) / (math.sqrt(6.0) - math.sqrt(2.0))


def apotheme_dodec(a):
    retour a * (2.0 + math.sqrt(3.0)) / 2.0


def diag_dodec(a):
    retour rayon_dodec(a) / math.sqrt(2.0)


def sommet_dodec_x(cx, cy, a, idx):
    ap = apotheme_dodec(a)
    d = diag_dodec(a)
    h = a / 2.0
    si idx == 0:
        retour cx + ap
    si idx == 1:
        retour cx + d
    si idx == 2:
        retour cx + h
    si idx == 3:
        retour cx - h
    si idx == 4:
        retour cx - d
    si idx == 5:
        retour cx - ap
    si idx == 6:
        retour cx - ap
    si idx == 7:
        retour cx - d
    si idx == 8:
        retour cx - h
    si idx == 9:
        retour cx + h
    si idx == 10:
        retour cx + d
    retour cx + ap


def sommet_dodec_y(cx, cy, a, idx):
    ap = apotheme_dodec(a)
    d = diag_dodec(a)
    h = a / 2.0
    si idx == 0:
        retour cy - h
    si idx == 1:
        retour cy - d
    si idx == 2:
        retour cy - ap
    si idx == 3:
        retour cy - ap
    si idx == 4:
        retour cy - d
    si idx == 5:
        retour cy - h
    si idx == 6:
        retour cy + h
    si idx == 7:
        retour cy + d
    si idx == 8:
        retour cy + ap
    si idx == 9:
        retour cy + ap
    si idx == 10:
        retour cy + d
    retour cy + h

# Module WASM-compatible pour le carrelage d'images.
# Exporte les primitives geometriques et les generateurs de tuiles
# utilises par l'interface JavaScript.


# ── Hexagone (sommet pointu en haut) ──────────────────────────

def sommet_hex_x(cx, cy, a, idx):
    s3 = math.sqrt(3.0)
    r = a
    si idx == 0:
        retour cx + 0.0
    si idx == 1:
        retour cx + (s3 / 2.0) * r
    si idx == 2:
        retour cx + (s3 / 2.0) * r
    si idx == 3:
        retour cx + 0.0
    si idx == 4:
        retour cx - (s3 / 2.0) * r
    retour cx - (s3 / 2.0) * r


def sommet_hex_y(cx, cy, a, idx):
    r = a
    si idx == 0:
        retour cy - r
    si idx == 1:
        retour cy - r / 2.0
    si idx == 2:
        retour cy + r / 2.0
    si idx == 3:
        retour cy + r
    si idx == 4:
        retour cy + r / 2.0
    retour cy - r / 2.0


def espacement_horiz(a):
    retour math.sqrt(3.0) * a


def espacement_vert(a):
    retour 1.5 * a


# ── Triangle equilateral ──────────────────────────────────────

def hauteur_tri(a):
    retour a * math.sqrt(3.0) / 2.0


def sommet_tri_x(x, a, idx, vers_haut):
    si vers_haut == 1:
        si idx == 0:
            retour x
        si idx == 1:
            retour x + a / 2.0
        retour x + a
    si idx == 0:
        retour x
    si idx == 1:
        retour x + a
    retour x + a / 2.0


def sommet_tri_y(y, a, idx, vers_haut):
    h = a * math.sqrt(3.0) / 2.0
    si vers_haut == 1:
        si idx == 0:
            retour y + h
        si idx == 1:
            retour y
        retour y + h
    si idx == 0:
        retour y
    si idx == 1:
        retour y
    retour y + h


# ── Couleur ───────────────────────────────────────────────────

def couleur_moyenne(total, compte):
    si compte == 0:
        retour 0
    retour entier(arrondir(total / compte))


# ── Geometrie avancee ─────────────────────────────────────────

def apotheme(n, cote):
    retour cote / (2.0 * math.tan(math.pi / n))


def rayon(n, cote):
    retour cote / (2.0 * math.sin(math.pi / n))


def polygone_x(cx, cy, cote, n, rotation, i):
    r = rayon(n, cote)
    angle = rotation + (2.0 * math.pi * i) / n
    retour cx + r * math.cos(angle)


def polygone_y(cx, cy, cote, n, rotation, i):
    r = rayon(n, cote)
    angle = rotation + (2.0 * math.pi * i) / n
    retour cy + r * math.sin(angle)


def tri_arete_x3(x1, y1, x2, y2):
    dx = x2 - x1
    dy = y2 - y1
    lon = math.sqrt(dx * dx + dy * dy)
    si lon == 0:
        retour (x1 + x2) / 2.0
    h = math.sqrt(3.0) * lon / 2.0
    nx = -dy / lon
    retour (x1 + x2) / 2.0 + nx * h


def tri_arete_y3(x1, y1, x2, y2):
    dx = x2 - x1
    dy = y2 - y1
    lon = math.sqrt(dx * dx + dy * dy)
    si lon == 0:
        retour (y1 + y2) / 2.0
    h = math.sqrt(3.0) * lon / 2.0
    ny = dx / lon
    retour (y1 + y2) / 2.0 + ny * h


# ── K-means (couleur representative) ─────────────────────────

_km_r = []
_km_g = []
_km_b = []
_km_k = 3
_km_res_r = 0
_km_res_g = 0
_km_res_b = 0


def km_init(k):
    global _km_r, _km_g, _km_b, _km_k, _km_res_r, _km_res_g, _km_res_b
    _km_r = []
    _km_g = []
    _km_b = []
    _km_k = entier(k)
    _km_res_r = 0
    _km_res_g = 0
    _km_res_b = 0
    retour 0


def km_ajouter(r, g, b):
    global _km_r, _km_g, _km_b
    _km_r.append(r)
    _km_g.append(g)
    _km_b.append(b)
    retour 0


def _dist2(r1, g1, b1, r2, g2, b2):
    soit dr = r1 - r2
    soit dg = g1 - g2
    soit db = b1 - b2
    retour dr * dr + dg * dg + db * db


def km_calculer(max_iter):
    global _km_res_r, _km_res_g, _km_res_b, _km_k, _km_r, _km_g, _km_b
    n = len(_km_r)
    si n == 0:
        retour 0
    k = min(_km_k, n)
    si k <= 0:
        retour 0
    soit c_r = [_km_r[min(n - 1, i * n // k)] pour i dans range(k)]
    soit c_g = [_km_g[min(n - 1, i * n // k)] pour i dans range(k)]
    soit c_b = [_km_b[min(n - 1, i * n // k)] pour i dans range(k)]
    soit labels = [0 pour _ dans range(n)]
    pour _ dans range(entier(max_iter)):
        soit change = 0
        pour i dans range(n):
            soit min_d = _dist2(_km_r[i], _km_g[i], _km_b[i], c_r[0], c_g[0], c_b[0])
            soit best = 0
            pour c dans range(1, k):
                soit d = _dist2(_km_r[i], _km_g[i], _km_b[i], c_r[c], c_g[c], c_b[c])
                si d < min_d:
                    min_d = d
                    best = c
            si labels[i] != best:
                labels[i] = best
                change = 1
        pour c dans range(k):
            soit sr = 0.0
            soit sg = 0.0
            soit sb = 0.0
            soit cnt = 0
            pour i dans range(n):
                si labels[i] == c:
                    sr = sr + _km_r[i]
                    sg = sg + _km_g[i]
                    sb = sb + _km_b[i]
                    cnt = cnt + 1
            si cnt > 0:
                c_r[c] = sr / cnt
                c_g[c] = sg / cnt
                c_b[c] = sb / cnt
    soit comptes = [0 pour _ dans range(k)]
    pour i dans range(n):
        comptes[labels[i]] = comptes[labels[i]] + 1
    soit dominant = 0
    pour c dans range(1, k):
        si comptes[c] > comptes[dominant]:
            dominant = c
    _km_res_r = entier(arrondir(c_r[dominant]))
    _km_res_g = entier(arrondir(c_g[dominant]))
    _km_res_b = entier(arrondir(c_b[dominant]))
    retour 0


def km_r():
    retour _km_res_r


def km_g():
    retour _km_res_g


def km_b():
    retour _km_res_b


# ── Stockage global des tuiles ────────────────────────────────

_tuiles_xs = []
_tuiles_ys = []
_tuiles_off = []
_tuiles_n = []
_vus_n = []
_vus_cx = []
_vus_cy = []
_methode_active = 0
_gen_larg = 0.0
_gen_haut = 0.0
_gen_a = 0.0
_compte_tuiles = 0
_cible_tuile = 2147483647
_cache_trouve = 0
_cache_n = 0
_cache_xs = []
_cache_ys = []
_cache_actif = 0
_cache_x0 = 0.0
_cache_y0 = 0.0
_cache_x1 = 0.0
_cache_y1 = 0.0
_cache_x2 = 0.0
_cache_y2 = 0.0
_cache_x3 = 0.0
_cache_y3 = 0.0
_cache_x4 = 0.0
_cache_y4 = 0.0
_cache_x5 = 0.0
_cache_y5 = 0.0
_cache_x6 = 0.0
_cache_y6 = 0.0
_cache_x7 = 0.0
_cache_y7 = 0.0
_cache_x8 = 0.0
_cache_y8 = 0.0
_cache_x9 = 0.0
_cache_y9 = 0.0
_cache_x10 = 0.0
_cache_y10 = 0.0
_cache_x11 = 0.0
_cache_y11 = 0.0


def _coord_vers_entier(valeur):
    si valeur != valeur:
        retour 0
    retour entier(arrondir(valeur * 100.0))


def _tuiles_reinit():
    global _tuiles_xs, _tuiles_ys, _tuiles_off, _tuiles_n
    global _vus_n, _vus_cx, _vus_cy
    global _compte_tuiles, _cible_tuile, _cache_trouve, _cache_n, _cache_xs, _cache_ys, _cache_actif
    global _cache_x0, _cache_y0, _cache_x1, _cache_y1, _cache_x2, _cache_y2, _cache_x3, _cache_y3, _cache_x4, _cache_y4, _cache_x5, _cache_y5, _cache_x6, _cache_y6, _cache_x7, _cache_y7, _cache_x8, _cache_y8, _cache_x9, _cache_y9, _cache_x10, _cache_y10, _cache_x11, _cache_y11
    _tuiles_xs = []
    _tuiles_ys = []
    _tuiles_off = []
    _tuiles_n = []
    _vus_n = []
    _vus_cx = []
    _vus_cy = []
    _compte_tuiles = 0
    _cible_tuile = 2147483647
    _cache_trouve = 0
    _cache_n = 0
    _cache_xs = []
    _cache_ys = []
    _cache_actif = 0
    _cache_x0 = 0.0
    _cache_y0 = 0.0
    _cache_x1 = 0.0
    _cache_y1 = 0.0
    _cache_x2 = 0.0
    _cache_y2 = 0.0
    _cache_x3 = 0.0
    _cache_y3 = 0.0
    _cache_x4 = 0.0
    _cache_y4 = 0.0
    _cache_x5 = 0.0
    _cache_y5 = 0.0
    _cache_x6 = 0.0
    _cache_y6 = 0.0
    _cache_x7 = 0.0
    _cache_y7 = 0.0
    _cache_x8 = 0.0
    _cache_y8 = 0.0
    _cache_x9 = 0.0
    _cache_y9 = 0.0
    _cache_x10 = 0.0
    _cache_y10 = 0.0
    _cache_x11 = 0.0
    _cache_y11 = 0.0
    retour 0


def _ecrire_cache(n, x0=0.0, y0=0.0, x1=0.0, y1=0.0, x2=0.0, y2=0.0, x3=0.0, y3=0.0, x4=0.0, y4=0.0, x5=0.0, y5=0.0, x6=0.0, y6=0.0, x7=0.0, y7=0.0, x8=0.0, y8=0.0, x9=0.0, y9=0.0, x10=0.0, y10=0.0, x11=0.0, y11=0.0):
    global _cache_trouve, _cache_n, _cache_xs, _cache_ys
    global _cache_x0, _cache_y0, _cache_x1, _cache_y1, _cache_x2, _cache_y2, _cache_x3, _cache_y3, _cache_x4, _cache_y4, _cache_x5, _cache_y5, _cache_x6, _cache_y6, _cache_x7, _cache_y7, _cache_x8, _cache_y8, _cache_x9, _cache_y9, _cache_x10, _cache_y10, _cache_x11, _cache_y11
    _cache_trouve = 1
    _cache_n = n
    _cache_xs = []
    _cache_ys = []
    _cache_x0 = x0
    _cache_y0 = y0
    _cache_x1 = x1
    _cache_y1 = y1
    _cache_x2 = x2
    _cache_y2 = y2
    _cache_x3 = x3
    _cache_y3 = y3
    _cache_x4 = x4
    _cache_y4 = y4
    _cache_x5 = x5
    _cache_y5 = y5
    _cache_x6 = x6
    _cache_y6 = y6
    _cache_x7 = x7
    _cache_y7 = y7
    _cache_x8 = x8
    _cache_y8 = y8
    _cache_x9 = x9
    _cache_y9 = y9
    _cache_x10 = x10
    _cache_y10 = y10
    _cache_x11 = x11
    _cache_y11 = y11
    retour 1


def _lire_cache_x(j):
    si j == 0:
        retour _cache_x0
    si j == 1:
        retour _cache_x1
    si j == 2:
        retour _cache_x2
    si j == 3:
        retour _cache_x3
    si j == 4:
        retour _cache_x4
    si j == 5:
        retour _cache_x5
    si j == 6:
        retour _cache_x6
    si j == 7:
        retour _cache_x7
    si j == 8:
        retour _cache_x8
    si j == 9:
        retour _cache_x9
    si j == 10:
        retour _cache_x10
    retour _cache_x11


def _lire_cache_y(j):
    si j == 0:
        retour _cache_y0
    si j == 1:
        retour _cache_y1
    si j == 2:
        retour _cache_y2
    si j == 3:
        retour _cache_y3
    si j == 4:
        retour _cache_y4
    si j == 5:
        retour _cache_y5
    si j == 6:
        retour _cache_y6
    si j == 7:
        retour _cache_y7
    si j == 8:
        retour _cache_y8
    si j == 9:
        retour _cache_y9
    si j == 10:
        retour _cache_y10
    retour _cache_y11


def _hors_champ(min_x, max_x, min_y, max_y, larg, haut):
    si max_x < 0 ou max_y < 0 ou min_x > larg ou min_y > haut:
        retour 1
    retour 0


def _hex_visible(x, y, larg, haut, a):
    soit demi_larg = espacement_horiz(a) / 2.0
    soit min_x = x - demi_larg
    soit max_x = x + demi_larg
    soit min_y = y - a
    soit max_y = y + a
    retour 1 - _hors_champ(min_x, max_x, min_y, max_y, larg, haut)


def _compter_hex_visibles(larg, haut, a):
    soit hs = espacement_horiz(a)
    soit vs = espacement_vert(a)
    soit rangs = _nb_pas_inclusifs(-2.0 * a, haut + 2.0 * a, vs)
    soit cols = _nb_pas_inclusifs(-hs, larg + hs, hs)
    soit total = 0
    pour rang dans range(rangs):
        soit y = -2.0 * a + rang * vs
        soit decal = (rang % 2) * (hs / 2.0)
        pour col dans range(cols):
            soit x = -hs + decal + col * hs
            si _hex_visible(x, y, larg, haut, a) == 1:
                total = total + 1
    retour total


def _hex_centre_x_par_index(index, larg, haut, a):
    soit hs = espacement_horiz(a)
    soit vs = espacement_vert(a)
    soit rangs = _nb_pas_inclusifs(-2.0 * a, haut + 2.0 * a, vs)
    soit cols = _nb_pas_inclusifs(-hs, larg + hs, hs)
    soit courant = 0
    pour rang dans range(rangs):
        soit y = -2.0 * a + rang * vs
        soit decal = (rang % 2) * (hs / 2.0)
        pour col dans range(cols):
            soit x = -hs + decal + col * hs
            si _hex_visible(x, y, larg, haut, a) == 1:
                si courant == index:
                    retour x
                courant = courant + 1
    retour 0.0


def _hex_centre_y_par_index(index, larg, haut, a):
    soit hs = espacement_horiz(a)
    soit vs = espacement_vert(a)
    soit rangs = _nb_pas_inclusifs(-2.0 * a, haut + 2.0 * a, vs)
    soit cols = _nb_pas_inclusifs(-hs, larg + hs, hs)
    soit courant = 0
    pour rang dans range(rangs):
        soit y = -2.0 * a + rang * vs
        soit decal = (rang % 2) * (hs / 2.0)
        pour col dans range(cols):
            soit x = -hs + decal + col * hs
            si _hex_visible(x, y, larg, haut, a) == 1:
                si courant == index:
                    retour y
                courant = courant + 1
    retour 0.0


def _compter_carres(larg, haut, a):
    soit cols = entier(math.ceil(larg / a))
    soit rangs = entier(math.ceil(haut / a))
    retour cols * rangs


def _mettre_tuile_en_cache(n, x0, y0, x1, y1, x2, y2, x3=0.0, y3=0.0, x4=0.0, y4=0.0, x5=0.0, y5=0.0, x6=0.0, y6=0.0, x7=0.0, y7=0.0, x8=0.0, y8=0.0, x9=0.0, y9=0.0, x10=0.0, y10=0.0, x11=0.0, y11=0.0):
    retour _ecrire_cache(n, x0, y0, x1, y1, x2, y2, x3, y3, x4, y4, x5, y5, x6, y6, x7, y7, x8, y8, x9, y9, x10, y10, x11, y11)


def _ajouter_tuile_3_direct(x0, y0, x1, y1, x2, y2, larg, haut):
    global _compte_tuiles, _cible_tuile, _cache_actif
    soit min_x = min(min(x0, x1), x2)
    soit max_x = max(max(x0, x1), x2)
    soit min_y = min(min(y0, y1), y2)
    soit max_y = max(max(y0, y1), y2)
    si _hors_champ(min_x, max_x, min_y, max_y, larg, haut) == 1:
        retour 0
    si _cache_actif == 1 et _cible_tuile == _compte_tuiles:
        _ecrire_cache(3, x0, y0, x1, y1, x2, y2)
    _compte_tuiles = _compte_tuiles + 1
    retour 1


def _ajouter_tuile_4_direct(x0, y0, x1, y1, x2, y2, x3, y3, larg, haut):
    global _compte_tuiles, _cible_tuile, _cache_actif
    soit min_x = min(min(x0, x1), min(x2, x3))
    soit max_x = max(max(x0, x1), max(x2, x3))
    soit min_y = min(min(y0, y1), min(y2, y3))
    soit max_y = max(max(y0, y1), max(y2, y3))
    si _hors_champ(min_x, max_x, min_y, max_y, larg, haut) == 1:
        retour 0
    si _cache_actif == 1 et _cible_tuile == _compte_tuiles:
        _ecrire_cache(4, x0, y0, x1, y1, x2, y2, x3, y3)
    _compte_tuiles = _compte_tuiles + 1
    retour 1


def _ajouter_tuile_6_direct(x0, y0, x1, y1, x2, y2, x3, y3, x4, y4, x5, y5, larg, haut):
    global _compte_tuiles, _cible_tuile, _cache_actif
    soit min_x = min(min(min(x0, x1), min(x2, x3)), min(x4, x5))
    soit max_x = max(max(max(x0, x1), max(x2, x3)), max(x4, x5))
    soit min_y = min(min(min(y0, y1), min(y2, y3)), min(y4, y5))
    soit max_y = max(max(max(y0, y1), max(y2, y3)), max(y4, y5))
    si _hors_champ(min_x, max_x, min_y, max_y, larg, haut) == 1:
        retour 0
    si _cache_actif == 1 et _cible_tuile == _compte_tuiles:
        _ecrire_cache(6, x0, y0, x1, y1, x2, y2, x3, y3, x4, y4, x5, y5)
    _compte_tuiles = _compte_tuiles + 1
    retour 1


def _ajouter_tuile_8_direct(x0, y0, x1, y1, x2, y2, x3, y3, x4, y4, x5, y5, x6, y6, x7, y7, larg, haut):
    global _compte_tuiles, _cible_tuile, _cache_actif
    soit min_x = min(min(min(x0, x1), min(x2, x3)), min(min(x4, x5), min(x6, x7)))
    soit max_x = max(max(max(x0, x1), max(x2, x3)), max(max(x4, x5), max(x6, x7)))
    soit min_y = min(min(min(y0, y1), min(y2, y3)), min(min(y4, y5), min(y6, y7)))
    soit max_y = max(max(max(y0, y1), max(y2, y3)), max(max(y4, y5), max(y6, y7)))
    si _hors_champ(min_x, max_x, min_y, max_y, larg, haut) == 1:
        retour 0
    si _cache_actif == 1 et _cible_tuile == _compte_tuiles:
        _ecrire_cache(8, x0, y0, x1, y1, x2, y2, x3, y3, x4, y4, x5, y5, x6, y6, x7, y7)
    _compte_tuiles = _compte_tuiles + 1
    retour 1


def _ajouter_tuile_12_direct(x0, y0, x1, y1, x2, y2, x3, y3, x4, y4, x5, y5, x6, y6, x7, y7, x8, y8, x9, y9, x10, y10, x11, y11, larg, haut):
    global _compte_tuiles, _cible_tuile, _cache_actif
    soit min_x = min(min(min(x0, x1), min(x2, x3)), min(min(x4, x5), min(min(x6, x7), min(min(x8, x9), min(x10, x11)))))
    soit max_x = max(max(max(x0, x1), max(x2, x3)), max(max(x4, x5), max(max(x6, x7), max(max(x8, x9), max(x10, x11)))))
    soit min_y = min(min(min(y0, y1), min(y2, y3)), min(min(y4, y5), min(min(y6, y7), min(min(y8, y9), min(y10, y11)))))
    soit max_y = max(max(max(y0, y1), max(y2, y3)), max(max(y4, y5), max(max(y6, y7), max(max(y8, y9), max(y10, y11)))))
    si _hors_champ(min_x, max_x, min_y, max_y, larg, haut) == 1:
        retour 0
    si _cache_actif == 1 et _cible_tuile == _compte_tuiles:
        _ecrire_cache(12, x0, y0, x1, y1, x2, y2, x3, y3, x4, y4, x5, y5, x6, y6, x7, y7, x8, y8, x9, y9, x10, y10, x11, y11)
    _compte_tuiles = _compte_tuiles + 1
    retour 1


def _ajouter_tuile_4(x0, y0, x1, y1, x2, y2, x3, y3, larg, haut):
    soit min_x = min(min(x0, x1), min(x2, x3))
    soit max_x = max(max(x0, x1), max(x2, x3))
    soit min_y = min(min(y0, y1), min(y2, y3))
    soit max_y = max(max(y0, y1), max(y2, y3))
    si _hors_champ(min_x, max_x, min_y, max_y, larg, haut) == 1:
        retour 0
    _tuiles_off.append(len(_tuiles_xs))
    _tuiles_n.append(4)
    _tuiles_xs.append(_coord_vers_entier(x0))
    _tuiles_ys.append(_coord_vers_entier(y0))
    _tuiles_xs.append(_coord_vers_entier(x1))
    _tuiles_ys.append(_coord_vers_entier(y1))
    _tuiles_xs.append(_coord_vers_entier(x2))
    _tuiles_ys.append(_coord_vers_entier(y2))
    _tuiles_xs.append(_coord_vers_entier(x3))
    _tuiles_ys.append(_coord_vers_entier(y3))
    retour 1


def _ajouter_tuile_6(x0, y0, x1, y1, x2, y2, x3, y3, x4, y4, x5, y5, larg, haut):
    soit min_x = min(min(min(x0, x1), min(x2, x3)), min(x4, x5))
    soit max_x = max(max(max(x0, x1), max(x2, x3)), max(x4, x5))
    soit min_y = min(min(min(y0, y1), min(y2, y3)), min(y4, y5))
    soit max_y = max(max(max(y0, y1), max(y2, y3)), max(y4, y5))
    si _hors_champ(min_x, max_x, min_y, max_y, larg, haut) == 1:
        retour 0
    _tuiles_off.append(len(_tuiles_xs))
    _tuiles_n.append(6)
    _tuiles_xs.append(_coord_vers_entier(x0))
    _tuiles_ys.append(_coord_vers_entier(y0))
    _tuiles_xs.append(_coord_vers_entier(x1))
    _tuiles_ys.append(_coord_vers_entier(y1))
    _tuiles_xs.append(_coord_vers_entier(x2))
    _tuiles_ys.append(_coord_vers_entier(y2))
    _tuiles_xs.append(_coord_vers_entier(x3))
    _tuiles_ys.append(_coord_vers_entier(y3))
    _tuiles_xs.append(_coord_vers_entier(x4))
    _tuiles_ys.append(_coord_vers_entier(y4))
    _tuiles_xs.append(_coord_vers_entier(x5))
    _tuiles_ys.append(_coord_vers_entier(y5))
    retour 1



def _ajouter_poly(xs, ys, larg, haut):
    global _vus_n, _vus_cx, _vus_cy
    global _compte_tuiles, _cible_tuile, _cache_actif, _cache_trouve, _cache_n, _cache_xs, _cache_ys
    global _cache_x0, _cache_y0, _cache_x1, _cache_y1, _cache_x2, _cache_y2, _cache_x3, _cache_y3, _cache_x4, _cache_y4, _cache_x5, _cache_y5, _cache_x6, _cache_y6, _cache_x7, _cache_y7, _cache_x8, _cache_y8, _cache_x9, _cache_y9, _cache_x10, _cache_y10, _cache_x11, _cache_y11
    n = len(xs)
    si n == 0:
        retour 0
    min_x = xs[0]
    max_x = xs[0]
    min_y = ys[0]
    max_y = ys[0]
    pour i dans range(1, n):
        si xs[i] < min_x:
            min_x = xs[i]
        si xs[i] > max_x:
            max_x = xs[i]
        si ys[i] < min_y:
            min_y = ys[i]
        si ys[i] > max_y:
            max_y = ys[i]
    si max_x < 0 ou max_y < 0 ou min_x > larg ou min_y > haut:
        retour 0
    sx = 0.0
    sy = 0.0
    pour i dans range(n):
        sx = sx + xs[i]
        sy = sy + ys[i]
    cx = sx / n
    cy = sy / n
    si cx != cx ou cy != cy:
        retour 0
    si _cache_actif == 1 et _cible_tuile == _compte_tuiles:
        _cache_trouve = 1
        _cache_n = n
        _cache_xs = []
        _cache_ys = []
        _cache_x0 = 0.0
        _cache_y0 = 0.0
        _cache_x1 = 0.0
        _cache_y1 = 0.0
        _cache_x2 = 0.0
        _cache_y2 = 0.0
        _cache_x3 = 0.0
        _cache_y3 = 0.0
        _cache_x4 = 0.0
        _cache_y4 = 0.0
        _cache_x5 = 0.0
        _cache_y5 = 0.0
        _cache_x6 = 0.0
        _cache_y6 = 0.0
        _cache_x7 = 0.0
        _cache_y7 = 0.0
        _cache_x8 = 0.0
        _cache_y8 = 0.0
        _cache_x9 = 0.0
        _cache_y9 = 0.0
        _cache_x10 = 0.0
        _cache_y10 = 0.0
        _cache_x11 = 0.0
        _cache_y11 = 0.0
        si n >= 1:
            _cache_x0 = xs[0]
            _cache_y0 = ys[0]
        si n >= 2:
            _cache_x1 = xs[1]
            _cache_y1 = ys[1]
        si n >= 3:
            _cache_x2 = xs[2]
            _cache_y2 = ys[2]
        si n >= 4:
            _cache_x3 = xs[3]
            _cache_y3 = ys[3]
        si n >= 5:
            _cache_x4 = xs[4]
            _cache_y4 = ys[4]
        si n >= 6:
            _cache_x5 = xs[5]
            _cache_y5 = ys[5]
        si n >= 7:
            _cache_x6 = xs[6]
            _cache_y6 = ys[6]
        si n >= 8:
            _cache_x7 = xs[7]
            _cache_y7 = ys[7]
        si n >= 9:
            _cache_x8 = xs[8]
            _cache_y8 = ys[8]
        si n >= 10:
            _cache_x9 = xs[9]
            _cache_y9 = ys[9]
        si n >= 11:
            _cache_x10 = xs[10]
            _cache_y10 = ys[10]
        si n >= 12:
            _cache_x11 = xs[11]
            _cache_y11 = ys[11]
    _compte_tuiles = _compte_tuiles + 1
    retour 1


def _nb_pas_inclusifs(debut, fin, pas):
    si pas <= 0:
        retour 0
    retour entier(math.ceil((fin - debut) / pas)) + 1


# ── Generateurs de tuiles ─────────────────────────────────────

def _gen_hex(larg, haut, a):
    retour _compter_hex_visibles(larg, haut, a)


def _gen_carre(larg, haut, a):
    retour _compter_carres(larg, haut, a)


def _gen_triangle(larg, haut, a):
    h = hauteur_tri(a)
    cols = entier(math.ceil((larg + a * 2.0) / a)) + 2
    rangs = entier(math.ceil((haut + h * 2.0) / (2.0 * h))) + 2
    pour rang dans range(rangs):
        y = -h + rang * (2.0 * h)
        pour col dans range(cols):
            x = -a + col * a
            _ajouter_tuile_3_direct(x, y + h, x + a / 2.0, y, x + a, y + h, larg, haut)
            _ajouter_tuile_3_direct(x, y + h, x + a, y + h, x + a / 2.0, y + 2.0 * h, larg, haut)
    retour 0


def _gen_trihex(larg, haut, a):
    pas_x = 2.0 * (apotheme(6, a) + apotheme(3, a))
    pas_y = math.sqrt(3.0) * (apotheme(6, a) + apotheme(3, a))
    rangs = _nb_pas_inclusifs(-pas_y, haut + pas_y, pas_y)
    cols = _nb_pas_inclusifs(-pas_x, larg + pas_x, pas_x)
    pour rang dans range(rangs):
        y = -pas_y + rang * pas_y
        decal = (rang % 2) * (pas_x / 2.0)
        pour col dans range(cols):
            x = -pas_x + decal + col * pas_x
            soit x0 = sommet_hex_x(x, y, a, 0)
            soit y0 = sommet_hex_y(x, y, a, 0)
            soit x1 = sommet_hex_x(x, y, a, 1)
            soit y1 = sommet_hex_y(x, y, a, 1)
            soit x2 = sommet_hex_x(x, y, a, 2)
            soit y2 = sommet_hex_y(x, y, a, 2)
            soit x3 = sommet_hex_x(x, y, a, 3)
            soit y3 = sommet_hex_y(x, y, a, 3)
            soit x4 = sommet_hex_x(x, y, a, 4)
            soit y4 = sommet_hex_y(x, y, a, 4)
            soit x5 = sommet_hex_x(x, y, a, 5)
            soit y5 = sommet_hex_y(x, y, a, 5)
            _ajouter_tuile_6_direct(x0, y0, x1, y1, x2, y2, x3, y3, x4, y4, x5, y5, larg, haut)
            soit t0x = tri_arete_x3(x0, y0, x1, y1)
            soit t0y = tri_arete_y3(x0, y0, x1, y1)
            _ajouter_tuile_3_direct(x0, y0, x1, y1, t0x, t0y, larg, haut)
            soit t1x = tri_arete_x3(x1, y1, x2, y2)
            soit t1y = tri_arete_y3(x1, y1, x2, y2)
            _ajouter_tuile_3_direct(x1, y1, x2, y2, t1x, t1y, larg, haut)
            soit t2x = tri_arete_x3(x2, y2, x3, y3)
            soit t2y = tri_arete_y3(x2, y2, x3, y3)
            _ajouter_tuile_3_direct(x2, y2, x3, y3, t2x, t2y, larg, haut)
            soit t3x = tri_arete_x3(x3, y3, x4, y4)
            soit t3y = tri_arete_y3(x3, y3, x4, y4)
            _ajouter_tuile_3_direct(x3, y3, x4, y4, t3x, t3y, larg, haut)
            soit t4x = tri_arete_x3(x4, y4, x5, y5)
            soit t4y = tri_arete_y3(x4, y4, x5, y5)
            _ajouter_tuile_3_direct(x4, y4, x5, y5, t4x, t4y, larg, haut)
            soit t5x = tri_arete_x3(x5, y5, x0, y0)
            soit t5y = tri_arete_y3(x5, y5, x0, y0)
            _ajouter_tuile_3_direct(x5, y5, x0, y0, t5x, t5y, larg, haut)
    retour 0


def _gen_snub_trihex(larg, haut, a):
    _gen_trihex(larg, haut, a * 0.82)
    at = a * 0.72
    h = hauteur_tri(at)
    cols = entier(math.ceil((larg + at * 2.0) / (at / 2.0))) + 2
    rangs = entier(math.ceil((haut + h * 2.0) / h)) + 2
    cnt = 0
    pour rang dans range(rangs):
        y = -h + rang * h
        pour col dans range(cols):
            si cnt % 3 == 0:
                x = -at + col * (at / 2.0)
                vers_haut = 1
                si (rang + col) % 2 != 0:
                    vers_haut = 0
                soit x0 = sommet_tri_x(x, at, 0, vers_haut)
                soit y0 = sommet_tri_y(y, at, 0, vers_haut)
                soit x1 = sommet_tri_x(x, at, 1, vers_haut)
                soit y1 = sommet_tri_y(y, at, 1, vers_haut)
                soit x2 = sommet_tri_x(x, at, 2, vers_haut)
                soit y2 = sommet_tri_y(y, at, 2, vers_haut)
                _ajouter_tuile_3_direct(x0, y0, x1, y1, x2, y2, larg, haut)
            cnt = cnt + 1
    retour 0


def _gen_elongated_triangular(larg, haut, a):
    h = math.sqrt(3.0) * a / 2.0
    y = -h
    tantque y <= haut + h:
        x = -a
        tantque x <= larg + a:
            _ajouter_tuile_4_direct(x, y + h, x + a, y + h, x + a, y + h + a, x, y + h + a, larg, haut)
            _ajouter_tuile_3_direct(x, y + h, x + a / 2.0, y, x + a, y + h, larg, haut)
            _ajouter_tuile_3_direct(x, y + h + a, x + a / 2.0, y + h + a + h, x + a, y + h + a, larg, haut)
            x = x + a
        y = y + a + h
    retour 0


def _gen_carre_snub(larg, haut, a):
    pas = a * (1.0 + math.sqrt(3.0))
    y = -pas
    tantque y <= haut + pas:
        x = -pas
        tantque x <= larg + pas:
            soit x0 = sommet_carre_pointe_x(x, y, a, 0)
            soit y0 = sommet_carre_pointe_y(x, y, a, 0)
            soit x1 = sommet_carre_pointe_x(x, y, a, 1)
            soit y1 = sommet_carre_pointe_y(x, y, a, 1)
            soit x2 = sommet_carre_pointe_x(x, y, a, 2)
            soit y2 = sommet_carre_pointe_y(x, y, a, 2)
            soit x3 = sommet_carre_pointe_x(x, y, a, 3)
            soit y3 = sommet_carre_pointe_y(x, y, a, 3)
            _ajouter_tuile_4_direct(x0, y0, x1, y1, x2, y2, x3, y3, larg, haut)
            soit ta0x = tri_arete_x3(x0, y0, x1, y1)
            soit ta0y = tri_arete_y3(x0, y0, x1, y1)
            _ajouter_tuile_3_direct(x0, y0, x1, y1, ta0x, ta0y, larg, haut)
            soit m0x = (x1 + x2) / 2.0
            soit m0y = (y1 + y2) / 2.0 + a * 0.55
            _ajouter_tuile_3_direct(x1, y1, x2, y2, m0x, m0y, larg, haut)
            soit ta1x = tri_arete_x3(x1, y1, x2, y2)
            soit ta1y = tri_arete_y3(x1, y1, x2, y2)
            _ajouter_tuile_3_direct(x1, y1, x2, y2, ta1x, ta1y, larg, haut)
            soit m1x = (x2 + x3) / 2.0
            soit m1y = (y2 + y3) / 2.0 - a * 0.55
            _ajouter_tuile_3_direct(x2, y2, x3, y3, m1x, m1y, larg, haut)
            soit ta2x = tri_arete_x3(x2, y2, x3, y3)
            soit ta2y = tri_arete_y3(x2, y2, x3, y3)
            _ajouter_tuile_3_direct(x2, y2, x3, y3, ta2x, ta2y, larg, haut)
            soit m2x = (x3 + x0) / 2.0
            soit m2y = (y3 + y0) / 2.0 + a * 0.55
            _ajouter_tuile_3_direct(x3, y3, x0, y0, m2x, m2y, larg, haut)
            soit ta3x = tri_arete_x3(x3, y3, x0, y0)
            soit ta3y = tri_arete_y3(x3, y3, x0, y0)
            _ajouter_tuile_3_direct(x3, y3, x0, y0, ta3x, ta3y, larg, haut)
            soit m3x = (x0 + x1) / 2.0
            soit m3y = (y0 + y1) / 2.0 - a * 0.55
            _ajouter_tuile_3_direct(x0, y0, x1, y1, m3x, m3y, larg, haut)
            x = x + pas
        y = y + pas
    retour 0


def _gen_rhombitrihex(larg, haut, a):
    pas_x = 2.0 * (apotheme(6, a) + apotheme(4, a))
    pas_y = math.sqrt(3.0) * (apotheme(6, a) + apotheme(4, a))
    rang = 0
    y = -pas_y
    tantque y <= haut + pas_y:
        decal = (rang % 2) * (pas_x / 2.0)
        x = -pas_x + decal
        tantque x <= larg + pas_x:
            soit h0x = sommet_hex_x(x, y, a, 0)
            soit h0y = sommet_hex_y(x, y, a, 0)
            soit h1x = sommet_hex_x(x, y, a, 1)
            soit h1y = sommet_hex_y(x, y, a, 1)
            soit h2x = sommet_hex_x(x, y, a, 2)
            soit h2y = sommet_hex_y(x, y, a, 2)
            soit h3x = sommet_hex_x(x, y, a, 3)
            soit h3y = sommet_hex_y(x, y, a, 3)
            soit h4x = sommet_hex_x(x, y, a, 4)
            soit h4y = sommet_hex_y(x, y, a, 4)
            soit h5x = sommet_hex_x(x, y, a, 5)
            soit h5y = sommet_hex_y(x, y, a, 5)
            _ajouter_tuile_6_direct(h0x, h0y, h1x, h1y, h2x, h2y, h3x, h3y, h4x, h4y, h5x, h5y, larg, haut)
            pour i dans range(6):
                i2 = (i + 1) % 6
                p1x = h0x
                p1y = h0y
                p2x = h1x
                p2y = h1y
                si i == 1:
                    p1x = h1x
                    p1y = h1y
                    p2x = h2x
                    p2y = h2y
                si i == 2:
                    p1x = h2x
                    p1y = h2y
                    p2x = h3x
                    p2y = h3y
                si i == 3:
                    p1x = h3x
                    p1y = h3y
                    p2x = h4x
                    p2y = h4y
                si i == 4:
                    p1x = h4x
                    p1y = h4y
                    p2x = h5x
                    p2y = h5y
                si i == 5:
                    p1x = h5x
                    p1y = h5y
                    p2x = h0x
                    p2y = h0y
                dx = p2x - p1x
                dy = p2y - p1y
                lon = math.sqrt(dx * dx + dy * dy)
                si lon == 0:
                    continuer
                nx = -dy / lon
                ny = dx / lon
                apo4 = apotheme(4, a)
                ccx = (p1x + p2x) / 2.0 + nx * apo4
                ccy = (p1y + p2y) / 2.0 + ny * apo4
                tx = dx / lon
                ty = dy / lon
                demi = a / 2.0
                soit q0x = ccx + (tx + nx) * demi
                soit q0y = ccy + (ty + ny) * demi
                soit q1x = ccx + (-tx + nx) * demi
                soit q1y = ccy + (-ty + ny) * demi
                soit q2x = ccx + (-tx - nx) * demi
                soit q2y = ccy + (-ty - ny) * demi
                soit q3x = ccx + (tx - nx) * demi
                soit q3y = ccy + (ty - ny) * demi
                _ajouter_tuile_4_direct(q0x, q0y, q1x, q1y, q2x, q2y, q3x, q3y, larg, haut)
                apo3 = apotheme(3, a)
                _ajouter_tuile_3_direct(p1x, p1y, p2x, p2y, (p1x + p2x) / 2.0 + nx * apo3, (p1y + p2y) / 2.0 + ny * apo3, larg, haut)
            x = x + pas_x
        rang = rang + 1
        y = y + pas_y
    retour 0


def _gen_carre_tronque(larg, haut, a):
    pas = 2.0 * apotheme(8, a) + a
    y = -pas
    tantque y <= haut + pas:
        x = -pas
        tantque x <= larg + pas:
            soit o0x = sommet_oct_x(x, y, a, 0)
            soit o0y = sommet_oct_y(x, y, a, 0)
            soit o1x = sommet_oct_x(x, y, a, 1)
            soit o1y = sommet_oct_y(x, y, a, 1)
            soit o2x = sommet_oct_x(x, y, a, 2)
            soit o2y = sommet_oct_y(x, y, a, 2)
            soit o3x = sommet_oct_x(x, y, a, 3)
            soit o3y = sommet_oct_y(x, y, a, 3)
            soit o4x = sommet_oct_x(x, y, a, 4)
            soit o4y = sommet_oct_y(x, y, a, 4)
            soit o5x = sommet_oct_x(x, y, a, 5)
            soit o5y = sommet_oct_y(x, y, a, 5)
            soit o6x = sommet_oct_x(x, y, a, 6)
            soit o6y = sommet_oct_y(x, y, a, 6)
            soit o7x = sommet_oct_x(x, y, a, 7)
            soit o7y = sommet_oct_y(x, y, a, 7)
            _ajouter_poly([o0x, o1x, o2x, o3x, o4x, o5x, o6x, o7x], [o0y, o1y, o2y, o3y, o4y, o5y, o6y, o7y], larg, haut)
            soit q10x = sommet_carre_pointe_x(x + pas / 2.0, y, a, 0)
            soit q10y = sommet_carre_pointe_y(x + pas / 2.0, y, a, 0)
            soit q11x = sommet_carre_pointe_x(x + pas / 2.0, y, a, 1)
            soit q11y = sommet_carre_pointe_y(x + pas / 2.0, y, a, 1)
            soit q12x = sommet_carre_pointe_x(x + pas / 2.0, y, a, 2)
            soit q12y = sommet_carre_pointe_y(x + pas / 2.0, y, a, 2)
            soit q13x = sommet_carre_pointe_x(x + pas / 2.0, y, a, 3)
            soit q13y = sommet_carre_pointe_y(x + pas / 2.0, y, a, 3)
            _ajouter_tuile_4_direct(q10x, q10y, q11x, q11y, q12x, q12y, q13x, q13y, larg, haut)
            soit q20x = sommet_carre_pointe_x(x, y + pas / 2.0, a, 0)
            soit q20y = sommet_carre_pointe_y(x, y + pas / 2.0, a, 0)
            soit q21x = sommet_carre_pointe_x(x, y + pas / 2.0, a, 1)
            soit q21y = sommet_carre_pointe_y(x, y + pas / 2.0, a, 1)
            soit q22x = sommet_carre_pointe_x(x, y + pas / 2.0, a, 2)
            soit q22y = sommet_carre_pointe_y(x, y + pas / 2.0, a, 2)
            soit q23x = sommet_carre_pointe_x(x, y + pas / 2.0, a, 3)
            soit q23y = sommet_carre_pointe_y(x, y + pas / 2.0, a, 3)
            _ajouter_tuile_4_direct(q20x, q20y, q21x, q21y, q22x, q22y, q23x, q23y, larg, haut)
            x = x + pas
        y = y + pas
    retour 0


def _gen_grand_rhombitrihex(larg, haut, a):
    apo12 = apotheme(12, a)
    apo6 = apotheme(6, a)
    apo4 = apotheme(4, a)
    pas_x = 2.0 * (apo12 + apo6 + apo4)
    pas_y = math.sqrt(3.0) * (apo12 + apo6 + apo4)
    rang = 0
    y = -pas_y
    tantque y <= haut + pas_y:
        decal = (rang % 2) * (pas_x / 2.0)
        x = -pas_x + decal
        tantque x <= larg + pas_x:
            soit d0x = sommet_dodec_x(x, y, a, 0)
            soit d0y = sommet_dodec_y(x, y, a, 0)
            soit d1x = sommet_dodec_x(x, y, a, 1)
            soit d1y = sommet_dodec_y(x, y, a, 1)
            soit d2x = sommet_dodec_x(x, y, a, 2)
            soit d2y = sommet_dodec_y(x, y, a, 2)
            soit d3x = sommet_dodec_x(x, y, a, 3)
            soit d3y = sommet_dodec_y(x, y, a, 3)
            soit d4x = sommet_dodec_x(x, y, a, 4)
            soit d4y = sommet_dodec_y(x, y, a, 4)
            soit d5x = sommet_dodec_x(x, y, a, 5)
            soit d5y = sommet_dodec_y(x, y, a, 5)
            soit d6x = sommet_dodec_x(x, y, a, 6)
            soit d6y = sommet_dodec_y(x, y, a, 6)
            soit d7x = sommet_dodec_x(x, y, a, 7)
            soit d7y = sommet_dodec_y(x, y, a, 7)
            soit d8x = sommet_dodec_x(x, y, a, 8)
            soit d8y = sommet_dodec_y(x, y, a, 8)
            soit d9x = sommet_dodec_x(x, y, a, 9)
            soit d9y = sommet_dodec_y(x, y, a, 9)
            soit d10x = sommet_dodec_x(x, y, a, 10)
            soit d10y = sommet_dodec_y(x, y, a, 10)
            soit d11x = sommet_dodec_x(x, y, a, 11)
            soit d11y = sommet_dodec_y(x, y, a, 11)
            _ajouter_poly([d0x, d1x, d2x, d3x, d4x, d5x, d6x, d7x, d8x, d9x, d10x, d11x], [d0y, d1y, d2y, d3y, d4y, d5y, d6y, d7y, d8y, d9y, d10y, d11y], larg, haut)
            pour i dans range(12):
                i2 = (i + 1) % 12
                p1x = d0x
                p1y = d0y
                p2x = d1x
                p2y = d1y
                si i == 1:
                    p1x = d1x
                    p1y = d1y
                    p2x = d2x
                    p2y = d2y
                si i == 2:
                    p1x = d2x
                    p1y = d2y
                    p2x = d3x
                    p2y = d3y
                si i == 3:
                    p1x = d3x
                    p1y = d3y
                    p2x = d4x
                    p2y = d4y
                si i == 4:
                    p1x = d4x
                    p1y = d4y
                    p2x = d5x
                    p2y = d5y
                si i == 5:
                    p1x = d5x
                    p1y = d5y
                    p2x = d6x
                    p2y = d6y
                si i == 6:
                    p1x = d6x
                    p1y = d6y
                    p2x = d7x
                    p2y = d7y
                si i == 7:
                    p1x = d7x
                    p1y = d7y
                    p2x = d8x
                    p2y = d8y
                si i == 8:
                    p1x = d8x
                    p1y = d8y
                    p2x = d9x
                    p2y = d9y
                si i == 9:
                    p1x = d9x
                    p1y = d9y
                    p2x = d10x
                    p2y = d10y
                si i == 10:
                    p1x = d10x
                    p1y = d10y
                    p2x = d11x
                    p2y = d11y
                si i == 11:
                    p1x = d11x
                    p1y = d11y
                    p2x = d0x
                    p2y = d0y
                dx = p2x - p1x
                dy = p2y - p1y
                lon = math.sqrt(dx * dx + dy * dy)
                si lon == 0:
                    continuer
                nx = -dy / lon
                ny = dx / lon
                mx = (p1x + p2x) / 2.0
                my = (p1y + p2y) / 2.0
                si i % 2 == 0:
                    soit hx = mx + nx * apo6
                    soit hy = my + ny * apo6
                    soit h0x = sommet_hex_x(hx, hy, a, 0)
                    soit h0y = sommet_hex_y(hx, hy, a, 0)
                    soit h1x = sommet_hex_x(hx, hy, a, 1)
                    soit h1y = sommet_hex_y(hx, hy, a, 1)
                    soit h2x = sommet_hex_x(hx, hy, a, 2)
                    soit h2y = sommet_hex_y(hx, hy, a, 2)
                    soit h3x = sommet_hex_x(hx, hy, a, 3)
                    soit h3y = sommet_hex_y(hx, hy, a, 3)
                    soit h4x = sommet_hex_x(hx, hy, a, 4)
                    soit h4y = sommet_hex_y(hx, hy, a, 4)
                    soit h5x = sommet_hex_x(hx, hy, a, 5)
                    soit h5y = sommet_hex_y(hx, hy, a, 5)
                    _ajouter_tuile_6_direct(h0x, h0y, h1x, h1y, h2x, h2y, h3x, h3y, h4x, h4y, h5x, h5y, larg, haut)
                sinon:
                    ccx = mx + nx * apo4
                    ccy = my + ny * apo4
                    tx = dx / lon
                    ty = dy / lon
                    demi = a / 2.0
                    soit q0x = ccx + (tx + nx) * demi
                    soit q0y = ccy + (ty + ny) * demi
                    soit q1x = ccx + (-tx + nx) * demi
                    soit q1y = ccy + (-ty + ny) * demi
                    soit q2x = ccx + (-tx - nx) * demi
                    soit q2y = ccy + (-ty - ny) * demi
                    soit q3x = ccx + (tx - nx) * demi
                    soit q3y = ccy + (ty - ny) * demi
                    _ajouter_tuile_4_direct(q0x, q0y, q1x, q1y, q2x, q2y, q3x, q3y, larg, haut)
            x = x + pas_x
        rang = rang + 1
        y = y + pas_y
    retour 0


def _gen_hex_tronque(larg, haut, a):
    apo12 = apotheme(12, a)
    pas_x = 2.0 * apo12
    pas_y = math.sqrt(3.0) * apo12
    rang = 0
    y = -pas_y
    tantque y <= haut + pas_y:
        decal = (rang % 2) * (pas_x / 2.0)
        x = -pas_x + decal
        tantque x <= larg + pas_x:
            soit d0x = sommet_dodec_x(x, y, a, 0)
            soit d0y = sommet_dodec_y(x, y, a, 0)
            soit d1x = sommet_dodec_x(x, y, a, 1)
            soit d1y = sommet_dodec_y(x, y, a, 1)
            soit d2x = sommet_dodec_x(x, y, a, 2)
            soit d2y = sommet_dodec_y(x, y, a, 2)
            soit d3x = sommet_dodec_x(x, y, a, 3)
            soit d3y = sommet_dodec_y(x, y, a, 3)
            soit d4x = sommet_dodec_x(x, y, a, 4)
            soit d4y = sommet_dodec_y(x, y, a, 4)
            soit d5x = sommet_dodec_x(x, y, a, 5)
            soit d5y = sommet_dodec_y(x, y, a, 5)
            soit d6x = sommet_dodec_x(x, y, a, 6)
            soit d6y = sommet_dodec_y(x, y, a, 6)
            soit d7x = sommet_dodec_x(x, y, a, 7)
            soit d7y = sommet_dodec_y(x, y, a, 7)
            soit d8x = sommet_dodec_x(x, y, a, 8)
            soit d8y = sommet_dodec_y(x, y, a, 8)
            soit d9x = sommet_dodec_x(x, y, a, 9)
            soit d9y = sommet_dodec_y(x, y, a, 9)
            soit d10x = sommet_dodec_x(x, y, a, 10)
            soit d10y = sommet_dodec_y(x, y, a, 10)
            soit d11x = sommet_dodec_x(x, y, a, 11)
            soit d11y = sommet_dodec_y(x, y, a, 11)
            _ajouter_poly([d0x, d1x, d2x, d3x, d4x, d5x, d6x, d7x, d8x, d9x, d10x, d11x], [d0y, d1y, d2y, d3y, d4y, d5y, d6y, d7y, d8y, d9y, d10y, d11y], larg, haut)
            pour i dans range(0, 12, 2):
                p1x = d0x
                p1y = d0y
                p2x = d1x
                p2y = d1y
                si i == 2:
                    p1x = d2x
                    p1y = d2y
                    p2x = d3x
                    p2y = d3y
                si i == 4:
                    p1x = d4x
                    p1y = d4y
                    p2x = d5x
                    p2y = d5y
                si i == 6:
                    p1x = d6x
                    p1y = d6y
                    p2x = d7x
                    p2y = d7y
                si i == 8:
                    p1x = d8x
                    p1y = d8y
                    p2x = d9x
                    p2y = d9y
                si i == 10:
                    p1x = d10x
                    p1y = d10y
                    p2x = d11x
                    p2y = d11y
                t3x = tri_arete_x3(p1x, p1y, p2x, p2y)
                t3y = tri_arete_y3(p1x, p1y, p2x, p2y)
                _ajouter_tuile_3_direct(p1x, p1y, p2x, p2y, t3x, t3y, larg, haut)
            x = x + pas_x
        rang = rang + 1
        y = y + pas_y
    retour 0


# ── Dispatch et acces aux tuiles ──────────────────────────────

def generer_tuiles(larg, haut, a, methode):
    global _methode_active, _gen_larg, _gen_haut, _gen_a
    _tuiles_reinit()
    si larg != larg ou haut != haut ou a != a ou methode != methode:
        retour 0
    si a <= 0:
        retour 0
    m = entier(methode)
    _methode_active = m
    _gen_larg = larg
    _gen_haut = haut
    _gen_a = a
    si m == 0:
        retour _gen_hex(larg, haut, a)
    si m == 1:
        retour _gen_carre(larg, haut, a)
    si m == 2:
        _gen_triangle(larg, haut, a)
    si m == 3:
        _gen_trihex(larg, haut, a)
    si m == 4:
        _gen_snub_trihex(larg, haut, a)
    si m == 5:
        _gen_elongated_triangular(larg, haut, a)
    si m == 6:
        _gen_carre_snub(larg, haut, a)
    si m == 7:
        _gen_rhombitrihex(larg, haut, a)
    si m == 8:
        _gen_carre_tronque(larg, haut, a)
    si m == 9:
        _gen_grand_rhombitrihex(larg, haut, a)
    si m == 10:
        _gen_hex_tronque(larg, haut, a)
    retour _compte_tuiles


def _charger_tuile_cache(i):
    global _cache_n, _cache_xs, _cache_ys
    global _vus_n, _vus_cx, _vus_cy, _compte_tuiles, _cible_tuile, _cache_trouve, _cache_actif
    _vus_n = []
    _vus_cx = []
    _vus_cy = []
    _compte_tuiles = 0
    _cible_tuile = entier(i)
    _cache_trouve = 0
    _cache_n = 0
    _cache_xs = []
    _cache_ys = []
    _cache_actif = 1
    si _methode_active == 2:
        _gen_triangle(_gen_larg, _gen_haut, _gen_a)
    si _methode_active == 3:
        _gen_trihex(_gen_larg, _gen_haut, _gen_a)
    si _methode_active == 4:
        _gen_snub_trihex(_gen_larg, _gen_haut, _gen_a)
    si _methode_active == 5:
        _gen_elongated_triangular(_gen_larg, _gen_haut, _gen_a)
    si _methode_active == 6:
        _gen_carre_snub(_gen_larg, _gen_haut, _gen_a)
    si _methode_active == 7:
        _gen_rhombitrihex(_gen_larg, _gen_haut, _gen_a)
    si _methode_active == 8:
        _gen_carre_tronque(_gen_larg, _gen_haut, _gen_a)
    si _methode_active == 9:
        _gen_grand_rhombitrihex(_gen_larg, _gen_haut, _gen_a)
    si _methode_active == 10:
        _gen_hex_tronque(_gen_larg, _gen_haut, _gen_a)


def tuile_n_sommets(i):
    global _tuiles_n, _methode_active, _cache_n
    global _vus_n, _vus_cx, _vus_cy, _compte_tuiles, _cible_tuile, _cache_trouve, _cache_xs, _cache_ys, _cache_actif
    si _methode_active == 0:
        retour 6
    si _methode_active == 1:
        retour 4
    _charger_tuile_cache(i)
    si _cache_trouve == 1:
        retour _cache_n
    retour 0


def tuile_sommet_x(i, j):
    global _tuiles_xs, _tuiles_off, _methode_active, _gen_larg, _gen_haut, _gen_a, _cache_xs
    global _vus_n, _vus_cx, _vus_cy, _compte_tuiles, _cible_tuile, _cache_trouve, _cache_n, _cache_ys, _cache_actif
    global _cache_x0, _cache_x1, _cache_x2, _cache_x3, _cache_x4, _cache_x5, _cache_x6, _cache_x7, _cache_x8, _cache_x9, _cache_x10, _cache_x11
    si _methode_active == 0:
        soit cx = _hex_centre_x_par_index(entier(i), _gen_larg, _gen_haut, _gen_a)
        soit cy = _hex_centre_y_par_index(entier(i), _gen_larg, _gen_haut, _gen_a)
        retour sommet_hex_x(cx, cy, _gen_a, entier(j))
    si _methode_active == 1:
        soit cols = entier(math.ceil(_gen_larg / _gen_a))
        soit col = entier(i) % cols
        soit x = col * _gen_a
        soit x2 = min(_gen_larg, x + _gen_a)
        si entier(j) == 0:
            retour x
        si entier(j) == 1:
            retour x2
        si entier(j) == 2:
            retour x2
        retour x
    si _cache_trouve != 1 ou _cible_tuile != entier(i):
        _charger_tuile_cache(i)
    si _cache_trouve == 1:
        retour _lire_cache_x(entier(j))
    retour 0.0


def tuile_sommet_y(i, j):
    global _tuiles_ys, _tuiles_off, _methode_active, _gen_larg, _gen_haut, _gen_a, _cache_ys
    global _vus_n, _vus_cx, _vus_cy, _compte_tuiles, _cible_tuile, _cache_trouve, _cache_n, _cache_xs, _cache_actif
    global _cache_y0, _cache_y1, _cache_y2, _cache_y3, _cache_y4, _cache_y5, _cache_y6, _cache_y7, _cache_y8, _cache_y9, _cache_y10, _cache_y11
    si _methode_active == 0:
        soit cx = _hex_centre_x_par_index(entier(i), _gen_larg, _gen_haut, _gen_a)
        soit cy = _hex_centre_y_par_index(entier(i), _gen_larg, _gen_haut, _gen_a)
        retour sommet_hex_y(cx, cy, _gen_a, entier(j))
    si _methode_active == 1:
        soit cols = entier(math.ceil(_gen_larg / _gen_a))
        soit rang = entier(i) // cols
        soit y = rang * _gen_a
        soit y2 = min(_gen_haut, y + _gen_a)
        si entier(j) == 0:
            retour y
        si entier(j) == 1:
            retour y
        si entier(j) == 2:
            retour y2
        retour y2
    si _cache_trouve != 1 ou _cible_tuile != entier(i):
        _charger_tuile_cache(i)
    si _cache_trouve == 1:
        retour _lire_cache_y(entier(j))
    retour 0.0


def tuile_centre_x(i):
    si _methode_active == 0:
        retour _hex_centre_x_par_index(entier(i), _gen_larg, _gen_haut, _gen_a)
    si _methode_active == 1:
        soit cols = entier(math.ceil(_gen_larg / _gen_a))
        soit col = entier(i) % cols
        soit x = col * _gen_a
        soit x2 = min(_gen_larg, x + _gen_a)
        retour (x + x2) / 2.0
    si _cache_trouve != 1 ou _cible_tuile != entier(i):
        _charger_tuile_cache(i)
    si _cache_trouve != 1 ou _cache_n <= 0:
        retour 0.0
    soit sx = 0.0
    pour j dans range(_cache_n):
        sx = sx + _lire_cache_x(j)
    retour sx / _cache_n


def tuile_centre_y(i):
    si _methode_active == 0:
        retour _hex_centre_y_par_index(entier(i), _gen_larg, _gen_haut, _gen_a)
    si _methode_active == 1:
        soit cols = entier(math.ceil(_gen_larg / _gen_a))
        soit rang = entier(i) // cols
        soit y = rang * _gen_a
        soit y2 = min(_gen_haut, y + _gen_a)
        retour (y + y2) / 2.0
    si _cache_trouve != 1 ou _cible_tuile != entier(i):
        _charger_tuile_cache(i)
    si _cache_trouve != 1 ou _cache_n <= 0:
        retour 0.0
    soit sy = 0.0
    pour j dans range(_cache_n):
        sy = sy + _lire_cache_y(j)
    retour sy / _cache_n


def tuile_boite_min_x(i):
    soit n = tuile_n_sommets(i)
    si n <= 0:
        retour 0.0
    soit min_x = tuile_sommet_x(i, 0)
    pour j dans range(1, n):
        soit x = tuile_sommet_x(i, j)
        si x < min_x:
            min_x = x
    retour min_x


def tuile_boite_max_x(i):
    soit n = tuile_n_sommets(i)
    si n <= 0:
        retour 0.0
    soit max_x = tuile_sommet_x(i, 0)
    pour j dans range(1, n):
        soit x = tuile_sommet_x(i, j)
        si x > max_x:
            max_x = x
    retour max_x


def tuile_boite_min_y(i):
    soit n = tuile_n_sommets(i)
    si n <= 0:
        retour 0.0
    soit min_y = tuile_sommet_y(i, 0)
    pour j dans range(1, n):
        soit y = tuile_sommet_y(i, j)
        si y < min_y:
            min_y = y
    retour min_y


def tuile_boite_max_y(i):
    soit n = tuile_n_sommets(i)
    si n <= 0:
        retour 0.0
    soit max_y = tuile_sommet_y(i, 0)
    pour j dans range(1, n):
        soit y = tuile_sommet_y(i, j)
        si y > max_y:
            max_y = y
    retour max_y


def tuile_contient_point(i, px, py):
    soit n = tuile_n_sommets(i)
    si n < 3:
        retour 0
    soit dedans = 0
    soit j = n - 1
    pour i2 dans range(n):
        soit xi = tuile_sommet_x(i, i2)
        soit yi = tuile_sommet_y(i, i2)
        soit xj = tuile_sommet_x(i, j)
        soit yj = tuile_sommet_y(i, j)
        si ((yi > py) != (yj > py)) et (px < ((xj - xi) * (py - yi)) / (yj - yi) + xi):
            si dedans == 0:
                dedans = 1
            sinon:
                dedans = 0
        j = i2
    retour dedans


# ── Codes de methode ──────────────────────────────────────────

def methode_hexagone():
    retour 0


def methode_carre():
    retour 1


def methode_triangle():
    retour 2


def methode_trihex():
    retour 3


def methode_snub_trihex():
    retour 4


def methode_triangulaire_elongue():
    retour 5


def methode_carre_snub():
    retour 6


def methode_rhombitrihex():
    retour 7


def methode_carre_tronque():
    retour 8


def methode_grand_rhombitrihex():
    retour 9


def methode_hex_tronque():
    retour 10
