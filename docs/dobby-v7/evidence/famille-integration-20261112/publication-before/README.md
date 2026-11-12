# État avant publication Famille

La référence `origin/main` a été actualisée par `git fetch origin main`, sans changement de branche ni de copie de travail. Le commit observé est **`bce17c82ef42fefb2790203a19732665f8c8203d`**. Ses **29 entrées racine** et leurs identifiants d’objets Git sont conservés dans `root-tree.txt` et `receipt.json`. L’arbre récursif de l’aperçu V7 global est enregistré dans `global-recursive-tree.txt`.

Les **10 manifestes publics** des dossiers `essai-dobby-*` qui en possèdent un, l’entrée publique racine et **10 ressources de référence V7 globales** ont été téléchargés en lecture seule : **21 réponses HTTP 200**, toutes identiques octet pour octet aux objets Git de ce commit. Les copies sont dans `http/` ; URL, en-têtes, tailles et SHA-256 sont dans `http-receipts.json`.

Le manifeste V7 global public identifie la source commise **`6a6fcd9bcee522da7342de391e5c3d7bfe1955b3`**, version `V7-GLOBAL`. Son SHA-256 est **`1575b76e2f4d271224afb6b293e36920533445ab1d3dae10c5a7d2ec7a105a5e`**. Son arbre Git est **`0777fb019ca9049f9f6e75ab1096c6ae27273c76`**.

Le nouveau dossier **`essai-dobby-v7-famille-review-20261112/` est absent de l’arbre Git observé**. Son entrée publique et son manifeste répondent tous deux **HTTP 404**. Une seconde lecture indépendante a confirmé les 29 entrées, les 10 manifestes existants et cette absence dans Git.

Cette opération a seulement écrit les présentes preuves documentaires. Aucune branche n’a été changée, aucun fichier applicatif modifié et aucune publication effectuée. Ces empreintes constituent la référence à comparer après l’ajout du seul nouveau dossier. Un changement ultérieur de `origin/main` devra être repris en compte avant de publier.
