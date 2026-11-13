# DOBBY V7 — revue indépendante T09, préparations dessert partagées entre services

**Commit final vérifié : `456a091d61ddd18fecf261b1d71f5f0a227ccc74`. Aucun P1/P2 restant démontré dans ce périmètre.** Les neuf blobs runtime/tests détaillés plus bas correspondent exactement aux octets de l'exécution indépendante verte, par `git show 456a091:<path>` et SHA-256. Périmètre : changements depuis `ed0ec7f`, stockage natif `st.planned.__dobbyDessertPreparationsV1`, références des services, cuisine, imports Courses, consommateurs natifs et tests T09 ciblés. Aucun fichier produit modifié par le reviewer ; aucune requête distante/Supabase, aucune écriture de production, aucune suite large relancée.

## Défauts concrets trouvés pendant la revue

Les problèmes suivants ont été transmis aux lots responsables et au parent. **Tous sont corrigés dans les octets stables testés ci-dessous.**

| Référence | Niveau | Preuve et correction attendue |
|---|---|---|
| R3 — préparation manuelle incohérente | P2 | Browser natif local : préparation 8 portions, deux réservations 4+4, puis action existante « Marquer comme préparé ». Le service devient préparé mais le batch restait `planned`, sans `preparedAt`, avec 400 g encore proposés aux courses et aucune réutilisation possible. L'action explicite doit préparer le batch canonique sans consommer ou achever automatiquement les autres services. |
| R4 — dérive après édition de recette importée | P2 | Browser natif via le vrai `saveRecipe` : 400 g importés puis achetés pour le batch ; édition du même catalogue à 800 g acceptée. L'ancien batch utilisait alors 800 g mais le reçu déjà coché faisait sauter tout complément. Le lot retient désormais des instantanés culinaires/TM5 immuables ; les achats ne doivent pas être réécrits. |
| R5 — couverture historique perdue à la conversion | P2 | Revue Courses indépendante : un dessert couvert par `shopHistory.meals`, achat 200 g coché, sans reçu structuré E072, avait zéro besoin avant conversion. La conversion en batch le faisait proposer à nouveau. La couverture historique doit être conservée explicitement et rester stable au déplacement, à la libération/réservation et au rechargement. |
| R6 — nouvelle préparation prenant l'ancienne couverture | P2 | Après déplacement du batch couvert hors de son ancien créneau, une nouvelle préparation identique au créneau désormais vide récupérait la même signature historique et n'offrait plus ses 200 g nécessaires. Toute nouvelle préparation indépendante doit avoir une origine fraîche et stable ; aucune modification des anciens achats cochés. |
| R7 — contexte de recette perdu au rechargement | P2 | Browser local : service 4 portions d'un batch 400 g/8 montre 200 g ; URL `#recipe?id=...` puis refresh montrait 400 g de la nouvelle recette catalogue 800 g/8. Le lien/parseur doit conserver date/créneau/composant validés et retrouver le même instantané et les portions réservées. |

Résolution : R3 prépare le batch canonique ; R4 utilise des instantanés culinaires et TM5 profondément copiés et sans médias/historique ; R5 conserve `legacyCovered` ; R6 crée une origine fraîche pour les préparations indépendantes, y compris un créneau devenu vide ; R7 encode/valide date, créneau et composant dans les routes de recette/cuisine et restaure le même contexte après refresh. Les versions obsolètes restent refusées sans perte.

Autres ajustements demandés dans ce même périmètre : choix de méthode depuis la version du batch, abandon d'une méthode précédemment sélectionnée incompatible ; remplacement d'un batch par la même recette avec une nouvelle origine d'ingrédients ; fractions de portions réservées cohérentes dans le cœur et l'UI ; préparations déjà prêtes absentes des choix de cuisson. Aucun de ces ajustements ne doit modifier les quantités du plat, effacer les reçus, créer une consommation automatique ou ajouter un catalogue parallèle.

## Points de source déjà examinés

- Le registre reste à l'intérieur du JSON `planned` du module Menus existant ; aucune nouvelle clé de module, table, RPC ou permission. Son `id` technique respecte la validation native des valeurs du planning.
- `pendingMeals()` ignore les clés qui ne sont pas des dates/créneaux légitimes, déduplique les batchs, conserve une vraie clé de service, ignore les préparations prêtes et expose le total à préparer une fois. L'import par période examine tous les services du batch.
- Les tâches automatiques natives proviennent uniquement des dates d'équipements et de documents ; le registre ne peut donc créer une tâche ou un événement fantôme par ce chemin. Les calendriers affichent les seuls créneaux datés.
- La quantité disponible est le total moins les réservations actives, sans décrémentation automatique. Annuler/déplacer un service libère/déplace sa réservation ; une préparation prête sans service doit rester préservée et réutilisable.
- Le redimensionnement total est refusé après import ou préparation et ne doit jamais être inférieur aux réservations. Une réservation peut être ajustée dans les limites du même total.
- Les nouveaux dialogues capturent le planning et le contexte utilisateur/foyer/membre ; la confirmation périmée est refusée. Les actions passent par le writer natif transactionnel et la garde enfant existante.
- Le contexte de Cuisine contient le batch et ses instantanés attendus ; un changement pendant la cuisine doit être refusé avant de rafraîchir ces attentes. La progression est indexée par `preparationId|recipeId`, ce qui doit empêcher la reprise de la dernière étape d'une préparation précédente de la même recette.

## Vérification indépendante finale des sources stables

```bash
DOBBY_TEST_ORIGIN=http://127.0.0.1:8765 node essai-stitch-v7/tests/v7-dessert-preparations.cjs
DOBBY_TEST_ORIGIN=http://127.0.0.1:8765 node essai-stitch-v7/tests/v7-dessert-batch-edges.cjs
```

**Deux scripts PASS, exit 0, empreintes runtime et tests inchangées pendant la dernière exécution.** La première exécution était aussi verte, mais des ajouts UI/tests étaient encore en cours ; la seconde sur sources stabilisées constitue la preuve finale retenue.

Les tests parcourent les writers, le planning et la cuisine natifs dans un navigateur local ; ils couvrent notamment préparation anticipée réelle via UI, total 8 → réservations 4+4, 400 g importés une fois, achats antérieurs conservés, refus de redimensionnement importé/préparé, libération/réservation/déplacement/reload, contexte périmé et foyer remplacé, versions invalides, recette enregistrée 400 g puis catalogue 800 g avec **service 4 = 200 g et cuisine 8 = 400 g**, instructions/méthodes enregistrées conservées après modification du catalogue, fractions 1,65 → 2,65 → 1,65 dans l'UI, préparation manuelle canonique, origines historiques et nouvelle préparation de même recette.

**Sonde supplémentaire indépendante : PASS.** Deux étapes pour une première préparation terminée, puis remplacement de la même recette au même service et nouvelle préparation : ID différent, reprise à l'index **0**, `finishCook()` prématuré refusé et ancien batch préparé conservé octet pour octet. Résultat : `INDEPENDENT_SECOND_BATCH_PASS unique id, same recipe/service index0, early finish rejected, prior prepared batch byte-preserved`.

Le reviewer Courses indépendant a en plus revérifié en fixtures locales :

- couverture legacy convertie → déplacée → annulée/réservée → reload, sans besoin réintroduit et sans modifier l'achat coché de 200 g ;
- nouvelle préparation à l'ancien créneau vide : nouvelle origine, exactement 200 g nouveaux, ancien achat de 200 g inchangé et second import nul ;
- import E072 partiel : farine 400 g importée/cochée/archivée et article manuel coché conservés ; seul le sucre 200 g non importé demeure proposé après déplacement/réservation, puis nouvel import nul après confirmation. Le simple booléen `imported` n'efface donc pas les apports restants.

Contrôles de syntaxe et `git diff --check` du périmètre : PASS. Les deux fixtures bloquent les requêtes hors serveur HTTP local. Elles ne certifient ni la synchronisation Supabase réelle ni un usage physique familial.

## Empreintes testées

| Fichier | SHA-256 |
|---|---|
| `essai-stitch-v5-famille/index.html` | `4be86846dcb849cf990fafdfa564ce25e7415c8df7cf52dd0a24b72b828a836d` |
| `essai-stitch-v7/cuisine.js` | `80fd34022cbdfa2aee7d173c0ee56fb4528631a30086e1fe11bfc39325e2ca01` |
| `essai-stitch-v7/cuisine-engine.js` | `5d76a0ba615fbbdcc2c811484e52e903ad0f4255860be4b04d880d6291ff1c9e` |
| `essai-stitch-v7/cuisine-e07.js` | `57e819f519786e17e8e0730043096451b0606f43d97e473b9623b6f0a38443a5` |
| `essai-stitch-v7/cuisine-e074.js` | `dae609aaff32b5200112c27a800448aa05a78e6f5f53506ba15a21cdd2b6316d` |
| `essai-stitch-v7/cuisine-list.js` | `16fedfd16a4dcc7929fa219aae68c5b385d2f1d3ef48ad31ff85e2396b5270cd` |
| `essai-stitch-v7/cuisine-p01.js` | `23413675d792ffe1a0a201b6bbbe3d29b6d9ce41c1316c4a76c2ce35515732a6` |
| `tests/v7-dessert-preparations.cjs` | `d644d7ee6158464038211999b2827e933913c78506d461a9606643450c43471a` |
| `tests/v7-dessert-batch-edges.cjs` | `a5e73cb72bbe384162d4f4979636314b87e5338f5a8d46c4c5ef03b0d714387f` |

**Comparaison finale au commit : 9/9 empreintes identiques.** La nouvelle CI de la PR #9 et les contrôles de publication restent à relever. Aucun feu vert d'un ancien SHA ne vaut validation du nouveau modèle. La publication et la recette backend réelle restent séparées de ce contrôle.
