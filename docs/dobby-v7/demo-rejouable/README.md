# DOBBY V7 · Démo globale rejouable

Le scénario `launch` ouvre le foyer fictif **DÉMO — Les Lanternes** sur une adresse locale. Les quatre profils se partagent une simulation dans le même navigateur. Les parcours utilisent les écrans et les formulaires de DOBBY V7. Les opérations de partage et les sessions sont simulées dans le navigateur.

## Démarrer la démo

Depuis la racine du dépôt, utiliser Node.js 22, la version de la recette automatisée. Le navigateur doit prendre en charge Web Locks, `localStorage`, `sessionStorage` et IndexedDB, y compris l’énumération des bases.

```sh
dobby_demo_bundle="$(mktemp -d)/bundle"
node scripts/build-dobby-global-review.cjs --scenario launch --output "$dobby_demo_bundle"
node scripts/serve-dobby-global-demo.cjs --bundle "$dobby_demo_bundle"
```

Le générateur attend un dossier de sortie qui n’existe pas encore. Garder le serveur ouvert et ouvrir l’adresse `http://127.0.0.1:<port>/` affichée après `GLOBAL_DEMO_LOCAL`. L’entrée ouvre Camille. Le bouton **Scénarios de démo** permet de choisir un autre profil, de fermer ou rouvrir sa session et de réinitialiser le scénario. Pour observer plusieurs profils en même temps, ouvrir l’adresse `essai-stitch-v7/traverse.html?client=B` sur la même origine dans un deuxième onglet. Les codes `C` et `D` fonctionnent de la même manière.

Le serveur choisit un port disponible par défaut. Pour retrouver les données locales après un redémarrage du serveur, réutiliser la même adresse et un port réservé à cette démo, par exemple `--port 8767`, avec le même profil de navigateur. Un changement de port crée une autre origine et donc un autre espace de stockage.

## Parcours à rejouer

| Code | Profil | Parcours |
| --- | --- | --- |
| `A` | Camille Démo · parent | Créer un mémo partagé, consulter les courses et choisir **Suspendre** ou **Réactiver** pour un enfant. |
| `B` | Alex Démo · parent | Retrouver le mémo après synchronisation. Fermer puis rouvrir sa session pendant que celle de Camille reste ouverte. |
| `C` | Lou Démo · enfant | Ouvrir **Préparer le coin lecture** dans ses missions et retrouver l’objectif de 25 runes **Choisir le jeu de la soirée**. |
| `D` | Maël Démo · enfant | Ouvrir **Arroser les plantes** et vérifier que la suspension de Lou laisse sa session et sa mission accessibles. |

1. Ouvrir Camille et Alex dans deux onglets. Dans **Scénarios de démo**, sélectionner **Simuler le hors ligne** chez Camille, créer un mémo partagé, puis recharger son onglet. Vérifier que le mémo est toujours présent chez Camille. Choisir **Rétablir la connexion**, puis **Synchroniser** chez Alex si nécessaire et vérifier que le mémo apparaît chez lui.
2. Ouvrir Lou et Maël dans deux autres onglets. Consulter leurs missions respectives. Depuis Camille, suspendre Lou, vérifier le résultat dans les deux onglets enfants, puis réactiver Lou. Les routes de gestion parentale, le dialogue privé et les documents du foyer sont réservés aux parents dans cette simulation.
3. Depuis un onglet, utiliser **Réinitialiser la démonstration** et confirmer. Vérifier que les quatre onglets retrouvent leur profil et les données de départ, que le mémo ajouté a disparu et que les sessions et suspensions reviennent à leur état initial. La date de départ du scénario est conservée à chaque réinitialisation sur la même origine.

Si l’onglet qui a lancé la réinitialisation est fermé, rouvrir la démo à la même adresse. Elle termine la réinitialisation en attente avant de rouvrir le moteur natif. Si une base locale est encore ouverte, fermer les autres onglets de ce scénario, puis laisser la démo terminer.

La **Soupe du potager** et le **Gratin familial** illustrent le Grimoire et le planning. Les courses de départ contiennent carottes, pommes de terre et crème. Le scénario comprend aussi le **Four du Logis**, son entretien, un contact fictif, un événement et deux fiches de contrat ou d’assurance. [Données du scénario](../../../scripts/review/global-scenario.js) · [Données héritées](../../../scripts/review/global-config.js)

## Données et périmètre

- `demo-data-manifest.json` contient les valeurs fictives du scénario, dont les noms, identifiants et rôles des quatre profils, les missions, les courses et l’exemple Santé. `review-manifest.json` enregistre le commit source, les transformations, les empreintes des fichiers et l’empreinte du manifeste de données. Les deux fichiers se trouvent à la racine du bundle généré.
- L’encadré **Santé** affiche le rendez-vous **Contrôle de routine fictif** associé à Lou pour les deux parents et pour Lou lorsque leurs sessions simulées sont actives. L’exemple est une donnée publique de la simulation, séparée du carnet Santé. Le carnet, ses API et son Storage sont hors périmètre, ainsi que tout historique ou dossier médical réel.
- Les confirmations de récompenses du scénario passent par les Runes V3. Les missions à participations individuelles avec validation et le partage des quantités réelles restent hors recette de lancement.
- Les parcours de connexion portent sur l’ouverture et la fermeture de sessions fictives et sur la suspension des enfants. Les comptes, invitations et retours Auth réels sont hors scénario. E02 couvre les interactions locales. Le traitement distant et la dictée au microphone restent hors recette.
- Le Grimoire de départ contient deux recettes pilotes. Le catalogue complet de 400 recettes est hors périmètre. Les écrans Documents et Contrats utilisent les fiches fictives et, selon le parcours, des pièces locales. Les documents privés réels et le Storage cloud sont hors scénario.
- Sur l’origine de la démo, `localStorage` contient l’état natif local préfixé et le miroir de notification du service fictif. `sessionStorage` porte les réglages propres à l’onglet. IndexedDB conserve l’état partagé, les sessions fictives, les files natives et les pièces locales. Le reset efface les bases propres aux profils fictifs et remplace la ligne partagée par le scénario initial. Le bundle se charge depuis le serveur loopback et exclut l’installation et le cache de la PWA. La réinitialisation cible les clés et les bases du scénario. Le cache PWA et le stockage des autres origines suivent leur propre cycle de vie. [Cycle de vie de la démo](../../../scripts/review/global-lifecycle.js) · [Serveur loopback](../../../scripts/serve-dobby-global-demo.cjs)

## Recette technique

Exécuter les commandes depuis la racine du dépôt. Dans ce second terminal, remplacer le chemin du bundle et l’adresse d’exemple par les valeurs du premier terminal. Renseigner `CHROMIUM_PATH` avec le chemin de Chromium ou Chrome si `/usr/bin/chromium` est absent. Python 3 est utilisé pour la comparaison HTTP des ressources.

```sh
export DOBBY_GLOBAL_LAUNCH_BASE='http://127.0.0.1:8767/'
export DOBBY_GLOBAL_LAUNCH_EVIDENCE="$(mktemp -d)"
dobby_demo_bundle='/chemin/vers/le/bundle'

npm ci --ignore-scripts --prefix essai-stitch-v7/tests
node --test essai-stitch-v7/tests/global-build.test.cjs \
  essai-stitch-v7/tests/global-launch-*.test.cjs \
  essai-stitch-v7/tests/global-roles.test.cjs
python3 scripts/verify-dobby-global-http.py --base "$DOBBY_GLOBAL_LAUNCH_BASE" \
  --bundle "$dobby_demo_bundle" --output "$DOBBY_GLOBAL_LAUNCH_EVIDENCE/integrite-http.json"
node essai-stitch-v7/tests/global-launch-browser.cjs
node essai-stitch-v7/tests/global-launch-reset.cjs
node essai-stitch-v7/tests/global-launch-origin.cjs
```

| Contrôle | Preuve attendue |
| --- | --- |
| Génération | Les tests du générateur vérifient le manifeste synthétique, les empreintes, l’enveloppe locale et la construction du scénario historique. Le rapport `integrite-http.json` atteste que les fichiers effectivement servis correspondent aux empreintes du bundle. |
| Rejeu dans Chromium | Les rapports à 320, 390, 768 et 1440 pixels documentent les quatre profils, les recettes pilotes, le mémo hors ligne repris au rechargement puis partagé, les refus côté enfant, les sessions séparées et la suspension d’un enfant. La recette contrôle également les requêtes sortantes et les erreurs navigateur. |
| Deux origines dans le même navigateur | `isolation-origines.json` vérifie que le service worker, la session, la pièce jointe et le cache témoins de l’autre origine survivent à l’ouverture et au reset. |
| Réinitialisation et reprise | Le test de reset vérifie la génération atteinte, la disparition des données ajoutées dans les onglets A à D et la conservation des données et caches témoins hors scénario. Il interrompt un reset alors qu’il attend le verrou, puis contrôle sa reprise et l’effet des notifications retardées dans les onglets rechargés. Une fermeture de session et deux commandes concurrentes vérifient que le parent déjà déconnecté ne peut plus agir. Un article saisi par un parent reste disponible quand un autre onglet observe un miroir ancien. |

Conserver les deux manifestes, le rapport HTTP et les sorties des tests pour le même bundle. La génération confirme quelles ressources sont livrées. Seul le rejeu dans le navigateur vérifie les comportements de session, de synchronisation et de reprise après interruption. [Recette automatisée](../../../.github/workflows/dobby-v7-global-demo.yml)
