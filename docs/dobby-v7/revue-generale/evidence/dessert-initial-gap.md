# Contrôle étroit T09 — préparation anticipée et plusieurs services

Revue **en lecture seule des sources** au SHA `ed0ec7fda5a4bf7a92846ee31e2fba786753a406`. Aucune source, aucun test du dépôt, aucun contrat ni backend modifié. Une fixture navigateur locale éphémère a été exécutée, avec toutes requêtes non locales bloquées.

## Conclusion

**T09 reste PARTIEL.** L'indépendance plat/dessert, la conservation des portions et l'absence de consommation automatique sont établies. En revanche, **la préparation anticipée par un parcours UI et la réutilisation d'une même préparation sur plusieurs services ne sont pas implémentées**. Mon précédent tableau `FAIT_TESTÉ_NON_DÉPLOYÉ` était trop large pour ces deux sous-exigences et doit être corrigé.

## Accès à la cuisine avant le service

- `essai-stitch-v7/cuisine-e07.js:40` et `:41` créent le CTA cuisine uniquement lorsque `detail===false`.
- `:52` construit ces cartes non-detail uniquement pour la date civile réelle du jour (`dailyDay`). Changer le jour sélectionné dans le calendrier ne change pas ce panneau.
- `:56` construit les cartes de la semaine avec `detail===true`. Le dessert prévu demain possède Voir / Déplacer / Retirer / Autres actions / Remplacer / Convives, **aucun accès au mode cuisine**.
- `essai-stitch-v7/cuisine-e074.js:14` n'expose plus le bouton cuisine depuis la fiche, conformément à T03.
- `cuisine-e07.js:45` autorise « Marquer comme préparé » dans Autres actions, même pour un service futur. Cela écrit uniquement le statut du créneau via `componentAction('status')` ; cela **ne constitue pas le parcours de préparation anticipée dans le mode Cuisine**.
- `cuisine-engine.js:65` / `cookAt` peut techniquement recevoir une date future, sans déplacer le repas. C'est une capacité native appelée par code et dans des fixtures, **pas une commande UI accessible**.

Le cumul « CTA jour seulement, aucun CTA semaine, aucun CTA fiche » a donc rendu la préparation anticipée inaccessible, sauf contournement développeur ou déplacement artificiel du service vers aujourd'hui. Ces contournements ne satisfont pas T09.

## Aucun mécanisme de lot préparé partagé entre services

- Une ligne `planned[date-slot-dessert]` possède `id`, convives/coefficient et `status`. Aucun identifiant de préparation commune, date de fabrication distincte, quantité totale fabriquée, quantité affectée par service ou lien vers un lot préparé n'existe.
- `cuisine-engine.js:117` (`finishCook`) ne modifie que `status:'préparé'` du créneau ; les portions restent inchangées, mais aucun lot réutilisable n'est créé.
- `cuisine-engine.js:53` (`reserveIngredients`) lit uniquement la réserve **d'ingrédients bruts** `st.have`, sans desserts préparés.
- `cuisine-p01.js:46` (`reservePanel`) propose des recettes contenant les ingrédients bruts disponibles. Il n'affecte pas des portions d'une préparation existante.
- `cuisine-engine.js:187` (`batch`) est un **import JSON de recettes** (`validateBatch` / `batchCandidate` / `commitBatch`), sans relation avec le batch cooking ou les restes.
- Le module menus natif (`essai-stitch-v5-famille/family-modules.js:8`) synchronise `planned`, `shopHistory`, `shopFinal`, `shopChoice`. Il ne contient aucun registre de préparations/desserts en réserve.
- Le calcul natif `summary()` (`essai-stitch-v5-famille/index.html:1070`) et `cuisine-list.js:128` parcourent chaque repas/dessert séparément. Le `ref` de courses repose sur la ligne du créneau (`:130`). Deux services portant la même recette représentent **deux besoins de cuisson/import**, pas deux affectations d'un même lot.

## Preuve locale complémentaire, exécutée sans modifier le dépôt

Navigateur Chromium, origine locale `127.0.0.1:8897`, fixture P01 figée au 12/11/2026, réseau externe bloqué. Recette « TEST — Dessert T09 » de 8 portions avec400g de farine ; dessert aujourd'hui pour8 portions, dessert demain pour2 portions.

Résultat observé :

```json
{
  "futureWeekCookButtons": 0,
  "recipeCookButtons": 0,
  "before": {"flour": 500},
  "after": {
    "today": {"people": 8, "status": "préparé"},
    "tomorrow": {"people": 2, "status": "prévu"},
    "flour": 500
  }
}
```

La réserve native ne contenait que Carottes1000g et Riz500g. Après préparation du dessert d'aujourd'hui, le dessert de demain reste une autre préparation et son besoin de100g supplémentaires subsiste. Rien ne permet d'affecter2 des8 portions préparées à demain ni d'indiquer qu'une même cuisson couvre ces services. Cela ne prouve pas un bug du dédoublonnage courses : **la relation métier manque en amont**.

## Limite exacte des tests déjà livrés

- `tests/v7-meals-model.cjs:10` prouve que terminer le dessert conserve ses portions, sans consommer automatiquement ; il ne prouve pas qu'elles sont réutilisables sur plusieurs services.
- `:15` et `:16` planifient la même recette sur deux créneaux puis appellent directement `cookAt`. Ils vérifient volontairement des progressions **distinctes** ; ils ne construisent aucune préparation commune ni aucun parcours anticipé UI.
- `tests/v7-meals-ui.cjs:5` vérifie l'absence de CTA cuisine dans la semaine ; `:10` cuisine uniquement un dessert du jour.
- Les tests T11 valident des contributions ingrédients indépendantes et leur reçu idempotent, pas le partage des portions d'une cuisson.

Aucune preuve existante ne ferme les deux lacunes.

## Correction minimale sûre proposée, avant toute nouvelle modification

1. **Conserver le CTA cuisine hors semaine et hors fiche.** Ajouter dans le panneau **Les Repas du Jour** une action « Préparer un dessert à l'avance » ouvrant les desserts futurs déjà planifiés. Elle ouvre le mode Cuisine aujourd'hui avec le contexte du service futur, sans déplacer sa date. `cookAt` existant sait déjà recevoir ce contexte ; `finishCook` doit enregistrer une date de préparation distincte.
2. **Ajouter une identité de préparation réutilisable**, référencée depuis les lignes dessert existantes : identifiant stable, `recipeId` du catalogue natif, portions totales à préparer/préparées, date de fabrication et état ; chaque service indique l'identifiant de cette préparation et ses portions affectées. Exposer « Utiliser un dessert déjà préparé » dans Ajouter/Remplacer un dessert et choisir les portions à affecter. Une affectation de service n'est pas une consommation ; aucune date arrivée ni fin de cuisson ne décrémente implicitement le stock.
3. **Garder une seule autorité métier**, idéalement une petite map de préparations dans le payload **menus existant**, plutôt que répliquer un lot mutable sur plusieurs services ou mélanger desserts cuits et ingrédients `have`. Cela demande de mettre à jour explicitement les clés de sérialisation du module menus et sa validation locale ; aucune nouvelle table ni appel distant n'est nécessaire pour développer/tester. Si l'acceptation du champ par le backend réel n'est pas démontrée, conserver le partage de cette extension sous gate honnête et documenter sa recette manuelle.
4. **Adapter le calcul des ingrédients** natif et le preview courses pour compter une préparation une seule fois. Pour un lot de8 portions affecté à deux services de2 portions, le besoin de cuisson est celui du lot déclaré, pas8+2 ou2+2 en plus. Préserver les tokens et reçus idempotents ; un lot déjà préparé réutilisé ne déclenche pas un nouvel import d'ingrédients pour chaque service. Conserver les protections enfant, snapshots périmés et rollback natifs.

Tests de fermeture nécessaires : parcours UI jour→dessert futur→cuisine sans changer date du service ; lot de8 affecté à2+3 services et solde réservé3 (non consommé) ; fin de plat indépendante ; absence de double farine/import ; déplacement/annulation/remplacement d'un service ne détruit pas le lot ni les autres services ; refus suraffectation ; reload ; double validation et changement concurrent local ; enfant en lecture seule. Vérifier que la semaine et la fiche n'ont toujours aucun CTA cuisine.

La correction peut être réalisée localement sans Supabase distant. Elle dépasse une simple correction de libellé ou un raccourci UI : le modèle d'affectation d'une préparation manque réellement. Jusqu'à sa réalisation et sa validation, **T09 doit rester PARTIEL** et le rapport doit nommer ces sous-exigences absentes.


## Suite coordonnée

Les écarts de cet audit ont ensuite été corrigés au commit `456a091`. Le présent document conserve la conclusion factuelle sur `ed0ec7f` ; la conformité locale après correctif est décrite dans `/workspace/dobby-dessert-t09-implementation.md` et la revue indépendante dans `/workspace/dobby-dessert-preparation-review.md`.
