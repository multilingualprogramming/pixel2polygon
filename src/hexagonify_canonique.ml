importer math
importer os
depuis PIL importer Image, ImageDraw
importer numpy comme np

essayer:
    depuis sklearn.cluster importer MiniBatchKMeans
    SKLEARN_DISPONIBLE = Vrai
sauf Exception:
    SKLEARN_DISPONIBLE = Faux


# Source canonique complete du projet pixel2polygon.
# Ce module decrit l'algorithme integral de carrelage :
# - generation de la geometrie
# - calcul de la couleur representative par tuile
# - ecriture de l'image de sortie


# Geometrie : hexagone

déf sommets_hexagone_pointu(cx, cy, a):
    r = a
    s3 = math.sqrt(3.0)
    retour [
        (cx + 0.0,        cy - r),
        (cx + (s3 / 2.0) * r, cy - r / 2.0),
        (cx + (s3 / 2.0) * r, cy + r / 2.0),
        (cx + 0.0,        cy + r),
        (cx - (s3 / 2.0) * r, cy + r / 2.0),
        (cx - (s3 / 2.0) * r, cy - r / 2.0),
    ]


déf generer_centres_hex(larg, haut, a):
    horiz = math.sqrt(3.0) * a
    vert = 1.5 * a
    x_min = -horiz
    x_max = larg + horiz
    y_min = -2 * a
    y_max = haut + 2 * a
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


# Geometrie : carre

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


# Geometrie : triangle equilateral

déf sommets_triangle(x, y, a, vers_haut=Vrai):
    h = a * math.sqrt(3.0) / 2.0
    si vers_haut:
        retour [(x, y + h), (x + a / 2.0, y), (x + a, y + h)]
    sinon:
        retour [(x, y), (x + a, y), (x + a / 2.0, y + h)]


déf generer_triangles(larg, haut, a):
    polys = []
    h_tri = a * math.sqrt(3.0) / 2.0
    cols = int(math.ceil((larg + a * 2) / (a / 2.0))) + 2
    rangs = int(math.ceil((haut + h_tri * 2) / h_tri)) + 2
    x_debut = -a
    y_debut = -h_tri
    pour rang dans range(rangs):
        y = y_debut + rang * h_tri
        pour col dans range(cols):
            x = x_debut + col * (a / 2.0)
            vers_haut = ((rang + col) % 2 == 0)
            polys.append(sommets_triangle(x, y, a, vers_haut))
    retour polys


# Geometrie : outils pour tessellations semi-regulieres

déf apotheme_polygone(n, cote):
    retour cote / (2.0 * math.tan(math.pi / n))


déf rayon_polygone(n, cote):
    retour cote / (2.0 * math.sin(math.pi / n))


déf polygone_regulier(cx, cy, cote, n, rotation=-math.pi / 2.0):
    r = rayon_polygone(n, cote)
    points = []
    pour i dans range(n):
        angle = rotation + (2.0 * math.pi * i) / n
        points.append((cx + r * math.cos(angle), cy + r * math.sin(angle)))
    retour points


déf triangle_depuis_arete(p1, p2):
    x1, y1 = p1
    x2, y2 = p2
    dx = x2 - x1
    dy = y2 - y1
    longueur = math.hypot(dx, dy)
    si longueur == 0:
        retour [p1, p2, p1]
    mx = (x1 + x2) / 2.0
    my = (y1 + y2) / 2.0
    hauteur = math.sqrt(3.0) * longueur / 2.0
    nx = -dy / longueur
    ny = dx / longueur
    retour [p1, p2, (mx + nx * hauteur, my + ny * hauteur)]


déf boite_poly(poly):
    xs = [p[0] pour p dans poly]
    ys = [p[1] pour p dans poly]
    retour (min(xs), min(ys), max(xs), max(ys))


déf poly_visible(poly, larg, haut):
    min_x, min_y, max_x, max_y = boite_poly(poly)
    retour max_x >= 0 et max_y >= 0 et min_x <= larg et min_y <= haut


déf cle_poly(poly):
    somme_x = 0.0
    somme_y = 0.0
    pour (x, y) dans poly:
        somme_x += x
        somme_y += y
    cx = somme_x / len(poly)
    cy = somme_y / len(poly)
    retour f"{len(poly)}:{round(cx, 2)}:{round(cy, 2)}"


déf ajouter_poly_si_visible(polys, vus, poly, larg, haut):
    si non poly_visible(poly, larg, haut):
        retour
    cle = cle_poly(poly)
    si cle dans vus:
        retour
    vus.add(cle)
    polys.append(poly)


déf generer_trihexagonal(larg, haut, cote):
    polys = []
    vus = set()
    pas_x = 2.0 * (apotheme_polygone(6, cote) + apotheme_polygone(3, cote))
    pas_y = math.sqrt(3.0) * (apotheme_polygone(6, cote) + apotheme_polygone(3, cote))
    rang = 0
    y = -pas_y
    tantque y <= haut + pas_y:
        decal = (rang % 2) * (pas_x / 2.0)
        x = -pas_x + decal
        tantque x <= larg + pas_x:
            hexagone = polygone_regulier(x, y, cote, 6, -math.pi / 2.0)
            ajouter_poly_si_visible(polys, vus, hexagone, larg, haut)
            pour i dans range(len(hexagone)):
                tri = triangle_depuis_arete(hexagone[i], hexagone[(i + 1) % len(hexagone)])
                ajouter_poly_si_visible(polys, vus, tri, larg, haut)
            x += pas_x
        rang += 1
        y += pas_y
    retour polys


déf generer_trihexagonal_snub(larg, haut, cote):
    polys = generer_trihexagonal(larg, haut, cote * 0.82)
    triangles = generer_triangles(larg, haut, cote * 0.72)
    pour i dans range(len(triangles)):
        si i % 3 == 0:
            polys.append(triangles[i])
    retour polys


déf generer_triangulaire_elongue(larg, haut, cote):
    polys = []
    vus = set()
    h = math.sqrt(3.0) * cote / 2.0
    y = -h
    tantque y <= haut + h:
        x = -cote
        tantque x <= larg + cote:
            carre = [(x, y + h), (x + cote, y + h), (x + cote, y + h + cote), (x, y + h + cote)]
            tri_haut = [(x, y + h), (x + cote / 2.0, y), (x + cote, y + h)]
            tri_bas = [(x, y + h + cote), (x + cote / 2.0, y + h + cote + h), (x + cote, y + h + cote)]
            ajouter_poly_si_visible(polys, vus, carre, larg, haut)
            ajouter_poly_si_visible(polys, vus, tri_haut, larg, haut)
            ajouter_poly_si_visible(polys, vus, tri_bas, larg, haut)
            x += cote
        y += cote + h
    retour polys


déf generer_carre_snub(larg, haut, cote):
    polys = []
    vus = set()
    pas = cote * (1.0 + math.sqrt(3.0))
    y = -pas
    tantque y <= haut + pas:
        x = -pas
        tantque x <= larg + pas:
            carre = polygone_regulier(x, y, cote, 4, math.pi / 4.0)
            ajouter_poly_si_visible(polys, vus, carre, larg, haut)
            pour i dans range(4):
                p1 = carre[i]
                p2 = carre[(i + 1) % 4]
                p3 = carre[(i + 2) % 4]
                tri_arete = triangle_depuis_arete(p1, p2)
                ajouter_poly_si_visible(polys, vus, tri_arete, larg, haut)
                mx = (p2[0] + p3[0]) / 2.0
                my = (p2[1] + p3[1]) / 2.0
                decal = cote * 0.55
                si i % 2 == 1:
                    decal = -decal
                tri_interne = [p2, p3, (mx, my + decal)]
                ajouter_poly_si_visible(polys, vus, tri_interne, larg, haut)
            x += pas
        y += pas
    retour polys


déf generer_rhombitrihexagonal(larg, haut, cote):
    polys = []
    vus = set()
    pas_x = 2.0 * (apotheme_polygone(6, cote) + apotheme_polygone(4, cote))
    pas_y = math.sqrt(3.0) * (apotheme_polygone(6, cote) + apotheme_polygone(4, cote))
    rang = 0
    y = -pas_y
    tantque y <= haut + pas_y:
        decal = (rang % 2) * (pas_x / 2.0)
        x = -pas_x + decal
        tantque x <= larg + pas_x:
            hexagone = polygone_regulier(x, y, cote, 6, -math.pi / 2.0)
            ajouter_poly_si_visible(polys, vus, hexagone, larg, haut)
            pour i dans range(len(hexagone)):
                p1 = hexagone[i]
                p2 = hexagone[(i + 1) % len(hexagone)]
                mx = (p1[0] + p2[0]) / 2.0
                my = (p1[1] + p2[1]) / 2.0
                dx = p2[0] - p1[0]
                dy = p2[1] - p1[1]
                longueur = math.hypot(dx, dy)
                si longueur == 0:
                    continuer
                nx = -dy / longueur
                ny = dx / longueur
                carre = polygone_regulier(
                    mx + nx * apotheme_polygone(4, cote),
                    my + ny * apotheme_polygone(4, cote),
                    cote,
                    4,
                    math.atan2(dy, dx)
                )
                tri = [p1, p2, (p2[0] + nx * apotheme_polygone(3, cote) * 0.9,
                                p2[1] + ny * apotheme_polygone(3, cote) * 0.9)]
                ajouter_poly_si_visible(polys, vus, carre, larg, haut)
                ajouter_poly_si_visible(polys, vus, tri, larg, haut)
            x += pas_x
        rang += 1
        y += pas_y
    retour polys


déf generer_carre_tronque(larg, haut, cote):
    polys = []
    vus = set()
    pas = 2.0 * apotheme_polygone(8, cote) + cote
    y = -pas
    tantque y <= haut + pas:
        x = -pas
        tantque x <= larg + pas:
            octogone = polygone_regulier(x, y, cote, 8, math.pi / 8.0)
            carre_1 = polygone_regulier(x + pas / 2.0, y, cote, 4, math.pi / 4.0)
            carre_2 = polygone_regulier(x, y + pas / 2.0, cote, 4, math.pi / 4.0)
            ajouter_poly_si_visible(polys, vus, octogone, larg, haut)
            ajouter_poly_si_visible(polys, vus, carre_1, larg, haut)
            ajouter_poly_si_visible(polys, vus, carre_2, larg, haut)
            x += pas
        y += pas
    retour polys


déf generer_grand_rhombitrihexagonal(larg, haut, cote):
    polys = []
    vus = set()
    pas_x = 2.0 * (apotheme_polygone(12, cote) + apotheme_polygone(6, cote) + apotheme_polygone(4, cote))
    pas_y = math.sqrt(3.0) * (apotheme_polygone(12, cote) + apotheme_polygone(6, cote) + apotheme_polygone(4, cote))
    rang = 0
    y = -pas_y
    tantque y <= haut + pas_y:
        decal = (rang % 2) * (pas_x / 2.0)
        x = -pas_x + decal
        tantque x <= larg + pas_x:
            dodec = polygone_regulier(x, y, cote, 12, math.pi / 12.0)
            ajouter_poly_si_visible(polys, vus, dodec, larg, haut)
            pour i dans range(len(dodec)):
                p1 = dodec[i]
                p2 = dodec[(i + 1) % len(dodec)]
                mx = (p1[0] + p2[0]) / 2.0
                my = (p1[1] + p2[1]) / 2.0
                dx = p2[0] - p1[0]
                dy = p2[1] - p1[1]
                longueur = math.hypot(dx, dy)
                si longueur == 0:
                    continuer
                nx = -dy / longueur
                ny = dx / longueur
                si i % 2 == 0:
                    poly = polygone_regulier(
                        mx + nx * apotheme_polygone(6, cote),
                        my + ny * apotheme_polygone(6, cote),
                        cote,
                        6,
                        -math.pi / 2.0
                    )
                sinon:
                    poly = polygone_regulier(
                        mx + nx * apotheme_polygone(4, cote),
                        my + ny * apotheme_polygone(4, cote),
                        cote,
                        4,
                        math.atan2(dy, dx)
                    )
                ajouter_poly_si_visible(polys, vus, poly, larg, haut)
            x += pas_x
        rang += 1
        y += pas_y
    retour polys


déf generer_hexagonal_tronque(larg, haut, cote):
    polys = []
    vus = set()
    pas_x = 2.0 * apotheme_polygone(12, cote)
    pas_y = math.sqrt(3.0) * apotheme_polygone(12, cote)
    rang = 0
    y = -pas_y
    tantque y <= haut + pas_y:
        decal = (rang % 2) * (pas_x / 2.0)
        x = -pas_x + decal
        tantque x <= larg + pas_x:
            dodec = polygone_regulier(x, y, cote, 12, math.pi / 12.0)
            ajouter_poly_si_visible(polys, vus, dodec, larg, haut)
            pour i dans range(0, len(dodec), 2):
                tri = triangle_depuis_arete(dodec[i], dodec[(i + 1) % len(dodec)])
                ajouter_poly_si_visible(polys, vus, tri, larg, haut)
            x += pas_x
        rang += 1
        y += pas_y
    retour polys


déf generer_polygones_selon_methode(larg, haut, cote, methode):
    si methode == "hex":
        centres = generer_centres_hex(larg, haut, cote)
        retour [sommets_hexagone_pointu(cx, cy, cote) pour (cx, cy) dans centres]
    sinonsi methode == "carre":
        retour generer_carres(larg, haut, cote)
    sinonsi methode == "triangle":
        retour generer_triangles(larg, haut, cote)
    sinonsi methode == "trihex":
        retour generer_trihexagonal(larg, haut, cote)
    sinonsi methode == "snub_trihex":
        retour generer_trihexagonal_snub(larg, haut, cote)
    sinonsi methode == "triangulaire_elongue":
        retour generer_triangulaire_elongue(larg, haut, cote)
    sinonsi methode == "carre_snub":
        retour generer_carre_snub(larg, haut, cote)
    sinonsi methode == "rhombitrihex":
        retour generer_rhombitrihexagonal(larg, haut, cote)
    sinonsi methode == "carre_tronque":
        retour generer_carre_tronque(larg, haut, cote)
    sinonsi methode == "grand_rhombitrihex":
        retour generer_grand_rhombitrihexagonal(larg, haut, cote)
    sinonsi methode == "hex_tronque":
        retour generer_hexagonal_tronque(larg, haut, cote)
    sinon:
        lever ValueError(
            f"Methode inconnue '{methode}' : choisir 'hex', 'carre', 'triangle', "
            "'trihex', 'snub_trihex', 'triangulaire_elongue', 'carre_snub', "
            "'rhombitrihex', 'carre_tronque', 'grand_rhombitrihex' ou 'hex_tronque'"
        )


# Masque par tuile

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
    decales = [(px - x0, py - y0) pour (px, py) dans poly]
    img_masque = Image.new("L", (larg_bbox, haut_bbox), 0)
    ImageDraw.Draw(img_masque).polygon(decales, fill=255)
    masque = np.array(img_masque, dtype=bool)
    retour (x0, y0, masque)


# Couleur representative

déf couleur_representative(pixels, mode_couleur="moyenne", groupes=3, max_echantillons=2000, mini_batch=Vrai):
    si pixels est Aucun ou pixels.size == 0:
        retour (0, 0, 0)

    si mode_couleur == "moyenne" ou (non SKLEARN_DISPONIBLE):
        moy = pixels.mean(axis=0)
        retour (int(round(moy[0])), int(round(moy[1])), int(round(moy[2])))

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
                labels = mbk.predict(echantillon)
                comptes = np.bincount(labels, minlength=k)
                dominant = np.argmax(comptes)
                centroide = mbk.cluster_centers_[dominant]
        sinon:
            centroide = echantillon.mean(axis=0)
        retour (int(round(centroide[0])), int(round(centroide[1])), int(round(centroide[2])))
    sauf Exception:
        moy = echantillon.mean(axis=0)
        retour (int(round(moy[0])), int(round(moy[1])), int(round(moy[2])))


# Carrelage principal

déf carreler_image(chemin_entree, chemin_sortie,
                   methode="hex",
                   cote=30,
                   mode_couleur="moyenne",
                   groupes=3,
                   mini_batch=Vrai,
                   max_echantillons=2000,
                   epaisseur_contour=0,
                   couleur_contour=(0, 0, 0, 120)):

    im = Image.open(chemin_entree).convert("RGBA")
    larg, haut = im.size
    arr = np.array(im.convert("RGB"))

    sortie = Image.new("RGBA", (larg, haut), (0, 0, 0, 0))
    dessin = ImageDraw.Draw(sortie, "RGBA")

    polygones = generer_polygones_selon_methode(larg, haut, cote, methode)

    pour poly dans polygones:
        x0, y0, masque = masque_et_bbox(poly, larg, haut)
        si masque est Aucun:
            continuer
        sous = arr[y0:y0 + masque.shape[0], x0:x0 + masque.shape[1]]
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


# Exemple d'utilisation

si __name__ == "__main__":
    demo_entree = "images/photo.jpg"
    demo_hex = "sortie_hex.png"
    demo_carre = "sortie_carre.png"
    demo_tri = "sortie_triangle.png"
    demo_trihex = "sortie_trihex.png"
    cote = 40
    mode = "kmeans"

    si os.path.exists(demo_entree):
        afficher("Traitement de", demo_entree)
        carreler_image(demo_entree, demo_hex, methode="hex", cote=cote, mode_couleur=mode)
        carreler_image(demo_entree, demo_carre, methode="carre", cote=cote, mode_couleur=mode)
        carreler_image(demo_entree, demo_tri, methode="triangle", cote=cote, mode_couleur=mode)
        carreler_image(demo_entree, demo_trihex, methode="trihex", cote=cote, mode_couleur=mode)
        afficher("Sorties :", demo_hex, demo_carre, demo_tri, demo_trihex)
    sinon:
        afficher("Aucune image de demonstration trouvee dans", demo_entree)
