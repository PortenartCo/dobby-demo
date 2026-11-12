# Preuves — Intégration Famille 2026-11-12

Les phases sont conservées séparément pour permettre de distinguer les essais préparatoires des résultats de livraison.

| Preuve | Objet et résultat |
|---|---|
| reconciliation.json | Cherry-picks FAM sur la source globale ; ensembles de changements disjoints |
| committed-source-boundary.json | Dix fichiers globaux critiques identiques à 6a6fcd9 ; sources propres au commit livré |
| family/ | 227 cas natifs/Node et parcours Famille ; source initiale avant le petit correctif de disclosure |
| transverse/ | Courses E02, CAS, Runes, mémos ; source et candidat préparatoire |
| ci-current/ | Premier runner local : 10/11, dernier test d’import replié en échec ; résultat préparatoire conservé, pas une preuve finale verte |
| refresh-regression-red.log | Régression reproduite : refresh refermait la section des anciens mémos |
| preview-reset-wait-error.log | Ancienne attente du test de reset lisait un document sur le point de recharger |
| local-preview/ | Candidat working-tree après correction : trois largeurs et 296 empreintes réussies |
| committed-preview/ | Bundle reconstruit depuis 5b764ef, sources commises : trois largeurs, reset isolé, 296 empreintes réussies |
| independent-review.md, visual-review.md | Revue indépendante des frontières, du correctif et des captures |
| publication-before/ | Snapshot Git/HTTP avant publication, 29 entrées existantes et 21 ressources conformes |
| ci-remote/ | CI distantes exactes du SHA source, reçus et journaux |

La recette publique et la conservation après publication sont complètes :

| Preuve finale | Résultat |
|---|---|
| hosted-preview/proof.json | 320/390/1440, création/modification, permissions, synchronisation/hors ligne, reset isolé ; 296 HTTP200/SHA256 conformes |
| hosted-transverse/result.json | Six contrôles publics E02/Courses/CAS/Runes/mémos réussis ; zéro erreur/requête externe/mutation HTTP |
| hosted-family/results.json | Effets publics : 39 combinaisons et 39 captures, OFF persistant et mouvement réduit |
| publication-after/receipt.json | 29 anciennes entrées Git et 21 ressources publiques conservées, seul le nouveau dossier ajouté |
| ci-remote/receipts.json | Sync, Stitch V7 et Pages SUCCESS aux SHA exacts |
| delivery-summary.json | Récapitulatif vérifié de la livraison |

 Aucune preuve simulée ne vaut garantie de permissions serveur ou d’usage sur deux appareils réels.

Les journaux et copies HTTP sont conservés tels que capturés, y compris les espaces de fin de ligne des pages historiques. Ils sont exclus du contrôle de whitespace des nouvelles sources et de la rédaction ; leurs empreintes HTTP restent vérifiables sans normalisation.
