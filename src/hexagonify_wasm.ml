importer math

# Module WASM-compatible pour le carrelage d'images.
# Exporte uniquement des primitives numeriques simples utilisees
# par l'interface JavaScript pour generer la geometrie des tuiles.


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


# ── Codes de methode ──────────────────────────────────────────

déf methode_hexagone():
    retour 0


déf methode_carre():
    retour 1


déf methode_triangle():
    retour 2
