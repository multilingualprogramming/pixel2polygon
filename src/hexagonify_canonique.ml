importer math
importer os
depuis PIL importer Image, ImageDraw
importer numpy comme np

essayer:
    depuis sklearn.cluster importer MiniBatchKMeans
    SKLEARN_DISPONIBLE = Vrai
sauf Exception:
    SKLEARN_DISPONIBLE = Faux


# ────────────────────────────────────────────────────────────────
#  Source canonique complete du projet pixel2polygon.
#  Ce module decrit l'algorithme integral de carrelage :
#   - generation de la geometrie (hexagone, carre, triangle)
#   - calcul de la couleur representative par tuile
#     (mode : moyenne rapide  ou  kmeans : couleur dominante)
#   - ecriture de l'image de sortie
# ────────────────────────────────────────────────────────────────


# ── Geometrie : hexagone ─────────────────────────────────────

déf sommets_hexagone_pointu(cx, cy, a):
    r = a
    s3 = math.sqrt(3.0)
    retour [
        (cx + 0.0,           cy - r),
        (cx + (s3/2.0)*r,    cy - r/2.0),
        (cx + (s3/2.0)*r,    cy + r/2.0),
        (cx + 0.0,           cy + r),
        (cx - (s3/2.0)*r,    cy + r/2.0),
        (cx - (s3/2.0)*r,    cy - r/2.0),
    ]


déf generer_centres_hex(larg, haut, a):
    horiz = math.sqrt(3.0) * a
    vert  = 1.5 * a
    x_min = -horiz
    x_max =  larg + horiz
    y_min = -2 * a
    y_max =  haut + 2 * a
    centres = []
    rang = 0
    y = y_min
    tantque y <= y_max:
        decalage_x = (rang % 2) * (horiz / 2.0)
        x = x_min + decalage_x
        tantque x <= x_max:
            centres.append((x, y))
            x += horiz
        rang += 1
        y += vert
    retour centres


# ── Geometrie : carre ────────────────────────────────────────

déf generer_carres(larg, haut, a):
    polys = []
    x = 0
    tantque x < larg:
        y = 0
        tantque y < haut:
            x2 = min(larg, x + a)
            y2 = min(haut, y + a)
            polys.append([(x, y), (x2, y), (x2, y2), (x, y2)])
            y += a
        x += a
    retour polys


# ── Geometrie : triangle equilateral ────────────────────────

déf sommets_triangle(x, y, a, vers_haut=Vrai):
    h = a * math.sqrt(3.0) / 2.0
    si vers_haut:
        retour [(x, y + h), (x + a/2.0, y), (x + a, y + h)]
    sinon:
        retour [(x, y), (x + a, y), (x + a/2.0, y + h)]


déf generer_triangles(larg, haut, a):
    polys  = []
    h_tri  = a * math.sqrt(3.0) / 2.0
    cols   = int(math.ceil((larg + a*2) / (a/2.0))) + 2
    rangs  = int(math.ceil((haut + h_tri*2) / h_tri)) + 2
    x_debut = -a
    y_debut = -h_tri
    pour rang dans range(rangs):
        y = y_debut + rang * h_tri
        pour col dans range(cols):
            x = x_debut + col * (a / 2.0)
            vers_haut = ((rang + col) % 2 == 0)
            polys.append(sommets_triangle(x, y, a, vers_haut))
    retour polys


# ── Masque par tuile ─────────────────────────────────────────

déf masque_et_bbox(poly, larg, haut):
    xs = [p[0] pour p dans poly]
    ys = [p[1] pour p dans poly]
    x0 = max(0, int(math.floor(min(xs))))
    x1 = min(larg, int(math.ceil(max(xs))))
    y0 = max(0, int(math.floor(min(ys))))
    y1 = min(haut, int(math.ceil(max(ys))))
    si x1 <= x0 ou y1 <= y0:
        retour (Aucun, Aucun, Aucun)
    larg_bbox = x1 - x0
    haut_bbox = y1 - y0
    decales    = [(px - x0, py - y0) pour (px, py) dans poly]
    img_masque = Image.new('L', (larg_bbox, haut_bbox), 0)
    ImageDraw.Draw(img_masque).polygon(decales, fill=255)
    masque = np.array(img_masque, dtype=bool)
    retour (x0, y0, masque)


# ── Couleur representative ───────────────────────────────────

déf couleur_representative(pixels, mode_couleur="moyenne", groupes=3, max_echantillons=2000, mini_batch=Vrai):
    si pixels est Aucun ou pixels.size == 0:
        retour (0, 0, 0)

    si mode_couleur == "moyenne" ou (non SKLEARN_DISPONIBLE):
        moy = pixels.mean(axis=0)
        retour (int(round(moy[0])), int(round(moy[1])), int(round(moy[2])))

    # Mode kmeans : couleur dominante via MiniBatchKMeans
    n = pixels.shape[0]
    si n > max_echantillons:
        idx = np.random.choice(n, size=max_echantillons, replace=Faux)
        echantillon = pixels[idx]
    sinon:
        echantillon = pixels

    essayer:
        si mini_batch et SKLEARN_DISPONIBLE:
            k = min(groupes, max(1, echantillon.shape[0]))
            si k == 1:
                centroide = echantillon.mean(axis=0)
            sinon:
                mbk = MiniBatchKMeans(n_clusters=k, batch_size=256, random_state=0)
                mbk.fit(echantillon)
                labels   = mbk.predict(echantillon)
                comptes  = np.bincount(labels, minlength=k)
                dominant = np.argmax(comptes)
                centroide = mbk.cluster_centers_[dominant]
        sinon:
            centroide = echantillon.mean(axis=0)
        retour (int(round(centroide[0])), int(round(centroide[1])), int(round(centroide[2])))
    sauf Exception:
        moy = echantillon.mean(axis=0)
        retour (int(round(moy[0])), int(round(moy[1])), int(round(moy[2])))


# ── Carrelage principal ──────────────────────────────────────

déf carreler_image(chemin_entree, chemin_sortie,
                   methode="hex",
                   cote=30,
                   mode_couleur="moyenne",
                   groupes=3,
                   mini_batch=Vrai,
                   max_echantillons=2000,
                   epaisseur_contour=0,
                   couleur_contour=(0, 0, 0, 120)):

    im   = Image.open(chemin_entree).convert("RGBA")
    larg, haut = im.size
    arr  = np.array(im.convert("RGB"))

    sortie = Image.new("RGBA", (larg, haut), (0, 0, 0, 0))
    dessin = ImageDraw.Draw(sortie, "RGBA")

    polygones = []
    si methode == "hex":
        centres = generer_centres_hex(larg, haut, cote)
        pour (cx, cy) dans centres:
            polygones.append(sommets_hexagone_pointu(cx, cy, cote))
    sinonsi methode == "carre":
        polygones = generer_carres(larg, haut, cote)
    sinonsi methode == "triangle":
        polygones = generer_triangles(larg, haut, cote)
    sinon:
        lever ValueError(f"Methode inconnue '{methode}' : choisir 'hex', 'carre' ou 'triangle'")

    pour poly dans polygones:
        x0, y0, masque = masque_et_bbox(poly, larg, haut)
        si masque est Aucun:
            continuer
        sous = arr[y0:y0+masque.shape[0], x0:x0+masque.shape[1]]
        si sous.size == 0:
            continuer
        pixels = sous[masque]
        si pixels.size == 0:
            continuer
        couleur = couleur_representative(pixels, mode_couleur, groupes, max_echantillons, mini_batch)
        remplissage = (int(couleur[0]), int(couleur[1]), int(couleur[2]), 255)
        dessin.polygon(poly, fill=remplissage)
        si epaisseur_contour:
            dessin.line(poly + [poly[0]], fill=couleur_contour, width=epaisseur_contour)

    sortie.save(chemin_sortie)
    retour chemin_sortie


# ── Exemple d'utilisation ────────────────────────────────────

si __name__ == "__main__":
    demo_entree  = "images/photo.jpg"
    demo_hex     = "sortie_hex.png"
    demo_carre   = "sortie_carre.png"
    demo_tri     = "sortie_triangle.png"
    cote = 40
    mode = "kmeans"

    si os.path.exists(demo_entree):
        afficher("Traitement de", demo_entree)
        carreler_image(demo_entree, demo_hex,   methode="hex",      cote=cote, mode_couleur=mode)
        carreler_image(demo_entree, demo_carre,  methode="carre",    cote=cote, mode_couleur=mode)
        carreler_image(demo_entree, demo_tri,    methode="triangle", cote=cote, mode_couleur=mode)
        afficher("Sorties :", demo_hex, demo_carre, demo_tri)
    sinon:
        afficher("Aucune image de demonstration trouvee dans", demo_entree)
