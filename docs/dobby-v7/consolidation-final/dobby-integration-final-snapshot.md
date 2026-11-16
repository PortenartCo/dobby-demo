# DOBBY V7 — état final vérifié le 16 novembre 2026, 23:40 UTC

Ce relevé remplace les conclusions des snapshots intermédiaires. Contacts/Stitch24 est livré et intégré ; les anciens constats d’absence ou de CI Archives rouge sont historiques.

## Sources et GitHub

Source applicative composée : **`af015f8c334b67112ee197293611bdecc88d7905`**, branche **`integration/dobby-v7-consolidated-20261116`**. Elle contient les trois HEAD suivants (ascendance Git vérifiée), ainsi que le module Paramètres développé par root :

| Lot | Source exacte | PR | État des checks au SHA |
|---|---|---|---|
| Archives / Stitch22 | `aafdded5005a67c1778128fda53b72275229b67f` | [17](https://github.com/PortenartCo/dobby-demo/pull/17), draft/open, non fusionnée | fonctionnel, Archives, Sync et SQL local : success |
| Notes / Stitch23 | `1913e981a6437252569306e88b59f65c66a8b2fc` | [18](https://github.com/PortenartCo/dobby-demo/pull/18), draft/open, non fusionnée | fonctionnel et SQL local : success sur PR/push |
| Contacts / Stitch24 | `27b9f9cd9a53492887ddd32047a07f588b2d3192` | [20](https://github.com/PortenartCo/dobby-demo/pull/20), draft/open, non fusionnée | fonctionnel, Sync et SQL local : success sur PR/push |

Les doublons annulés sont conservés dans GitHub ; tous les checks non annulés de ces SHA sont terminés avec succès au contrôle de 23:39 UTC. Preuves : `dobby-final-github-checks.json` et `dobby-final-github-snapshot.json` sous `/workspace/scratch/`.

Le HEAD local observé à la fin de la validation est `8fe5af4d08ace4481f62c9639504545aa8ec3412` ; **aucun fichier runtime V7/V5 ou racine applicative ne diffère du SHA source `af015f8`**. Les commits d’aperçu/preuves postérieurs ne sont pas une nouvelle version du runtime testé.

## Validation Archives sur la composition finale

Toutes les commandes suivantes ont terminé avec **exit 0**, sans erreur ni timeout dans leurs journaux finaux :

| Campagne | Résultat | Preuve sous `/workspace/scratch/` |
|---|---|---|
| Consultation native, cycle actif → archive → réactivation | **36/36**, neuf variantes à 320/390/768/1440 px | `archives-final-af015f8-native.log`, `archives-final-af015f8/after.json` et captures |
| Revue causale et isolation | **7/7** | `archives-final-af015f8-review.log` |
| Concurrence fichiers, confirmation, droits, retour recette | **7/7** | `archives-final-af015f8-races.log` |
| Sources, sauvegardes, statut local/partagé, références et octets | **PASS** | `archives-final-af015f8-sources.log` |
| Writers et synchronisation Archives | **14/14**, zéro échec | `archives-final-af015f8-writers.log` |

Le reçu structuré `archives-final-validation-receipt.json` confirme les 36 cas natifs, leur lecture seule, les données conservées, les listes natives et le rechargement, ainsi que l’absence de changement runtime depuis `af015f8`.

## Corrections de tests nécessaires à la composition

L’auteur de cet audit a modifié exclusivement `essai-stitch-v7/tests/archives-native-consultation.cjs`, sans commit, changement de branche ni mutation distante :

- Comparaison HTML Documents : seule l’origine des attributs d’image `src` same-origin est neutralisée entre serveur de référence 8765 et serveur CI 8876. Tous les chemins, textes, classes et octets de structure restent strictement comparés. Rouge avant/vert après prouvés ; mutations d’asset, texte, structure et origine étrangère toujours refusées (`archives-origin-guardrails.json`). Root a enregistré cette partie avant le merge amont.
- Notes locales : ouverture de l’ancien volet seulement s’il existe ; l’enregistrement exact doit toujours être visible après réactivation, y compris dans la liste directe Stitch23.
- Contact archivé : vérification du h1, des champs exacts du `dl[data-contact-detail]` et du lien e-mail natifs Stitch24 ; les commandes `rg-contact-edit` et `rg-contact-delete` sont ajoutées au contrôle « zéro commande écrivable ». La comparaison des données, identifiants et binaires reste inchangée. Ces deux dernières lignes Contacts sont laissées à root pour commit.

L’échec de dîner antérieur était une fixture sur le mauvais jour UTC/Bruxelles, corrigée en amont dans `f8c7876`. Une matrice indépendante à heure figée prouve qu’attendre davantage ne le résolvait pas : le même repas passe dès que la fixture utilise le jour réellement affiché. Les timeouts observés pendant les merges avec marqueurs de conflit sont exclus des résultats finaux ; les campagnes ci-dessus ont été relancées sur la source stable.

## Publication et portée

`main` et GitHub Pages sont au **`c40f4a8df544fe7ae36a0b6b5f829fd8c8c74a76`**, Pages `built`, sans erreur, mode legacy `main:/`. Les sources applicatives de ce main restent identiques à `a4190bb` ; les changements suivants concernent uniquement les aperçus isolés Archives/Contacts. La composition finale doit rester accessible par son bundle isolé immuable sur la branche d’intégration, selon le choix de root ; aucune fusion des PR applicatives ni mutation de main n’a été effectuée par cet audit.

Les résultats locaux et CI reposent sur des données fictives et profils jetables avec réseau externe bloqué. Ils ne certifient pas les deux vrais comptes familiaux, un appareil physique ou des opérations Auth/RLS/Storage réelles. Aucun SQL ni changement Supabase n’a été effectué.
