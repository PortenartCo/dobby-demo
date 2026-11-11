# E07.4 — Minuteurs et progression native (checkpoint C, core)

`essai-stitch-v7/cuisine-timers.js` est un module pur UMD/CommonJS. Dans le navigateur : `window.DobbyCuisineTimers`. Il ne crée aucun intervalle, ne joue aucun son, ne manipule pas le DOM et n’appelle aucun serveur. L’interface fournit le stockage, la clé et les événements d’affichage.

## API et persistance

```js
const store = DobbyCuisineTimers.createStore({
  storage: localStorage,
  key: 'dobby-cuisine-timers-v1|' + JSON.stringify({userId, householdId}),
  now: () => Date.now(),
  max: 32
});
const timer = store.add({
  name: 'Étape 3 — Cuisson du poulet',
  recipeId: 'poulet', method: 'classic', stepIndex: 2, seconds: 300
});
store.start(timer.id);
const newlyFinished = store.tick();
```

La clé est fournie par l’UI. Le runtime de l’aperçu préfixe automatiquement le Storage ; le suffixe de contexte utilise l’identité stable utilisateur/foyer, sans epoch transitoire afin de permettre la reprise après rechargement. Un autre contexte utilise une autre clé. Aucun transfert familial de ces données n’est revendiqué.

Méthodes synchrones :

| Méthode | Résultat/comportement |
|---|---|
| `list()` | Copies de tous les minuteurs, temps restant recalculé ; aucune écriture. |
| `add({name,recipeId,method,stepIndex,seconds})` | Nouveau minuteur `idle` ; jamais de démarrage implicite. |
| `start(id)` | Démarre, reprend une pause ou relance explicitement une fin ; appel sur un timer déjà actif sans effet. |
| `pause(id)` / `resume(id)` | Conservent le temps exact, sans toucher aux autres minuteurs. |
| `adjust(id,deltaSeconds)` | Ajuste le temps restant, avec plancher zéro ; n’altère pas la durée configurée pour reset. |
| `setDuration(id,seconds)` | Change explicitement la durée configurée et le temps restant ; un timer actif continue avec une nouvelle échéance. |
| `reset(id)` | Revient à la durée configurée, état `idle`, sans démarrage. |
| `remove(id)` | Supprime seulement cet identifiant ; booléen. |
| `ack(id)` | Acquitte une fin ; son état reste `finished`. |
| `tick()` | Persiste les transitions de fin et retourne chaque nouvelle fin une seule fois. Aucun write si aucune transition. |

Un minuteur exposé contient `{id,name,recipeId,method,stepIndex,seconds,remainingSeconds,state,deadline,notified,acknowledged,run,eventId}`. `method` vaut `classic` ou `tm5`, `stepIndex` commence à zéro, `state` vaut `idle/running/paused/finished`, `deadline` est un timestamp en millisecondes ou `null`. `remainingSeconds` peut être fractionnaire ; l’affichage applique un arrondi supérieur. `name` est conservé tel que fourni par l’interface, qui doit y associer numéro et contexte réel de l’étape.

Le registre `{format:'dobby-cuisine-timers',version:1,revision,timers}` contient les deadlines et acquittements persistés. Le temps est calculé à partir de `now()` ; le passage en arrière-plan ou un arrêt d’intervalle ne perd aucun temps. Un reload retrouve les échéances, et un premier `tick()` rattrape les fins. Les deux fins d’une même milliseconde restent indépendantes. Les identifiants sont distincts même en présence d’un générateur UUID répétant une valeur. Un reset suivi d’un nouveau départ crée un nouveau numéro de run.

Les états de notification sont persistés avant que `tick()` retourne les fins. En cas de quota, aucune alerte n’est déclarée consommée : le prochain tick pourra la reprendre. Si le stockage refuse après avoir écrit, les octets antérieurs sont restaurés ; un échec de restauration est annoncé. Un JSON corrompu ou incompatible reste intact et produit une erreur, sans remise à zéro silencieuse. Une liste de minuteurs ne réécrit jamais le Storage à chaque seconde.

Le module n’accède pas aux préférences. L’UI peut signaler visuellement chaque retour de `tick()` et jouer un son uniquement lorsque la préférence native `st.stitchPreferences.sound` est active. Le parseur, la reprise de délai et un test Chromium ne certifient ni notification système ni fonctionnement Safari/iPhone verrouillé.

## Durées explicitement fournies

`parseDurations(text)` renvoie une liste d’expressions connues en **secondes** :

- `5 minutes` → `[300]` ; `5 s puis 2 min` → `[5,120]` ;
- `10 à 12 minutes` ou `entre 10 et 12 min` → `[{min:600,max:720}]` ;
- `1h30` / `1 h 30 min` → `[5400]` ; `3 min 30 s` → `[210]` ;
- `0,5 minute` → `[30]` ;
- texte sans durée, température seule, quantité, durée négative ou expression malformée → aucune durée fabriquée.

Une fourchette ne choisit jamais l’une des bornes ; l’UI présente un choix ou une saisie. Plusieurs expressions restent plusieurs propositions. Les durées créées sont positives, finies et limitées à 24 heures ; aucune valeur par défaut de cinq minutes n’existe.

## Progression par recette et méthode

`DobbyCuisineEngine.cookAt(id,index=null,method='classic')` retourne `{id,index,method}`. Un index explicite doit désigner une étape de la méthode demandée. Sans index, il restaure `st.cookProgress[id][method]`, ou commence à zéro pour un parcours nouveau. Si la recette a depuis moins d’étapes, seule la reprise de navigation est bornée aux étapes réellement disponibles. Une méthode absente est refusée.

Le writer met à jour `cookProgress`, `cookStep`, `cookMethod`, `cook`, `detail`, `page` et les drapeaux natifs de vue. Il réutilise la transaction B avec save/render et restauration exacte sur échec. Il ne crée aucune recette temporaire et ne modifie ni ingrédients, variante, planning, panier ni historique métier. L’UI utilise `cookAt` pour naviguer TM5 ; elle ne passe pas par l’ancien `stepnext` lié aux instructions classiques.

## Preuves exécutées

- [RED initial du module](evidence/e07-4/c-core/timers-red.log), [RED des bords alertes/parser](evidence/e07-4/c-core/timers-edge-red.log), [10 tests purs PASS](evidence/e07-4/c-core/timers-green.log) : parse FR/fourchettes/inconnus, collisions ID, deadlines indépendantes, pause/reprise, durée libre, reset/retrait, reprise/reload, deux fins simultanées, aucune écriture par seconde, quota et refus après écriture, isolation des scopes, limites et stockage corrompu, absence de double alerte après ajustement d’une fin.
- [RED `cookAt`](evidence/e07-4/c-core/cook-progress-red.log), [Chromium natif 390 px PASS](evidence/e07-4/c-core/cook-progress-green.log), [résultats](evidence/e07-4/c-core/cook-progress-results.json) : progressions classique/TM5 et autre recette indépendantes, reload, refus méthode/index, rollback après un premier save réussi, recettes/planning/historiques intacts.

Commandes :

```sh
node --test essai-stitch-v7/tests/e07-4-timers.test.cjs
NODE_PATH=/workspace/dobby-e07/essai-stitch-v7/tests/node_modules node essai-stitch-v7/tests/e07-4-cook-progress.cjs
```

Preuves du core C dans l’arbre de travail, avant commit/publication. Les parcours UI, visuels et sons intégrés sont vérifiés séparément par la tranche UI. Aucun test physique Safari/iPhone ou compte Supabase réel n’est revendiqué.

## Interface et fenêtre Stitch

[Parcours C Chromium 320/390/1440 : PASS](evidence/e07-4/c-ui-green.txt), [résultats](evidence/e07-4/c-ui/results.json). Les images suivent exactement les liaisons étape/méthode ; une étape sans photo conserve un repli neutre. Les ingrédients affichés sont uniquement ceux associés explicitement, avec quantités connues adaptées ; sans mapping, un message remplace la liste générique. Le parcours complet reste en dernier, après les minuteurs.

Les commandes réelles vérifient deux minuteurs, changement d’étape/méthode/page, reload, saisie3:30, pause/reprise, ±1min, reset, retrait, fin acquittée et rattrapage de deadline. Un AudioContext instrumenté confirme SonOFF sans lecture et SonON une seule lecture par nouvelle fin. Les noms indiquent le numéro et le contexte effectivement fourni par l’étape.

La fin ouvre une modale DOM sur la fiche, avec l’art original fourni `STITCH_FESTIN_art_original.png` copié sans modification dans `assets/cuisine/e074-festin.png`. Elle reprend le cadre, la palette et la composition de la maquette, sans sa mention fictive d’enregistrement. Message exact, sous-titre, un seul bouton Retour à la recette, focus/Escape, aucun enregistrement métier ni son de célébration automatique. Captures `c-ui/after-festin-{320,390,1440}.png` ; comparaison avec le preview Stitch fourni.

Les captures `before-cuisine-*` montrent les badges et encarts retirés ; `after-cuisine-*` montre le seul badge d’étape, l’instruction rapprochée et les ingrédients dédiés. Les images colorées des fixtures sont des preuves techniques marquées TEST, pas des photographies de repas réels.

Une course de rendu existante a été isolée : un ancien rafraîchissement du catalogue pouvait reprendre après l’hydratation et réutiliser le template Cuisine. [Test déterministe RED](evidence/e07-4/c-render-race-red.txt), [PASS après garde de révision](evidence/e07-4/c-render-race-green.txt). Le contrôle après chaque attente empêche un rendu périmé de remplacer l’écran courant.
