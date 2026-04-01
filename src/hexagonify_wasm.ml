importer math

# Module WASM-compatible pour le carrelage d'images.
# Exporte les primitives geometriques et les generateurs de tuiles
# utilises par l'interface JavaScript.


# ── Hexagone (sommet pointu en haut) ──────────────────────────

déf sommet_hex_x(cx, cy, a, idx):
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


déf sommet_hex_y(cx, cy, a, idx):
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


déf espacement_horiz(a):
    retour math.sqrt(3.0) * a


déf espacement_vert(a):
    retour 1.5 * a


# ── Triangle equilateral ──────────────────────────────────────

déf hauteur_tri(a):
    retour a * math.sqrt(3.0) / 2.0


déf sommet_tri_x(x, a, idx, vers_haut):
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


déf sommet_tri_y(y, a, idx, vers_haut):
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

déf couleur_moyenne(total, compte):
    si compte == 0:
        retour 0
    retour entier(arrondir(total / compte))


# ── Geometrie avancee ─────────────────────────────────────────

déf apotheme(n, cote):
    retour cote / (2.0 * math.tan(math.pi / n))


déf rayon(n, cote):
    retour cote / (2.0 * math.sin(math.pi / n))


déf polygone_x(cx, cy, cote, n, rotation, i):
    r = rayon(n, cote)
    angle = rotation + (2.0 * math.pi * i) / n
    retour cx + r * math.cos(angle)


déf polygone_y(cx, cy, cote, n, rotation, i):
    r = rayon(n, cote)
    angle = rotation + (2.0 * math.pi * i) / n
    retour cy + r * math.sin(angle)


déf tri_arete_x3(x1, y1, x2, y2):
    dx = x2 - x1
    dy = y2 - y1
    lon = math.sqrt(dx * dx + dy * dy)
    si lon == 0:
        retour (x1 + x2) / 2.0
    h = math.sqrt(3.0) * lon / 2.0
    nx = -dy / lon
    retour (x1 + x2) / 2.0 + nx * h


déf tri_arete_y3(x1, y1, x2, y2):
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


déf km_init(k):
    global _km_r, _km_g, _km_b, _km_k, _km_res_r, _km_res_g, _km_res_b
    _km_r = []
    _km_g = []
    _km_b = []
    _km_k = entier(k)
    _km_res_r = 0
    _km_res_g = 0
    _km_res_b = 0
    retour 0


déf km_ajouter(r, g, b):
    global _km_r, _km_g, _km_b
    _km_r.append(r)
    _km_g.append(g)
    _km_b.append(b)
    retour 0


déf _dist2(r1, g1, b1, r2, g2, b2):
    soit dr = r1 - r2
    soit dg = g1 - g2
    soit db = b1 - b2
    retour dr * dr + dg * dg + db * db


déf km_calculer(max_iter):
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


déf km_r():
    retour _km_res_r


déf km_g():
    retour _km_res_g


déf km_b():
    retour _km_res_b


# ── Stockage global des tuiles ────────────────────────────────

_tuiles_xs = []
_tuiles_ys = []
_tuiles_off = []
_tuiles_n = []
_vus_n = []
_vus_cx = []
_vus_cy = []


déf _tuiles_reinit():
    global _tuiles_xs, _tuiles_ys, _tuiles_off, _tuiles_n
    global _vus_n, _vus_cx, _vus_cy
    _tuiles_xs = []
    _tuiles_ys = []
    _tuiles_off = []
    _tuiles_n = []
    _vus_n = []
    _vus_cx = []
    _vus_cy = []
    retour 0


déf _ajouter_poly(xs, ys, larg, haut):
    global _tuiles_xs, _tuiles_ys, _tuiles_off, _tuiles_n
    global _vus_n, _vus_cx, _vus_cy
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
    cx = entier(cx * 100.0) / 100.0
    cy = entier(cy * 100.0) / 100.0
    pour k dans range(len(_vus_n)):
        si _vus_n[k] == n et _vus_cx[k] == cx et _vus_cy[k] == cy:
            retour 0
    _vus_n.append(n)
    _vus_cx.append(cx)
    _vus_cy.append(cy)
    _tuiles_off.append(len(_tuiles_xs))
    _tuiles_n.append(n)
    pour i dans range(n):
        _tuiles_xs.append(xs[i])
        _tuiles_ys.append(ys[i])
    retour 1


déf _nb_pas_inclusifs(debut, fin, pas):
    si pas <= 0:
        retour 0
    retour entier(math.ceil((fin - debut) / pas)) + 1


# ── Generateurs de tuiles ─────────────────────────────────────

déf _gen_hex(larg, haut, a):
    hs = espacement_horiz(a)
    vs = espacement_vert(a)
    rangs = _nb_pas_inclusifs(-2.0 * a, haut + 2.0 * a, vs)
    cols = _nb_pas_inclusifs(-hs, larg + hs, hs)
    pour rang dans range(rangs):
        y = -2.0 * a + rang * vs
        decal = (rang % 2) * (hs / 2.0)
        pour col dans range(cols):
            x = -hs + decal + col * hs
            soit xs = [sommet_hex_x(x, y, a, i) pour i dans range(6)]
            soit ys = [sommet_hex_y(x, y, a, i) pour i dans range(6)]
            _ajouter_poly(xs, ys, larg, haut)
    retour 0


déf _gen_carre(larg, haut, a):
    cols = entier(math.ceil(larg / a))
    rangs = entier(math.ceil(haut / a))
    pour col dans range(cols):
        x = col * a
        pour rang dans range(rangs):
            y = rang * a
            x2 = min(larg, x + a)
            y2 = min(haut, y + a)
            soit xs = [x, x2, x2, x]
            soit ys = [y, y, y2, y2]
            _ajouter_poly(xs, ys, larg, haut)
    retour 0


déf _gen_triangle(larg, haut, a):
    h = hauteur_tri(a)
    cols = entier(math.ceil((larg + a * 2.0) / (a / 2.0))) + 2
    rangs = entier(math.ceil((haut + h * 2.0) / h)) + 2
    pour rang dans range(rangs):
        y = -h + rang * h
        pour col dans range(cols):
            x = -a + col * (a / 2.0)
            vers_haut = 1
            si (rang + col) % 2 != 0:
                vers_haut = 0
            soit xs = [sommet_tri_x(x, a, i, vers_haut) pour i dans range(3)]
            soit ys = [sommet_tri_y(y, a, i, vers_haut) pour i dans range(3)]
            _ajouter_poly(xs, ys, larg, haut)
    retour 0


déf _gen_trihex(larg, haut, a):
    pas_x = 2.0 * (apotheme(6, a) + apotheme(3, a))
    pas_y = math.sqrt(3.0) * (apotheme(6, a) + apotheme(3, a))
    rangs = _nb_pas_inclusifs(-pas_y, haut + pas_y, pas_y)
    cols = _nb_pas_inclusifs(-pas_x, larg + pas_x, pas_x)
    pour rang dans range(rangs):
        y = -pas_y + rang * pas_y
        decal = (rang % 2) * (pas_x / 2.0)
        pour col dans range(cols):
            x = -pas_x + decal + col * pas_x
            soit hxs = [polygone_x(x, y, a, 6, -math.pi / 2.0, i) pour i dans range(6)]
            soit hys = [polygone_y(x, y, a, 6, -math.pi / 2.0, i) pour i dans range(6)]
            _ajouter_poly(hxs, hys, larg, haut)
            pour i dans range(6):
                i2 = (i + 1) % 6
                t3x = tri_arete_x3(hxs[i], hys[i], hxs[i2], hys[i2])
                t3y = tri_arete_y3(hxs[i], hys[i], hxs[i2], hys[i2])
                soit txs = [hxs[i], hxs[i2], t3x]
                soit tys = [hys[i], hys[i2], t3y]
                _ajouter_poly(txs, tys, larg, haut)
    retour 0


déf _gen_snub_trihex(larg, haut, a):
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
                soit xs = [sommet_tri_x(x, at, i, vers_haut) pour i dans range(3)]
                soit ys = [sommet_tri_y(y, at, i, vers_haut) pour i dans range(3)]
                _ajouter_poly(xs, ys, larg, haut)
            cnt = cnt + 1
    retour 0


déf _gen_elongated_triangular(larg, haut, a):
    h = math.sqrt(3.0) * a / 2.0
    y = -h
    tantque y <= haut + h:
        x = -a
        tantque x <= larg + a:
            soit xs_sq = [x, x + a, x + a, x]
            soit ys_sq = [y + h, y + h, y + h + a, y + h + a]
            _ajouter_poly(xs_sq, ys_sq, larg, haut)
            soit xs_tt = [x, x + a / 2.0, x + a]
            soit ys_tt = [y + h, y, y + h]
            _ajouter_poly(xs_tt, ys_tt, larg, haut)
            soit xs_tb = [x, x + a / 2.0, x + a]
            soit ys_tb = [y + h + a, y + h + a + h, y + h + a]
            _ajouter_poly(xs_tb, ys_tb, larg, haut)
            x = x + a
        y = y + a + h
    retour 0


déf _gen_carre_snub(larg, haut, a):
    pas = a * (1.0 + math.sqrt(3.0))
    y = -pas
    tantque y <= haut + pas:
        x = -pas
        tantque x <= larg + pas:
            soit cxs = [polygone_x(x, y, a, 4, math.pi / 4.0, i) pour i dans range(4)]
            soit cys = [polygone_y(x, y, a, 4, math.pi / 4.0, i) pour i dans range(4)]
            _ajouter_poly(cxs, cys, larg, haut)
            pour i dans range(4):
                i2 = (i + 1) % 4
                i3 = (i + 2) % 4
                t3x = tri_arete_x3(cxs[i], cys[i], cxs[i2], cys[i2])
                t3y = tri_arete_y3(cxs[i], cys[i], cxs[i2], cys[i2])
                soit ta_xs = [cxs[i], cxs[i2], t3x]
                soit ta_ys = [cys[i], cys[i2], t3y]
                _ajouter_poly(ta_xs, ta_ys, larg, haut)
                mx = (cxs[i2] + cxs[i3]) / 2.0
                my = (cys[i2] + cys[i3]) / 2.0
                decal = a * 0.55
                si i % 2 == 1:
                    decal = -decal
                soit ti_xs = [cxs[i2], cxs[i3], mx]
                soit ti_ys = [cys[i2], cys[i3], my + decal]
                _ajouter_poly(ti_xs, ti_ys, larg, haut)
            x = x + pas
        y = y + pas
    retour 0


déf _gen_rhombitrihex(larg, haut, a):
    pas_x = 2.0 * (apotheme(6, a) + apotheme(4, a))
    pas_y = math.sqrt(3.0) * (apotheme(6, a) + apotheme(4, a))
    rang = 0
    y = -pas_y
    tantque y <= haut + pas_y:
        decal = (rang % 2) * (pas_x / 2.0)
        x = -pas_x + decal
        tantque x <= larg + pas_x:
            soit hxs = [polygone_x(x, y, a, 6, -math.pi / 2.0, i) pour i dans range(6)]
            soit hys = [polygone_y(x, y, a, 6, -math.pi / 2.0, i) pour i dans range(6)]
            _ajouter_poly(hxs, hys, larg, haut)
            pour i dans range(6):
                i2 = (i + 1) % 6
                p1x = hxs[i]
                p1y = hys[i]
                p2x = hxs[i2]
                p2y = hys[i2]
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
                angle = math.atan2(dy, dx)
                soit qxs = [polygone_x(ccx, ccy, a, 4, angle, j) pour j dans range(4)]
                soit qys = [polygone_y(ccx, ccy, a, 4, angle, j) pour j dans range(4)]
                _ajouter_poly(qxs, qys, larg, haut)
                apo3 = apotheme(3, a)
                soit txs = [p1x, p2x, p2x + nx * apo3 * 0.9]
                soit tys = [p1y, p2y, p2y + ny * apo3 * 0.9]
                _ajouter_poly(txs, tys, larg, haut)
            x = x + pas_x
        rang = rang + 1
        y = y + pas_y
    retour 0


déf _gen_carre_tronque(larg, haut, a):
    pas = 2.0 * apotheme(8, a) + a
    y = -pas
    tantque y <= haut + pas:
        x = -pas
        tantque x <= larg + pas:
            soit oxs = [polygone_x(x, y, a, 8, math.pi / 8.0, i) pour i dans range(8)]
            soit oys = [polygone_y(x, y, a, 8, math.pi / 8.0, i) pour i dans range(8)]
            _ajouter_poly(oxs, oys, larg, haut)
            soit q1xs = [polygone_x(x + pas / 2.0, y, a, 4, math.pi / 4.0, i) pour i dans range(4)]
            soit q1ys = [polygone_y(x + pas / 2.0, y, a, 4, math.pi / 4.0, i) pour i dans range(4)]
            _ajouter_poly(q1xs, q1ys, larg, haut)
            soit q2xs = [polygone_x(x, y + pas / 2.0, a, 4, math.pi / 4.0, i) pour i dans range(4)]
            soit q2ys = [polygone_y(x, y + pas / 2.0, a, 4, math.pi / 4.0, i) pour i dans range(4)]
            _ajouter_poly(q2xs, q2ys, larg, haut)
            x = x + pas
        y = y + pas
    retour 0


déf _gen_grand_rhombitrihex(larg, haut, a):
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
            soit dxs = [polygone_x(x, y, a, 12, math.pi / 12.0, i) pour i dans range(12)]
            soit dys = [polygone_y(x, y, a, 12, math.pi / 12.0, i) pour i dans range(12)]
            _ajouter_poly(dxs, dys, larg, haut)
            pour i dans range(12):
                i2 = (i + 1) % 12
                p1x = dxs[i]
                p1y = dys[i]
                p2x = dxs[i2]
                p2y = dys[i2]
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
                    soit pxs = [polygone_x(mx + nx * apo6, my + ny * apo6, a, 6, -math.pi / 2.0, j) pour j dans range(6)]
                    soit pys = [polygone_y(mx + nx * apo6, my + ny * apo6, a, 6, -math.pi / 2.0, j) pour j dans range(6)]
                    _ajouter_poly(pxs, pys, larg, haut)
                sinon:
                    angle = math.atan2(dy, dx)
                    soit pxs = [polygone_x(mx + nx * apo4, my + ny * apo4, a, 4, angle, j) pour j dans range(4)]
                    soit pys = [polygone_y(mx + nx * apo4, my + ny * apo4, a, 4, angle, j) pour j dans range(4)]
                    _ajouter_poly(pxs, pys, larg, haut)
            x = x + pas_x
        rang = rang + 1
        y = y + pas_y
    retour 0


déf _gen_hex_tronque(larg, haut, a):
    apo12 = apotheme(12, a)
    pas_x = 2.0 * apo12
    pas_y = math.sqrt(3.0) * apo12
    rang = 0
    y = -pas_y
    tantque y <= haut + pas_y:
        decal = (rang % 2) * (pas_x / 2.0)
        x = -pas_x + decal
        tantque x <= larg + pas_x:
            soit dxs = [polygone_x(x, y, a, 12, math.pi / 12.0, i) pour i dans range(12)]
            soit dys = [polygone_y(x, y, a, 12, math.pi / 12.0, i) pour i dans range(12)]
            _ajouter_poly(dxs, dys, larg, haut)
            pour i dans range(0, 12, 2):
                i2 = (i + 1) % 12
                t3x = tri_arete_x3(dxs[i], dys[i], dxs[i2], dys[i2])
                t3y = tri_arete_y3(dxs[i], dys[i], dxs[i2], dys[i2])
                soit txs = [dxs[i], dxs[i2], t3x]
                soit tys = [dys[i], dys[i2], t3y]
                _ajouter_poly(txs, tys, larg, haut)
            x = x + pas_x
        rang = rang + 1
        y = y + pas_y
    retour 0


# ── Dispatch et acces aux tuiles ──────────────────────────────

déf generer_tuiles(larg, haut, a, methode):
    _tuiles_reinit()
    si larg != larg ou haut != haut ou a != a ou methode != methode:
        retour 0
    si a <= 0:
        retour 0
    m = entier(methode)
    si m == 0:
        _gen_hex(larg, haut, a)
    si m == 1:
        _gen_carre(larg, haut, a)
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
    retour len(_tuiles_off)


déf tuile_n_sommets(i):
    global _tuiles_n
    retour _tuiles_n[entier(i)]


déf tuile_sommet_x(i, j):
    global _tuiles_xs, _tuiles_off
    retour _tuiles_xs[entier(_tuiles_off[entier(i)]) + entier(j)]


déf tuile_sommet_y(i, j):
    global _tuiles_ys, _tuiles_off
    retour _tuiles_ys[entier(_tuiles_off[entier(i)]) + entier(j)]


# ── Codes de methode ──────────────────────────────────────────

déf methode_hexagone():
    retour 0


déf methode_carre():
    retour 1


déf methode_triangle():
    retour 2


déf methode_trihex():
    retour 3


déf methode_snub_trihex():
    retour 4


déf methode_triangulaire_elongue():
    retour 5


déf methode_carre_snub():
    retour 6


déf methode_rhombitrihex():
    retour 7


déf methode_carre_tronque():
    retour 8


déf methode_grand_rhombitrihex():
    retour 9


déf methode_hex_tronque():
    retour 10
