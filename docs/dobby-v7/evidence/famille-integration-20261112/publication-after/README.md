# Conservation après publication Famille

**Résultat : PASS.** La branche distante `main` pointe sur la publication **`92c1eb44d28dd8ed1cdac07ddd46e76de829d3b5`**, dont le parent est le commit de référence avant publication **`bce17c82ef42fefb2790203a19732665f8c8203d`**.

Les **29 entrées racine précédentes possèdent exactement les mêmes modes, types et identifiants d’objets Git**. La seule nouvelle entrée est `essai-dobby-v7-famille-review-20261112/` ; la racine passe de 29 à 30 entrées. Le diff récursif contient **297 ajouts exclusivement dans ce dossier, aucune modification et aucune suppression**. Les preuves brutes sont `root-tree.txt` et `git-diff-name-status.txt`. Une seconde lecture indépendante confirme ces résultats.

Les **21 ressources HTTP de référence** enregistrées avant publication ont été relues aux mêmes URL : toutes répondent HTTP 200 et conservent leur SHA-256, avec des octets identiques aux copies précédentes et au commit publié. Cela comprend les 10 manifestes préexistants, l’entrée racine et les 10 références V7 globales. Les réponses et comparaisons sont dans `http/`, `http-receipts.json` et `receipt.json`.

Le [nouveau manifeste public](https://portenartco.github.io/dobby-demo/essai-dobby-v7-famille-review-20261112/review-manifest.json) répond **HTTP 200**. Il est **identique octet pour octet** au manifeste du worktree de publication `/workspace/dobby-v7-famille-pages-publish-20261112/` et à son blob dans le commit `92c1eb44…`. Son SHA-256 est **`61b6b3fb2f1e155e0ad947207b18418100442200ed702c30f1096a3a2ece300c`**.

Ses références vérifiées sont :

- Version : `V7-FAMILLE` ; 296 ressources recensées.
- Source : `5b764ef367553e9945fb72a6b563b55adc41e040` ; état `committed`, `sourceDirtyPaths: []`.
- Base : `6a6fcd9bcee522da7342de391e5c3d7bfe1955b3`.
- Source Famille : `a28a1e74e6fd6fcb0db8b154002ce032ae10f130`.
- Stockage : `dobby-review-v7-famille-20261112|client-{A|B}|` ; backend simulé : `dobby-review-v7-famille-20261112|backend-v1`.
- `realBackend: false`, `realAuth: false`, `migrationsApplied: false`, publication `new-directory-only`.

Cette vérification a seulement lu Git et les URL publiques, puis écrit les preuves de ce dossier. Elle n’a changé aucune branche, modifié aucun fichier applicatif ni effectué de nouvelle publication. Les parcours navigateur hébergés sont consignés séparément.
