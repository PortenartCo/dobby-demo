# DOBBY V7 · Rapprochement du catalogue #40

**Production éditoriale terminée.** Le dossier OneDrive fourni par le propriétaire livre l’index final `CATALOGUE_LOCAL_COMPLET`, le CSV, l’ordre d’import et les vingt lots clôturés. Les octets restent dans un dossier de travail privé de la recette locale. Les éléments intermédiaires et les pilotes remplacés sont exclus du décompte. [Registre #40](https://github.com/PortenartCo/dobby-demo/issues/40)

## Vérifications techniques

| Contrôle | Résultat |
| --- | --- |
| Livraison | 20 ZIP, leurs 20 manifestes, leurs 20 sidecars et les 3 fichiers de l’index récupérés par le connecteur autorisé. SHA-256 externes conformes et ZIP lisibles. |
| Inventaire | 400 identifiants d’import distincts et stables, 200 classiques et 200 diététiques, chacune avec 140 plats, 30 entrées et 30 desserts. Quatre portions dans les 400 fiches. |
| Durées | 198 fiches ≤ 30 min, 136 de 31 à 60, 66 au-delà de 60. Écart accepté par le propriétaire sur les objectifs indicatifs 240 / 120 / 40. |
| Illustrations | 2 105 WebP uniques par SHA-256, dont 400 couvertures et 1 705 illustrations d’étapes classiques. Les contrôles ci-dessus portent sur les fichiers. |
| V7 natif | Les 20 exports V2 sont lisibles par le parseur ZIP et le validateur natifs, avec 400 fiches normalisées et 2 105 références. La normalisation rejouée conserve les 400 clés et les 400 fiches sont éligibles à « Avec mes ingrédients ». |
| PostgreSQL local | Les scripts fournis ont été exécutés sur PostgreSQL 17.7 jetable, isolé du réseau. Premier passage de 400 lignes, second sans modification, égalité des JSONB avec les exports, 2 105 références, lecture publique anonyme et mutation authentifiée refusées dans ce banc. |
| Projection pour la recette privée | 400 entrées à identifiant `catalogue-${importKey}`, format attendu par V5/V7 et WebP conservés à l’octet. La projection écarte les répertoires QA, documents et données source et reste hors de Git. |

Le champ `transportQa` du manifeste livré distingue 5 attestations PASS et 395 UNVERIFIED. Le contrôle natif et le rejeu isolé ci-dessus constituent les preuves techniques ajoutées. Le rapport de livraison et ces vérifications gardent des périmètres distincts. Les validations physiques en cuisine, les cumuls diététiques du planning et les essais TM5 sur appareil restent à faire. La livraison contrôlée contient des images d’étapes classiques.

## Poids et diffusion éventuelle

| Ensemble | Poids |
| --- | --- |
| 20 enveloppes OneDrive | 244 498 780 octets, avec exports imbriqués et preuves |
| 20 ZIP natifs seuls | 80 476 981 octets |
| 2 105 WebP canoniques sans double copie | 79 698 414 octets |
| Projection privée, WebP et registre JavaScript | 81 903 741 octets |
| Périmètre statique V7/V5 et actifs V6, base de travail hors catalogue | Environ 59 Mo bruts suivis |
| Arbre Git brut de la candidate de départ | Environ 2,05 Go de blobs par chemin, avec preuves, maquettes et anciens aperçus |

La configuration GitHub Pages observée publie `main:/`. La limite documentée porte sur le site effectivement publié, à 1 Go, avec un seuil indicatif de 100 Go de trafic mensuel. La taille brute de Git ne mesure pas l’artefact actuel de Pages. Une livraison dédiée aux ressources d’exécution V7/V5, sous le même préfixe relatif, reste dans l’ordre de 141 Mo bruts avec la projection agrégée. Une éventuelle modification du mode de publication et le quota disponible exigent un GO séparé. [Limites officielles GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)

Les listes Grimoire et choix du repas chargent les couvertures éditoriales au défilement. À 390 px sur le jeu privé complet, Chromium affiche 400 couvertures différées et n’en demande que 5 dans le Grimoire et 10 dans le choix du repas à la première zone visible. La dernière se décode après défilement. Le registre de métadonnées JavaScript, 2 205 327 octets dans cet aperçu, reste chargé au démarrage du moteur natif. Le cache PWA contient les ressources du shell. Le registre et les WebP du catalogue sont hors précache.

## Intégration idempotente et confidentialité

1. Retenir l’ordre de l’index final et vérifier empreintes, version, liens aux WebP et unicité des clés. Conserver les fichiers de livraison et reçus dans l’espace privé.
2. Pour la recette locale, associer uniquement la projection `recipes.js` et son dossier d’images WebP au chemin natif `essai-stitch-v5-famille/catalogue/` d’un **artefact privé séparé**. Les favoris, menus, recettes personnelles et courses gardent leurs writers natifs. Réutiliser les mêmes identifiants à chaque assemblage. Les images du catalogue commun évitent le quota de médias privés par foyer.
3. Avant diffusion, viser la revue par lot exact exigée par `build-recipe-catalogue.mjs`, notamment droits de diffusion, échantillons, anomalies d’images et contrôle diététique privé. Vérifier la projection publique séparément. Les ZIP, SQL de livraison, fichiers QA, CSV de travail, manifestes privés et documents de référence personnels ne font pas partie du site. La projection de recette privée reste en zone protégée jusqu’à ce visa.
4. Si l’on retient plus tard une intégration côté Supabase, rapprocher d’abord le schéma et les privilèges réels. La livraison SQL locale ouvre la lecture de ce catalogue à tout compte `authenticated` dans sa fixture. Avant tout import hébergé, vérifier la compatibilité de ce choix avec l’admission et la révocation du service, l’espace disponible et la confidentialité. Exiger 400 identifiants et les mêmes références après un second passage sur une restauration isolée.

Les rapports agrégés et les mesures de chargement peuvent accompagner la PR. Les octets de livraison et de l’aperçu demeurent séparés.
