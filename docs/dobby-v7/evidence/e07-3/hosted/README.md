# Aperçu E07.3 — fonctionnement réellement hébergé

**FONCTIONNEMENT_HÉBERGÉ_VÉRIFIÉ — PASS 320, 390 et 1440 px.**

URL testée : https://portenartco.github.io/dobby-demo/essai-dobby-e07-review-20261111/

- Source attendue et reçue dans le manifeste HTTP : `c121027e53b335800d1559a39481c774a137a3fa`.
- SHA-256 du manifeste reçu : `505693c7489e813872cf8bfe79533462830590cc552b9610bc3a0b271a996831` ; 274 fichiers applicatifs déclarés.
- Espace propre : `dobby-review-e073-20261111|` ; backend réel désactivé.
- Script `essai-stitch-v7/tests/e07-3-preview.cjs` inchangé depuis la recette locale. Aucune interception de requête, ressource ou moteur remplacé, ni injection de données métier.

[Journal réel](green.log) · [Résultats des trois largeurs](results.json) · [Source et identité HTTP](source-binding.json) · [Manifeste servi](served-manifest.json).

## Parcours réellement effectués sur l’URL publiée

1. Ouverture de la démonstration identifiée, deux repas fictifs indépendants, semaines précédente/suivante et sélection sans écriture du planning natif.
2. Catalogue et favoris : ajout, rechargement, annulation puis confirmation du retrait. Navigation arrière/avant vers le choix d’ajout.
3. Formulaire manuel existant : vraie création d’une recette, consultation et retour au catalogue.
4. Copie effective du prompt vers le presse-papiers du navigateur de test.
5. Import JSON V1 de deux recettes par le sélecteur de fichiers, aperçu, annulation sans écriture, nouvelle analyse puis confirmation explicite.
6. Import ZIP V2 par le sélecteur : PNG de fixture réellement décodé 10 × 8, original retrouvé octet pour octet dans le blob store natif, recette unique avec adaptation TM5 liée forcée « À vérifier ». Les réglages absents restent vides.
7. Filtres Classique et TM5 sur la même recette, photographie après rechargement, réimport du même ZIP avec conservation par défaut et absence de doublon ou remplacement silencieux. Planning initial toujours identique.
8. Courses : véritable ajout, rechargement, puis cinq destinations permanentes qui restent toutes dans le nouveau sous-répertoire.
9. Réinitialisation avec deux onglets : seul l’aperçu E07.3 est remis à zéro. Sentinelles LocalStorage/SessionStorage, six bases IndexedDB des autres espaces et leurs blobs de photos de fixture préservés.

**Zéro POST/backend, zéro tentative externe, zéro ressource HTTP manquante** pour chaque largeur. Les fixtures et sentinelles sont créées exclusivement dans des contextes Chromium neufs ; aucun compte, recette privée ou photographie familiale réelle n’est utilisé.

## Portée de la preuve

Cette recette confirme les comportements du nouvel aperçu public et son lien au SHA source. La publication et les 279 comparaisons d’octets HTTP sont contrôlées séparément par l’agent principal. Le commit de publication communiqué est `84e254f485a22ac4f5b880217c02902c22b39c73` et le workflow Pages communiqué est [43016384119](https://github.com/PortenartCo/dobby-demo/actions/runs/43016384119).

**SYNCHRONISATION_RÉELLE_NON_VÉRIFIÉE** : l’aperçu est fictif et isolé, et les photographies restent sur cet appareil. Aucun appel à une IA ni à un backend familial réel. Recette Chromium responsive ; aucun essai physique Safari/iPhone revendiqué. La revue détaillée des sous-pages reste à réaliser par l’utilisateur.
