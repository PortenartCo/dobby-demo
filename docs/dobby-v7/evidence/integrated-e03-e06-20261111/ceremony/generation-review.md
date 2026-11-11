# Revue ciblée — génération de la cérémonie

Date : 2026-11-11. Diff relu : `/workspace/scratch/integrated-ceremony-generation-fix.diff`.

## Périmètre

Lecture du correctif de `essai-stitch-v7/build-onboarding.cjs`, des métadonnées générées dans `route-manifest.json`, du nouveau test `review-integrated-ceremony-build.test.cjs` et des preuves `ceremony-generation-red.txt`, `ceremony-generation-green.txt`, `ceremony-generation-real.txt` et `ceremony-generation-real.json`. Aucun test, build, contrôle fonctionnel, appel backend ou changement de code n’a été exécuté par le relecteur. Ce rapport est le seul fichier écrit pour cette vérification. La revue du profil d’aperçu précédemment close reste inchangée.

## Constat et correction

**Défaut corrigé :** l’ancien générateur copiait systématiquement l’archive de scoring V1 sur le fichier canonique applicatif, annulant les formulations et le versionnement V2 lors d’une génération de présentation.

La copie destructive est supprimée. `build-onboarding.cjs:6` lit désormais le fichier canonique comme entrée ; aucune écriture ultérieure du script ne vise ce fichier. La lecture et le contrôle minimal de structure (ligne 7) précèdent la génération des fichiers de présentation. Une entrée canonique absente provoque un échec ; aucun repli sur l’archive historique n’est ajouté.

Le manifeste (ligne 13) indique le chemin canonique utilisé, le hash de ses octets, sa version globale et les versions Maison/Patronus. L’archive conserve un chemin et un hash distincts. Le diff généré concorde avec ces champs : Maison `e06-v2`, Patronus `e06-v1`, hash canonique `0a86ad9a58fcb162dfc3a4739f6a39684b8b68326c2f40ea7a0af887631fcbcb`. Les métadonnées distinguent donc l’entrée réellement consommée de la référence historique.

## Qualité des preuves

Les tests utilisent des copies dans un répertoire temporaire et lancent le générateur depuis cette fixture ; ils n’exécutent pas le générateur dans le dépôt applicatif réel. Ils contrôlent la conservation exacte des octets canoniques et historiques, les formulations approuvées de q2, les versions, les hashes du manifeste, la conservation des autres sections de routes et la stabilité du manifeste après une seconde génération. Un second cas vérifie l’échec sans création de configuration de remplacement lorsque l’entrée canonique manque.

Le journal RED fourni présente les deux échecs causaux attendus : écrasement V2 par V1 et succès indu lorsque l’entrée canonique manque. Le journal GREEN fourni consigne deux PASS, zéro échec. La preuve de génération réelle consigne une exécution, huit templates générés, les octets canoniques inchangés et uniquement `route-manifest.json` parmi les sorties générées modifiées. Ces résultats sont repris comme preuves fournies, sans répétition ni observation indépendante de leur exécution.

## Verdict et limites

**Correction conforme ; aucun finding matériel dans ce diff ciblé.** Le générateur préserve désormais l’entrée canonique et décrit sa provenance effective. Les tests couvrent directement les deux comportements défectueux, avec une fixture isolée, et la preuve réelle fournie confirme la conservation des octets sur une exécution.

Cette revue ne valide pas le sens des pondérations du scoring, la migration des brouillons, les résultats historiques des utilisateurs, les parcours en navigateur, le rendu ou une intégration serveur. Le contrôle de structure ajouté est minimal ; il ne constitue pas une validation exhaustive du schéma de scoring. Aucune publication ni conclusion sur un fonctionnement publié ne découle de ce contrôle de génération.
