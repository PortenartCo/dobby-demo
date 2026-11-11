# E07.4 — Writers natifs de fiche recette (checkpoint B)

Les mutations restent dans l’état Cuisine existant et le store binaire natif. Aucun nouveau registre, service, table ou contrat de synchronisation n’est créé. Les confirmations visuelles appartiennent à l’interface ; les writers vérifient aussi les snapshots attendus.

## Identité, surcharge et retrait

`allRecipes()` réunit BASE et `customRecipes` sans doublon d’ID. Une personnalisation BASE est un objet de `customRecipes` portant le même `id` et `baseRecipeId:id`. La source BASE reste intacte. `getR(id)` résout cette personnalisation, y compris pour les repas et les calculs Courses existants.

`DobbyCuisineEngine.read()` fournit :

- `recipes` : toutes les recettes résolvables, personnalisations et retirées comprises ;
- `catalogueRecipes` : recettes actives ;
- `removedIds`, `baseIds`, `customIds` ;
- les champs historiques inchangés, dont `state.planned`.

`recipeUsage(id)` renvoie `{id,name,base,removedAt,planned:[{key,...meal}],favorite,hasTM5,expected}`. `expected` est une chaîne opaque incluant recette, variante, repas et contexte. `removeRecipe(id,{confirmed,expected})` et `restoreRecipe(id,{confirmed,expected})` ne modifient rien sans `confirmed:true` et refusent une confirmation périmée.

Le retrait inscrit `removedAt` dans l’objet personnalisé ; une BASE jamais éditée obtient une surcharge de masquage sous son ID d’origine. L’objet, son favori, TM5, photos, archives et historiques restent conservés. Aucun repas, reçu de Courses ou article n’est effacé. La restauration enlève seulement ce marqueur. Les listes de choix natives excluent les retirées ; les liens de repas restent résolvables. L’export JSON natif est dédupliqué et inclut les marqueurs de retrait/personnalisation, sans binaires.

## Édition et associations

`saveRecipe(payload,id,options)` reste synchrone sans nouvelle image. Options : `{tm5,stepOrder,ingredientIds,media}`. La recette validée remplace l’identité existante ; une BASE est personnalisée au même ID. Les notes, détails source, fichiers ZIP, images et données non éditées sont conservés. Une révision complète précédente est ajoutée à `importHistory`, sans récursion de cet historique.

`stepOrder` est une liste parallèle aux nouvelles étapes classiques : `[0,2,null]` désigne les anciennes étapes 0 et 2 puis une nouvelle étape. Les associations connues sont remappées seulement par cette correspondance explicite. Les associations d’étapes supprimées, ou d’un changement structurel sans ordre connu, sont archivées dans `mappingHistory` et leurs images restent conservées. Une édition textuelle au même ordre conserve les associations.

`ingredientIds` doit correspondre à la liste éditée et rester unique. Sans identifiants fiables, une modification du nombre/ordre/noms des ingrédients archive le mapping précédent puis détache les associations d’ingrédients. Aucune correspondance n’est déduite. Le nouveau corps de recette demeure enregistré et éditable. Les lacunes `missingFields` sont recalculées.

Une variante passée dans `options.tm5` conserve les métadonnées antérieures et revient `À vérifier`, sans réglage fabriqué. Une variante absente des options reste conservée avec sa validation réelle. `saveTM(id,steps,verified)` demeure disponible pour une véritable vérification humaine : `verified!==true` n’écrit rien ; une validation effective exige instructions/accessoires et renseigne sa date réelle. Les références média et notes sont conservées. Un changement structurel TM5 sans correspondance sûre archive/détache les associations concernées.

## Images réellement enregistrées

```js
const media = await E.prepareRecipeMedia(file, {
  recipeId, target: 'cover' /* ou 'step' */,
  method: 'classic' /* ou 'tm5' */, stepIndex: 0,
  provenance: null /* ou 'photo-originale' / 'illustration-IA' */
});
await E.saveRecipeWithMedia(payload, recipeId, {
  media: [media], tm5, stepOrder, ingredientIds
});
```

La préparation contrôle taille, type réel, dimensions, décodage et empreinte en réutilisant les garde-fous existants. Elle ne stocke aucun fichier. Retour : `{recipeId,target,method,stepIndex,provenance,description,bytes,type,key,sha256,previewURL,context,snapshot}`. `previewURL` est temporaire : l’UI doit la révoquer à la fin de l’édition et invalider les préparations asynchrones lorsqu’on quitte l’éditeur.

`saveRecipeWithMedia` vérifie la recette et le contexte, stocke les seuls nouveaux binaires immuables puis appelle le même writer. Les références d’étape sont validées contre les instructions finalement enregistrées. Une nouvelle couverture conserve les autres images ; une nouvelle image d’étape archive les anciennes sans les supprimer. Aucune URL blob ni octet image n’est incorporé dans l’état JSON. Un refus quota ou un changement d’epoch restaure les données natives et nettoie seulement les nouveaux fichiers encore non référencés.

## Calendrier de fiche

`planRecipe({id,date,slot,adult,children,note,expectedMeal,replaceConfirmed})` exige date réelle, Midi/Soir, portions de référence connues et 1 à 20 convives entiers. `expectedMeal` est le repas sélectionné dans le récapitulatif, ou `null`. Un écart refuse la suite ; un créneau occupé exige `replaceConfirmed:true`.

Le writer natif commun `planSelectedMeal` est extrait du chemin `select` existant ; le parcours global Choisir un repas continue de l’utiliser. Une planification depuis la fiche écrit `planned[date+'-'+slot]`. Elle conserve le `childFactor` du repas occupé et son `_e072ImportRef` lorsqu’il s’agit de la même recette. Cette conservation protège les reçus et deltas du panier. Aucun article n’est ajouté automatiquement aux courses.

## Transactions et preuves exécutées

Les writers d’édition, TM5, retrait/restauration et planification sauvegardent un snapshot mémoire et la valeur persistée native. Tout échec de save/render restaure mémoire et octets LocalStorage antérieurs ; la restauration est vérifiée et son échec explicite. Les médias utilisent les gardes avant/après chaque attente binaire et avant le writer final. Ce mécanisme local ne prétend pas offrir une transaction serveur ni une synchronisation familiale de fichiers.

- [RED avant implémentation](evidence/e07-4/b-engine/red.log).
- [Chromium natif 320/390/1440 : PASS](evidence/e07-4/b-engine/green.log), [résultats détaillés](evidence/e07-4/b-engine/results-320-390-1440.json) : BASE source intacte et surcharge unique ; favori/reload ; retrait/restauration avec références conservées ; confirmation/stale slot ; proportions et provenance ; mapping textuel/suppression/structure inconnue ; image d’étape réelle et couverture/reload ; TM5 attaché non vérifié ; rollback d’édition, TM5, retrait et planification après écriture native réussie ; rollback binaire après quota et après changement d’epoch suivant une écriture d’image ; anciens fichiers conservés.
- [Snapshot d’ouverture de l’éditeur : RED](evidence/e07-4/b-engine/stale-editor-red.log), [PASS après correction ciblée](evidence/e07-4/b-engine/stale-editor-green.log) : un média préparé après une modification concurrente ne remplace jamais le snapshot d’ouverture transmis par l’UI ; refus avant tout `houseStore` et aucun changement natif.
- [Garde intégrale du source natif : PASS](evidence/e07-4/b-engine/native-guard-green.log). Amendements littéraux E07.4 supplémentaires dans la fixture dédiée ; la fixture E07.3 reste intacte.

Commandes exécutées :

```sh
NODE_PATH=/workspace/dobby-e07/essai-stitch-v7/tests/node_modules DOBBY_E074_ENGINE_WIDTHS=320,390,1440 node essai-stitch-v7/tests/e07-4-engine.cjs
NODE_PATH=/workspace/dobby-e07/essai-stitch-v7/tests/node_modules node essai-stitch-v7/tests/e07-4-edit-stale.cjs
node --test --test-name-pattern='preview V5 source' essai-stitch-v5-famille/tests/integration.test.mjs
```

Ces résultats sont ceux de l’arbre de travail B, avant commit/publication. L’intégration UI et ses captures sont rapportées séparément. Les aperçus historiques, les comptes réels, Safari/iPhone physique et la synchronisation photo Supabase n’ont pas été déclarés vérifiés par cette tranche.
