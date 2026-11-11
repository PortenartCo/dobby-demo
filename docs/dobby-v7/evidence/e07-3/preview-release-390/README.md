# Bundle final E07.3 — recette locale à 390 px

**PASS** avec le script inchangé `essai-stitch-v7/tests/e07-3-preview.cjs`.

- URL locale : `http://127.0.0.1:8896/essai-dobby-e07-review-20261111/`.
- SHA source attendu et réellement vérifié dans le manifeste servi : `c121027e53b335800d1559a39481c774a137a3fa`.
- SHA-256 du manifeste HTTP : `505693c7489e813872cf8bfe79533462830590cc552b9610bc3a0b271a996831`.
- 274 fichiers applicatifs déclarés ; espace isolé `dobby-review-e073-20261111|`.

[Journal](green.log) · [Résultat du parcours](result-390.json) · [Manifeste HTTP](served-manifest.json) · [Lien explicite au SHA source](source-binding.json).

Le parcours teste les véritables interfaces : calendrier et deux créneaux fictifs, catalogue/favoris/rechargement, création manuelle, copie du prompt, JSON V1 de deux recettes avec annulation avant import, ZIP V2/photo originale décodée et conservée/TM5 lié non vérifié, réimport sans doublon ni remplacement, planning conservé, Courses, cinq destinations, réinitialisation sur deux onglets. Les sentinelles brutes de Storage, six bases IndexedDB et leurs blobs de photos dans les autres espaces restent intactes. Zéro POST, tentative externe ou ressource HTTP manquante.

Aucun moteur, produit ou bundle modifié ; aucune reconstruction par cette recette. Ce contrôle ne constitue ni une publication ni une vérification de synchronisation réelle. Le fonctionnement de l’URL publiée reste à vérifier séparément.
