# T09 — correctif final de préparation anticipée et partage entre services

Commit `456a091` — **Support advance dessert preparations shared across services**. Ce correctif remplace la réserve constatée en lecture seule au SHA `ed0ec7f` dans `/workspace/dobby-dessert-t09-check.md`. Le premier lot `3196d28` ne couvrait pas complètement T09 ; la présente implémentation ajoute les chemins et le modèle manquants.

**Statut T09 : FAIT_TESTÉ_NON_DÉPLOYÉ**, pour le code et les fixtures locales. Aucune preuve d'hébergement ni de synchronisation réelle A/B n'est apportée par ce lot. Aucun accès Supabase, SQL, push/merge/déploiement effectué par cet agent.

## Parcours et données

- Le panneau **Les Repas du Jour** possède « Préparer un dessert à l'avance », avec choix d'un dessert futur déjà planifié et de la quantité à préparer. L'ouverture du mode cuisine ne déplace pas la date du service.
- Un lot préparé peut être choisi depuis « Utiliser un dessert déjà préparé » pour réserver explicitement des portions à un autre service. Un même lot de8 portions est testé via l'UI sur deux services4+4. Aucun service n'est automatiquement marqué consommé et aucune échéance ne décrémente les portions. Annuler un service libère sa réservation explicite, sans supprimer le lot.
- La semaine et la fiche recette n'ont toujours aucun CTA cuisine. Les lots déjà préparés ne sont pas reproposés comme candidats à cuisiner ; les autres services liés affichent leur disponibilité sans passer implicitement à un statut de consommation.
- Le registre technique reste **dans `st.planned.__dobbyDessertPreparationsV1`**, avec `id` technique, `kind:'dessert-preparations'`, `version:1`, `batches`. Il ne constitue pas une recette ni un repas affiché. Les itérateurs d'ingrédients valident les clés réelles date/midi/soir ; la métadonnée n'augmente aucun compteur de repas.
- Chaque service conserve son contrat natif et porte `dessertPreparationId` + `dessertPortions`. Le lot porte un identifiant stable, `recipeId`, quantité totale, état/date de fabrication, version de révision, origine ingrédients stable et une **copie minimale immuable des données culinaires** (portions de référence, ingrédients, étapes et réglages/mapping TM5). Aucune photo, donnée binaire/base64, archive ni catalogue parallèle n'est créé.
- « Voir la recette » depuis un service montre cette version pour la quantité **réservée au service** ; le mode cuisine montre la quantité **totale du lot**. Les routes contiennent uniquement recette/date/créneau/composant ; recharger maintient la bonne version et les quantités, même si le catalogue a été modifié. Un lien de service inexistant/incohérent retourne aux Repas avec une erreur explicite. Une fiche ouverte depuis le Grimoire reste la version actuelle du catalogue.

## Invariants de quantité, achat et concurrence

- Les réservations dérivent des services actifs. Leur somme ne dépasse jamais les portions du lot, y compris à la restauration d'un service annulé. Les +/- de la semaine ajustent une réservation, et non la quantité totale fabriquée ; une réservation1,65 →2,65 →1,65 est testée réellement dans l'UI.
- Le moteur natif `pendingMeals` produit une seule source d'ingrédients pour un lot non préparé ; les services liés ne multiplient pas les courses. Le preview respecte une plage couvrant n'importe lequel de ces services.
- Les reçus E07.2 conservent leur origine stable pendant déplacements/retrait/réaffectation. Les contributions exclues d'un import partiel restent proposées. Les achats cochés/archivés et articles manuels ne sont ni supprimés ni réécrits.
- La conversion d'un ancien repas couvert par `shopHistory.meals` conserve explicitement cette couverture (`legacyCovered`), y compris après déplacement ; elle ne ressuscite pas d'ingrédients achetés. Une nouvelle préparation au même ancien créneau reçoit une identité d'ingrédients neuve. Remplacer un service lié par une nouvelle préparation de la même recette ne réutilise pas l'ancien reçu.
- Redimensionner un lot déjà importé ou préparé est **refusé avec motif explicite**. Le parcours de remplacement crée une nouvelle préparation et préserve l'ancien lot et ses achats.
- Une modification du catalogue ne change pas une préparation existante : recette400g/8, lot8 déjà importé puis recette actuelle800g/8 → service4 conserve200g et cuisine8 conserve400g, avec achats initiaux intacts. Un changement actuel Classique→TM5 ne force pas l'ancienne préparation à utiliser une méthode absente de sa version.
- Les nouveaux writers utilisent la transaction native et le garde-fou parental existants. Les confirmations des nouvelles fenêtres capturent le foyer/profil actif et le snapshot du planning. Un changement d'acteur/foyer, un planning périmé, une suraffectation ou une version de registre inconnue sont refusés sans réinitialiser les données. La progression est attachée à l'identifiant du lot ; un second lot de la même recette repart à l'étape1 sans modifier le premier.

## Vérifications exécutées

RED constaté puis GREEN : API de lot absente ; accès anticipé UI absent ; dessert déjà préparé reproposé pour cuisson ; dérive de version/quantité au rechargement ; anciens achats couverts réapparus ; collision d'origine sur ancien créneau vide. Les correctifs correspondants sont testés.

Commande finale :

```bash
DOBBY_TEST_ORIGIN=http://127.0.0.1:8897 DOBBY_MEALS_EVIDENCE=/workspace/dobby-meals-evidence node essai-stitch-v7/tests/e07-p01-ci.cjs
```

Résultat : **12/12 scripts navigateur PASS, empreintes des sources inchangées**. Les deux nouveaux scripts font partie de cette campagne :

- `essai-stitch-v7/tests/v7-dessert-preparations.cjs` : préparation future via UI, lot8→4+4, capacité/retrait/déplacement/reload, import une fois, achats manuels conservés, redimensionnement importé refusé, recette gelée400→800, service4=200 et cuisine8=400 avec reloads, scope/CAS/version, main inchangé et route invalide explicite.
- `essai-stitch-v7/tests/v7-dessert-batch-edges.cjs` : création/réutilisation8→4+4 entièrement UI, statut préparé manuel cohérent, autre lot inchangé, anciens achats couverts et déplacement, ancien créneau vide avec nouveau besoin, méthode actuelleTM5 contre ancienneclassique, nouvelle origine pour même recette, contrôle réel +/-1,65.
- Les dix autres scripts conservent P01, Taverne, catalogue, éditeur, rollback moteur, course de rendu, repas et lecture seule enfant.

Commande complémentaire :

```bash
node --test essai-stitch-v7/tests/e07-p02-model.test.cjs essai-stitch-v7/tests/e07-p02-home-core.test.mjs essai-stitch-v7/tests/prep-courses.test.cjs
```

Résultat : **31/31 PASS**.

Revue indépendante étroite : les deux nouveaux scripts repassent sur des fichiers inchangés ; le second lot à2 étapes repart à0 et refuse une fin anticipée, l'ancien lot reste identique. Le spécialiste courses a vérifié indépendamment conversion legacy→move/cancel/reuse/resize/reload ; import E07.2 partiel avec achat coché/archivé et article manuel ; collision d'origine d'un nouveau dessert sur un ancien créneau libéré. Comparaison finale indépendante **PASS** au SHA complet `456a091d61ddd18fecf261b1d71f5f0a227ccc74` : les9 blobs runtime/tests ciblés correspondent exactement aux empreintes du dernier run indépendant. Aucun défaut P1/P2 démontré restant dans ce périmètre. Rapport indépendant : `/workspace/dobby-dessert-preparation-review.md`.

Captures de fixtures locales 390 et1440px : `/workspace/dobby-dessert-evidence/advance-{390,1440}.png`, `cooking-*.png`, `reuse-*.png`, `reserved-*.png`. Les contrôles6 largeurs/scroll du précédent lot sont rejoués dans `v7-meals-ui.cjs` inclus dans les12 scripts.

## Backend et recette humaine

Aucune nouvelle table, RPC, permission ou clé top-level du module menus. Le registre est contenu dans le JSON planned déjà sérialisé par le module natif ; la forme conserve le `id` requis par les snapshots historiques et les écritures ordinaires/mouvements gardent cette clé technique. Les protections serveur réelles restent celles du lot F09 manuel transversal. **Aucune recette Supabase réelle n'a été exécutée.**

Après les vérifications manuelles globales F09, la recette réelle utile consiste en deux sessions : parent prépare aujourd'hui un dessert prévu demain,8 portions ; autre session voit le même lot et réserve4+4 ; les courses ne réimportent pas le lot ; déplacer/retirer un service préserve la préparation ; enfant ne peut ni préparer, ni réserver, ni écrire directement le payload menus. Cette recette ne nécessite pas de SQL dessert supplémentaire préparé/exécuté par ce lot.

Le rollback de code ne doit pas supprimer les métadonnées, lots, recettes ou reçus déjà persistés. Ne pas confondre un retour de version avec une remise à zéro des données.
