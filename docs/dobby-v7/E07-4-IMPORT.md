# E07.4 — Import natif et contrat compatible (checkpoint A)

Cette tranche réutilise `customRecipes`, `st.tmAdaptations`, `validateBatch`, `commitBatch`, `houseStore` et `houseRead`. Aucun nouveau registre, service, bucket, appel IA ou changement Supabase. L’interface et ses captures sont documentées séparément dans le rapport de consolidation.

## Données inconnues et compatibilité

L’import accepte les enveloppes `dobby-recipes` V1/V2 et convertit le flux normalisé vers le validateur V2. `importDetails.sourceVersion` garde la version reçue. Le validateur **direct V1** conserve ses obligations historiques ; le validateur V2 accepte les lacunes culinaires tout en gardant les contrôles de types, tailles et bornes.

Un nom absent reste `name:''`, les portions et durées absentes restent `null`, les listes absentes deviennent `[]`. Aucun titre, quatre portions, durée zéro ou instruction n’est créé pour combler une absence. Une durée zéro explicitement fournie reste distincte d’une durée inconnue. `importDetails.missingFields` contient les chemins à compléter : `name`, `servings`, `minutes`, `ingredients`, `ingredients.0.quantity`, `ingredients.0.unit`, `steps`, `steps.0`, etc. L’interface doit employer un libellé d’attente sans l’enregistrer comme nom véritable. Les annotations d’origine `missing/uncertain` restent conservées.

Une entrée malformée produit ses propres erreurs et laisse les autres entrées sélectionnables. Un conteneur non interprétable ou un ZIP dangereux reste refusé intégralement avant écriture. Les gardes ZIP E07.3 demeurent inchangées : 150 recettes, JSON 2 Mio, ZIP 40 Mio/80 Mio décompressés, 180 entrées, 10 Mio/image, 40 MP, 16 000 pixels/côté, contrôle CRC/chemins/en-têtes/décompression/décodage réel, raster autorisé uniquement.

## Associations explicites

Les instructions restent `steps:string[]` pour les lecteurs historiques. Le transport V2 optionnel ajoute :

```json
{
  "ingredients":[{"id":"carotte","name":"Carotte","quantity":2,"unit":"g"}],
  "steps":["Couper les légumes."],
  "stepDetails":[{
    "method":"classic",
    "stepIndex":0,
    "title":"Préparation des légumes",
    "ingredients":[{"ingredientId":"carotte","useTotal":true,"quantity":null,"unit":""}],
    "images":[{"path":"images/legumes.png","provenance":"photo-originale","description":"Légumes découpés"}]
  }]
}
```

`stepIndex` commence à zéro et se rapporte **à la méthode indiquée** : `classic` par défaut pour un descripteur ancien, ou `tm5`. Une liaison à une méthode/étape inexistante est une erreur. Une absence de mapping reste une absence, jamais une déduction. Les identifiants d’ingrédients sont fournis ou deviennent `ingredient-0`, etc. La correspondance est stockée dans `importDetails.ingredientIds`.

`useTotal:true` réfère à la quantité entière de cet ingrédient ; sinon `quantity` désigne uniquement une quantité partielle explicitement connue. Une quantité partielle absente reste inconnue. Les images sont limitées à dix références différentes par recette, couverture et étapes comprises. Un visuel d’étape seul ne devient pas implicitement la couverture du plat.

Après confirmation, `importDetails.stepDetails` conserve les associations ; les images deviennent des références `{key,sha256,type,provenance,description}` sans chemin privé ni URL. `provenance` vaut `photo-originale`, `illustration-IA` ou `null`. Une ancienne image sans provenance et un fichier ajouté sans déclaration de provenance restent inconnus. L’UI doit alors afficher « Image fournie / provenance à préciser ».

`hydrate(recipes,{E})` hydrate la couverture et ajoute, à la copie de présentation seulement, `recipe.stepImages:[{method,stepIndex,images:[{...ref,url}]}]`. Les URL blob ne sont jamais persistées. Les associations TM5 ajoutées seules à une recette existante sont conservées dans l’adaptation attachée et réunies par `DobbyCuisineEngine.read()` pour cette copie. Tout import TM5 demeure `verified:false`, avec réglages absents vides ou `null`, y compris une adaptation incomplète.

## Conservation et transactions

Les images originales et le **ZIP original entier** passent par le store binaire natif existant, sans réencodage. Le ZIP est référencé par `importDetails.sourceArchive:{key:'recipe-source-'+sha256,sha256,type:'application/zip'}` ; ses octets exacts gardent aussi le JSON source et les noms présents dans l’archive. Aucun nom de fichier privé n’est ajouté aux références de la recette.

Les médias restent immuables par empreinte. `localMedia` et `localMediaArchive` existants sont conservés ; ajouter une couverture ne détruit ni les images d’étape ni le ZIP d’origine. Les doublons gardent l’existant par défaut. Le remplacement explicite conserve l’ID, le favori, les annotations et l’historique natif. Les anciennes images ne sont jamais supprimées lors d’un remplacement.

Les contrôles de contexte/epoch et de snapshot encadrent chaque attente binaire et précèdent le writer. Lors d’un échec, le writer restaure la mémoire et la valeur locale antérieure. Les seules clés binaires nouvellement créées par cet import et encore non référencées sont nettoyées ; un échec de nettoyage est annoncé. Il ne s’agit pas d’une transaction distribuée entre LocalStorage, IndexedDB et serveur ; aucun serveur n’est appelé par ce pilote.

## Calculs et export

`amount()` renvoie une chaîne vide sans portions de référence connues. `summary()` et le seul calcul de `DobbyCuisineList.preview()` donnent alors des quantités inconnues plutôt qu’un ratio infini ou un chiffre inventé. `DobbyCuisineEngine.choose()` exige des portions de référence avant toute mutation de planification. Le reste des pages Choisir un repas et Courses n’est pas refondu.

L’édition native sur le même ID recalcule les chemins manquants tout en conservant la provenance et les métadonnées. L’export JSON V2 conserve les identifiants et associations ingrédient/étape ; il exclut les fichiers et leurs chemins, avec avertissement explicite. Il ne constitue donc pas une sauvegarde complète des médias. Les photographies et ZIP sont **locaux uniquement**, sans partage familial vérifié.

## Preuves exécutées

- [RED initial](evidence/e07-4/a-import/format-red.log) : les sept nouveaux comportements échouaient avant implémentation ; [RED visuels](evidence/e07-4/a-import/media-red.log) pour couverture implicite et provenance supplémentaire.
- [53 tests purs et natifs PASS](evidence/e07-4/a-import/unit-green.log) : nouveaux inconnus/mapping, anciens V1/V2, toutes les gardes ZIP/raster, intégrité du source natif et frontières familiales. Le manifeste E07.3 reste intact ; `tests/fixtures/e07-4-native-extensions.json` décrit les amendements littéraux réversibles supplémentaires.
- [Navigateur natif Chromium, 390 px, PASS](evidence/e07-4/a-import/browser-green.log), [résultats](evidence/e07-4/a-import/browser-results.json) : deux recettes V1 incomplètes sauvegardées, correction même ID, gardes portions, images d’étapes distinctes/provenance, ZIP byte à byte, reload, doublons, ajout de couverture conservant les autres pièces, export et réimport, refus du premier/troisième save, rollback des seuls nouveaux binaires, epoch changé après attente sans écriture tardive, isolation d’une entrée invalide, refus ZIP corrompu.
- [Complément navigateur 320/1440 px, PASS](evidence/e07-4/a-import/browser-320-1440-green.log), [résultats séparés](evidence/e07-4/a-import/browser-results-320-1440.json) : même parcours natif complet, exécuté uniquement aux deux largeurs complémentaires après le premier passage 390 px. Le test accepte `DOBBY_E074_IMPORT_WIDTHS=320,1440` ; la preuve 390 initiale reste intacte.
- [Courses E07.2, PASS](evidence/e07-4/a-import/courses-regression.log) : calculs connus, unités séparées, inconnus, provenance/dédoublonnage, deltas de portions, reload, archive partielle, réutilisation et échec de stockage.

Commandes exactes :

```sh
node --test essai-stitch-v7/tests/e07-4-import-format.test.mjs essai-stitch-v7/tests/e07-3-import-format.test.mjs essai-stitch-v7/tests/e07-3-zip.test.mjs essai-stitch-v5-famille/tests/integration.test.mjs
NODE_PATH=/workspace/dobby-e07/essai-stitch-v7/tests/node_modules node essai-stitch-v7/tests/e07-4-import.cjs
NODE_PATH=/workspace/dobby-e07/essai-stitch-v7/tests/node_modules DOBBY_E074_IMPORT_WIDTHS=320,1440 node essai-stitch-v7/tests/e07-4-import.cjs
NODE_PATH=/workspace/dobby-e07/essai-stitch-v7/tests/node_modules DOBBY_TEST_ORIGIN=http://127.0.0.1:8895 node essai-stitch-v7/tests/e07-2-model.cjs
```

Ces preuves portent sur le code de travail du checkpoint A ; elles ne constituent pas une CI d’un SHA commité ni une publication. Les captures 320/390/1440, la nouvelle édition complète de la fiche et les contrôles de publication relèvent des checkpoints correspondants. Safari/iPhone physique, synchronisation photo familiale et comptes réels restent NON VÉRIFIÉS.

## Interface du checkpoint A

Le catalogue ouvre directement l’import IA, y compris les anciennes routes de création. L’export JSON reste accessible dans Réglages du Grimoire. L’éditeur existant reste utilisable sans création manuelle, conserve le même ID et son brouillon de session en quittant l’écran. Chaque champ inconnu est annoté ; les lacunes partielles de nom/unité/quantité et les étapes vides sont signalées à leur champ. La durée zéro explicitement fournie reste sauvegardable.

Preuves Chromium aux trois largeurs : [navigation, export, édition et brouillon réel](evidence/e07-4/a-ui-green.txt), [champs absents puis correction même ID, lacunes partielles et durée zéro](evidence/e07-4/a-editor-green.txt). Les dossiers `a-ui` et `a-editor` contiennent les captures avant/après et résultats structurés. Le marqueur de rendu complet évite que le test interroge la copie du template avant son hydratation.
