# Montant maximal représentable — contrôle ciblé

Source `b127b7b`, aucune modification du produit ni CSS. Nouveau cas permis par Personnalisée : `Number.MAX_SAFE_INTEGER = 9007199254740991`.

Test : `essai-stitch-v7/tests/review-integrated-rewards-large-amount.cjs`.

Le test crée et termine une mission avec le writer natif, puis consulte le Profil magique et l’identité finale. Le montant reste exactement `9007199254740991 runes` ; membres, résultats confirmés, missions, crédits et demandes sont identiques avant/après ces consultations.

| Largeur | Profil scrollWidth / clientWidth | Identité finale scrollWidth / clientWidth | Ancêtre clippant |
|---|---|---|---|
| 320 | 246 / 246 | 164 / 164 | Aucun |
| 390 | 316 / 316 | 212 / 212 | Aucun |
| 1440 | 382 / 382 | 220 / 220 | Aucun |

Le retour à la ligne existant conserve tous les chiffres, y compris à 320 px. Le Profil garde sa police 36 px et l’identité finale 20 px. Aucun débordement horizontal de page ni troncature ; les rectangles du texte sont contenus dans les ancêtres à overflow hidden/clip.

[Mesures complètes](measurements.json) · [PASS](green.txt). Captures d’observation, sans faux comparatif produit puisqu’aucune correction n’est nécessaire : [Profil 320](before-profile-320.png), [390](before-profile-390.png), [1440](before-profile-1440.png) ; [identité finale 320](before-identity-320.png), [390](before-identity-390.png), [1440](before-identity-1440.png).

Le premier harnais imposait par erreur `scrollHeight <= clientHeight` au texte du Profil : 88 contre 86 px, avec `overflow:visible`. L’encre de la fonte dépasse légèrement son interligne, mais aucun ancêtre ne la coupe. [Journal de cette première assertion](measurement-initial.txt) et [mesures initiales](before-results.json). La vérification a été corrigée pour détecter le clipping réel sur les deux axes, et non un débordement d’encre normal. Ce n’est pas un défaut produit ni un correctif CSS.

Un seul nouveau test ciblé exécuté, sans campagne générale ni répétition des tests métier précédemment verts. Contextes TEST jetables, réseau extérieur bloqué, aucune donnée réelle ou service modifié.
