# DOBBY V7 — MENU-DIFF-01

**Conclusion : aucune régression imputable au Menu observée dans le périmètre demandé. Aperçu isolé publié et vérifié. Aucun correctif applicatif nécessaire ; aucun test existant modifié pendant cette mission.**

## Comparaison exacte

- Famille : `5b764ef367553e9945fb72a6b563b55adc41e040`, worktree `/workspace/dobby-v7-menu-diff-famille`.
- Menu : `3f7fe0e36e1e142cefaada5d575196c436b444e4`, worktree `/workspace/dobby-v7-menu-diff-menu` ; runtime de l’implémentation `bb5f6b0` conservé.
- Les deux HEAD, fichiers suivis et empreintes des tests sont restés inchangés.

| Test | Famille | Menu | Opération défaillante, message et pile comparés |
|---|---|---|---|
| `family.cjs` | sortie 1 | sortie 1 | `member-new` désactivé ; timeout 12 000 ms, `family.cjs:14:62`, avant navigation Menu. |
| `e05-edge.cjs` | sortie 1 | sortie 1 | `#magic-patronus-edit` absent ; timeout 30 000 ms, `e05-edge.cjs:3:385`, avant navigation Menu. |
| `register-review.cjs` | 24 PASS / 4 FAIL, sortie 1 | 24 PASS / 4 FAIL, sortie 1 | Champs membre/médical désactivés : `menu-member-draft` et `menu-medical-draft` à 320/390, timeout 8 000 ms ; lignes `7:170` et `9:210`, avant navigation Menu. |

Les six messages complets et piles d’erreur Playwright sont identiques après remplacement **des seuls chemins absolus des worktrees**. stdout est identique sans normalisation ; stderr l’est après ce remplacement. Le même serveur Python, port `8771`, Node `24.19.0`, Playwright `1.62.1`, Chromium `154.0.8037.57`, environnement et fixtures ont été utilisés. Commande commune : `node --require /tmp/dobby-menu-diff-01/preload.cjs essai-stitch-v7/tests/<test>.cjs`. Le preload conserve aussi les erreurs internes que `register-review.cjs` intercepte.

Les écarts bruts sont conservés : durées, deux frames internes Node dans une capture diagnostique avant appel, et 314→317 tentatives bloquées vers les mêmes anciennes images/polices. Aucun nouvel URL externe ; le fichier contenant l’image est identique. La cause précise de cette variation de scheduling n’est pas attribuée au Menu. Les erreurs finales, causes et cas réussis/échoués restent identiques. Les droits Famille et l’absence de l’ancien éditeur sont confirmés séparément dans le DOM.

Ces échecs hérités persistent : les assertions placées après leurs arrêts précoces ne sont pas certifiées. La recette ci-dessous couvre les parcours Menu demandés. [Preuves différentielles, erreurs/piles brutes et commandes](evidence/menu-diff-01/differential/README.md) · [Identité des fixtures](evidence/menu-diff-01/fixture-identity.json).

## Recette ciblée

PASS à **320, 390 et 1440 px**, sur la source, le bundle local puis GitHub Pages : 24 groupes de contrôles par cible, 72 au total.

- Cinq cartes uniquement : Maison & Équipements, Archives documentaires, Contrats & Assurances, Contacts, Paramètres ; recherche immédiate, partielle, casse/accents, vide et effacement.
- Maison → équipement → entretien/export natif ; Archives → document/pièce jointe ; Contrats → fiche E08 ; Contacts → formulaire natif ; retours vers Menu.
- Paramètres → sauvegarde native : export, validation, prévisualisation sans mutation, **confirmation native puis restauration effective** des données TEST et des octets de la pièce jointe ; persistance après rechargement.
- Ancien espace de stockage Famille témoin conservé après restauration ; header/dock uniques, carte finale accessible, absence des anciens doublons et décors. Captures limitées au Menu aux trois largeurs.

Les profils sont éphémères et fictifs. La recette publique n’a émis aucune requête externe ni erreur JavaScript non interceptée. [Recette/commandes](evidence/menu-diff-01/functional/README.md) · [Résultats publics](evidence/menu-diff-01/functional/hosted/results.json) · captures publiques : [320](evidence/menu-diff-01/functional/hosted/menu-320.png), [390](evidence/menu-diff-01/functional/hosted/menu-390.png), [1440](evidence/menu-diff-01/functional/hosted/menu-1440.png).

## Publication et commits

**URL : https://portenartco.github.io/dobby-demo/essai-dobby-v7-menu-review-20261112/**

- Branche `feat/dobby-v7-menu-simplification` poussée. Commit final de source/validation : `382b3277c84beec81b4dee2a2e6de9b59a624448` ; constructeur isolé : `bd3a52aa3108da0444942b8267f7b5bd43a9a80b`. Les sources applicatives restent celles de `3f7fe0e`.
- Publication : `69ede6451023c30ccdf981cc0b403b56559cc931`, parent `92c1eb44d28dd8ed1cdac07ddd46e76de829d3b5`. **298 ajouts exclusivement dans le nouveau répertoire** ; chaque objet Git préexistant conserve son empreinte, notamment l’aperçu Famille.
- [Déploiement Pages réussi](https://github.com/PortenartCo/dobby-demo/actions/runs/43198029572). **298/298 ressources publiques**, manifeste compris, correspondent exactement au bundle commis. Les 297 ressources exécutables sont identiques au candidat recetté localement ; seule la référence source du manifeste a été actualisée après commit.
- Les 14 ressources témoins des anciens aperçus gardent leurs empreintes HTTP avant/après. L’espace Menu est distinct de Famille/global, y compris backend simulé, clients et réinitialisation. Les sept tests ciblés du constructeur passent.

[Reçu HTTP complet](evidence/menu-diff-01/publication/hosted-http.json) · [Préservation Git](evidence/menu-diff-01/publication/publication-preservation.json) · [Préservation HTTP](evidence/menu-diff-01/publication/http-preservation.json) · [CI de source réussie](https://github.com/PortenartCo/dobby-demo/actions/runs/43197951608).

Aucune fusion applicative, modification Supabase, migration ou donnée réelle. Aucune campagne exhaustive DOBBY relancée manuellement. Le présent rapport et les reçus finaux sont livrés dans un commit documentaire ultérieur ; son hash figure dans la réponse de livraison et dans `git log -1 --format=%H -- docs/dobby-v7/MENU-DIFF-01.md`.
