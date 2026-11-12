# Revue indépendante E09

Relecteur indépendant `/root/review_e09`, en lecture seule sur 69ef361..01d35be.
Verdict initial : quatre points importants, aucun critique ni mineur.

1. Choix de la version du foyer : la prochaine écriture pouvait rétablir un champ inconnu provenant de l'ancien snapshot. Le snapshot confirmé utilise désormais le payload actuel du foyer.
2. Rétablissement par un autre appareil : les appareils déjà en conflit de protocole restaient bloqués. La lecture actualisée reconnaît désormais le registre rétabli et permet une résolution normale.
3. Édition pendant un PATCH de rétablissement : les autres données familiales reçues pouvaient ne pas être appliquées, puis être écrasées au prochain envoi. Réconciliation champ par champ entre snapshot envoyé et état actuel, sans perdre la saisie récente.
4. Réactivation : les anciennes copies déjà confirmées étaient traitées comme des éditions en attente. Fusion à trois versions par identifiant : les lignes inchangées suivent le foyer ; les véritables divergences ouvrent le choix de conflit, avec sauvegarde et maintien des nouveaux imports.

Les cinq tests couvrant ces quatre points ont échoué avant correction (`review-red.log`), puis ont réussi (`review-green.log`). La suite ciblée finale inclut 80 tests, ainsi que le parcours natif HTTP sur deux profils Chromium.

Points considérés sans finding supplémentaire : impossibilité d'interdire une écriture d'un ancien client côté serveur sans évolution serveur (explicitement hors périmètre), CRUD/hors ligne/CAS/import et snapshots des formulaires. Publication et recette hébergée prises en charge séparément par l'exécuteur ; refonte détaillée des trois sous-pages hors périmètre.
