# Archives — diagnostic et validation de la composition

## Résultat final du 16 novembre, 23:40 UTC

La campagne a été entièrement relancée après intégration Contacts sur la source applicative stable **`af015f8c334b67112ee197293611bdecc88d7905`** : **36/36 consultations natives** (9 variantes × 320/390/768/1440), **7/7 revues**, **7/7 courses concurrentes**, **sources PASS**, **14/14 writers/synchronisation**. Toutes les commandes terminent avec exit 0, sans erreur ni timeout. Le HEAD final observé `8fe5af4d08ace4481f62c9639504545aa8ec3412` ne change aucun fichier runtime par rapport à `af015f8`. Preuves : `/workspace/scratch/archives-final-validation-receipt.json`, `archives-final-af015f8-*.log`, captures et `after.json` dans `archives-final-af015f8/`.

Une dernière adaptation du test vérifie la fiche canonique Contact Stitch24 par son h1, ses champs `dd` et son lien e-mail, au lieu d’anciens inputs absents du rendu en lecture seule ; elle étend aussi la recherche de commandes éditables aux actions Contact natives. Données et binaires restent comparés. Le snapshot final courant est `/workspace/scratch/dobby-integration-final-snapshot.md`. Les paragraphes suivants conservent la preuve causale et la chronologie, y compris les échecs désormais résolus.

## Causes établies

### Dîner planifié

L’échec de `f5f2698` à 23:00:08 UTC provient de la date de fixture : le moteur historique utilise la date locale du navigateur, alors que le dîner Taverne utilise Europe/Brussels. Le test planifiait le 16 novembre en contexte UTC et cherchait ce repas dans le dîner du 17 novembre à Bruxelles. Aucun changement produit n’est requis pour cette cause.

Preuve indépendante à heure figée sur la composition Archives+Notes :

| Horloge | Fuseau navigateur | Date injectée | Date dîner affichée | Rendu après open attendu | Après attente conditionnelle |
|---|---|---|---|---|---|
| 16/11 12:00 UTC | UTC | native : 16/11 | 16/11 | PASS | PASS |
| 16/11 23:00:08 UTC | UTC | native : 16/11 | 17/11 | FAIL | FAIL après 1,5 s |
| 16/11 23:00:08 UTC | UTC | date du dîner : 17/11 | 17/11 | PASS | PASS |
| 16/11 23:00:08 UTC | Europe/Brussels | native : 17/11 | 17/11 | PASS | PASS |
| 16/11 23:00:08 UTC | Europe/Brussels | date du dîner : 17/11 | 17/11 | PASS | PASS |

Aucune erreur JavaScript dans les cinq cas. Preuves : `archives-dinner-diagnostic.json`, `archives-dinner-diagnostic.log` et script reproductible `archives-dinner-diagnostic.cjs` sous `/workspace/scratch/`.

Le commit amont `f8c7876e3c7ddac527e26324845f687e171e5fb8` a ensuite aligné le fuseau et ajouté les attentes natives ; les sept scénarios `archives-review` passent dans sa CI. La matrice indépendante distingue clairement la cause de calendrier d’un simple retard de rendu.

### Comparaison du document natif

L’échec suivant de `f8c7876` compare un HTML contenant `src="http://127.0.0.1:8876/essai-stitch-v7/assets/remaining/fallback-salon.png"` à une référence créée sur `http://127.0.0.1:8765/`. La ressource relative reste identique ; le port du serveur de test rendait l’égalité brute rouge.

Rouge reproduit sur le serveur 8876 avant correction : `/workspace/scratch/archives-origin-red.log`. Vert du même scénario document autonome à 320 px après correction : `/workspace/scratch/archives-origin-green.log`, exit 0.

Correction limitée à `essai-stitch-v7/tests/archives-native-consultation.cjs` : normaliser uniquement l’origine de l’attribut `src` correspondant à l’origine déclarée du test ou à celle du reçu `before.json`, puis garder l’égalité stricte de tous les autres octets HTML. Les chemins d’assets, textes, classes, structure et origines étrangères restent comparés. Les quatre mutations contrôlées (asset, titre, structure et origine étrangère) restent rejetées : `/workspace/scratch/archives-origin-guardrails.json`.

Le commit amont `aafdded5005a67c1778128fda53b72275229b67f` a aussi corrigé cette comparaison avec une substitution de l’origine de référence. La branche d’intégration conserve la variante plus étroite décrite ci-dessus. L’auteur de cette mission n’a effectué aucun commit ; root a enregistré le fichier dans `7a64c2c` puis a géré les merges.

### Notes locales après composition

La première passe native composée passe jusqu’aux notes locales, puis son ancien sélecteur `[data-e09-legacy] summary` expire : Notes/Stitch23 affiche les notes locales directement et retire ce volet. Le test ouvre maintenant le volet uniquement lorsqu’il existe ; il vérifie toujours ensuite que l’enregistrement réactivé exact est visible dans la liste. Preuve rouge : `/workspace/scratch/archives-composed-native-legacy-red.log`.

## Résultats avant intégration Contacts

Composition initiale `d1c5081894d8af2c13c13a6f318ac9ff790a2482` (Archives `f8c7876`, Notes `1913e98`, modifications Settings/Paramètres de root), après régénération :

| Contrôle | Résultat | Journal |
|---|---|---|
| Writers et synchronisation Archives | 14/14, exit 0 | `archives-composed-writers.log` |
| Revue Archives | 7/7, exit 0 | `archives-composed-review.log` |
| Concurrence consultation/pièces/réactivation | 7/7, exit 0 | `archives-composed-races.log` |
| Sources, sauvegardes, états locaux/partagés et recette | PASS, exit 0 | `archives-composed-sources.log` |
| Consultation native 320 px | 9/9 variantes PASS | `archives-composed-native.log`, `archives-composed/after.json` |

Les deux captures de `archives-sources.cjs`, dont le chemin est normalement fixé dans le script, ont été redirigées en mémoire vers `/workspace/scratch/archives-sources-evidence` par le lanceur scratch `run-archives-sources.cjs` ; aucun script source n’a été modifié pour cette redirection.

La passe suivante à 390 px a coïncidé avec un merge Contacts laissant temporairement des marqueurs dans les sources runtime. Elle a expiré pendant l’initialisation, avant tout cas 390. Une relance déjà partie à ce moment a échoué au même chargement. Ces exécutions sur arbre transitoire ne constituent pas un défaut Archives. Les largeurs 390/768/1440 et la composition après Contacts restent à exécuter après annonce du SHA runtime stable par root.

Toutes les données sont fictives, les profils navigateur jetables et le réseau externe bloqué. Aucune recette sur les vrais comptes familiaux, aucun appareil physique, aucun SQL distant et aucun changement Supabase n’ont été effectués.
