# E02 — Recette du bundle intégré local

Bundle réellement servi à `http://127.0.0.1:8790/essai-dobby-integrated-review/essai-stitch-v7/famille.html#chat` ; manifeste source `ff7684704f282b239633284e993348ae8094393f`. Cette recette locale ne prouve pas une publication GitHub Pages.

Commande :

```sh
DOBBY_TEST_ORIGIN=http://127.0.0.1:8790 \
DOBBY_E02_APP_PATH=/essai-dobby-integrated-review/essai-stitch-v7 \
DOBBY_E02_EVIDENCE_DIR=docs/dobby-v7/evidence/consolidation/e02/bundle \
node essai-stitch-v7/tests/e02-consolidation.cjs
```

Résultat : `E02_CONSOLIDATION_PASS 390`, `E02_CONSOLIDATION_PASS 320`, `E02_CONSOLIDATION_PASS 1440`. [Résultats structurés](results.json).

| Cas réellement exercé | Résultat |
|---|---|
| Dictée multisegments, fin naturelle, arrêt, reprise et annulation | PASS ; aucun envoi automatique |
| Erreurs, callbacks tardifs, correction manuelle, navigation, changement de compte et Son | PASS ; voix et sortie d'identité simulées aux frontières |
| Courses natives : ajout, stockage, doublon, consultation, lien et rechargement ; Missions, Agenda et fiche Document canonique | PASS ; writers et données du bundle réels, isolés dans le profil éphémère |
| Hero décodé, cadrage, absence de débordement et saisie au-dessus du dock | PASS 320/390/1440 ; viewport réduit simulé |

Le premier passage a échoué dans le harnais sur `getByRole('link', { name: 'Documents', exact: true }).last()` : la source de test vide produit ce lien de liste, tandis que la démonstration contient deux contrats et retourne leurs véritables titres et identifiants. Aucun correctif applicatif n'a été effectué. Le test distingue désormais le registre vide et les fiches présentes, vérifie que le titre et l'identifiant du lien correspondent au registre natif, puis vérifie la route et le contenu de la fiche ouverte. La relance du seul bundle a passé les trois largeurs.

Le test a lu la représentation physique du stockage après le writer :

- Clé native : `dobby-v5-familial-preview-20261108`.
- Clé physique : `dobby-review-integrated-v1|dobby-v5-familial-preview-20261108`, contenant l'article réellement ajouté.
- Base IndexedDB effectivement observée : `dobby-review-integrated-v1|dobby-v5-household-preview-v2`.

Empreintes SHA-256 constatées après la recette :

| Artifact | SHA-256 |
|---|---|
| `review-manifest.json` | `a6e321b8b99814a5e9b636c592adb69aa88079082fa7819ad2fc49549396bc2c` |
| Bundle `chat.js` | `ada18c51fbf9c03327269aafd767c79463545562fc7514b608f3eb7814360485` |
| Bundle `chat.css` | `986bfe9db58c5352e801ffde602512442cad8d6147a923db9f5a906f48c78153` |
| Test `e02-consolidation.cjs` | `2074b70b52e7307aa2836917d8d70daeec115f920fa508b3bbd4b8221daf4656` |

Les captures `after-*.png` sont prises après décodage des images. `keyboard-simulated-*.png` ne représentent pas un clavier iPhone physique. Aucun résultat n'atteste les permissions matérielles, les voix installées, la reconnaissance réelle ni les pauses de Safari/iOS. Aucun vrai compte ou partage familial serveur n'est utilisé.
