# Installer DOBBY V7

L’action **Installer DOBBY** se trouve à la fin du Menu. Elle ouvre la proposition native quand le navigateur la met à disposition. Sinon elle donne les étapes adaptées à l’appareil. En mode autonome, le Menu retire cette action. Le manifeste utilise un nom, des icônes PNG standard et maskable, une icône Apple et des chemins relatifs. L’ouverture passe par l’accès natif habituel de DOBBY.

## Compatibilité et vérifications

| Environnement | Parcours | Validation |
| --- | --- | --- |
| Chromium sur ordinateur | Menu DOBBY ou commande d’installation du navigateur. L’icône ouvre l’app à son point d’entrée | Installabilité CDP, événement de proposition simulé, vraie fenêtre Chromium en mode autonome à partir du `start_url`. La politique du Chromium de recette bloque l’ajout au système |
| Chrome Android | Proposition native si Chrome la rend disponible, avec instructions de secours dans son menu | Interface mobile Chromium, viewport et tactile émulés. Ajout et lancement depuis l’écran d’accueil d’un Android physique à confirmer |
| Safari iPhone | Partager, Sur l’écran d’accueil, Ajouter. Selon iOS, activer « Ouvrir comme app web » | Instructions et présentation à 320 et 390 px contrôlables avec un profil de test. Installation iOS réelle à confirmer |
| Safari iPad | Même parcours, y compris quand le navigateur annonce un agent macOS sur un appareil tactile | Instructions à 768 px avec agent et tactile simulés. Installation et lancement iPadOS réels à confirmer |
| Safari macOS | Partager, Ajouter au Dock selon la version | Aide dédiée. Recette physique à confirmer |

### Recette Safari iOS et iPadOS sur appareil

Sur un profil fictif, relever la version du système et vérifier l’icône, le nom, l’ouverture autonome depuis l’écran d’accueil, un redémarrage hors ligne après le premier chargement, le retour en ligne, la mise à jour et la reprise de session. Vérifier aussi le retour par e-mail et si Safari et l’app installée partagent ou séparent leur stockage sur cette version.

## Cache et synchronisation

Les prototypes [Sync V1](../../../essai-sync-v1/sw.js) et [Sync V2](../../../essai-sync-v2/sw.js) ont fourni le principe du shell versionné. Le worker V7 part d’un inventaire explicite de ressources publiques. Sa portée relative inclut les pages V7 et leur iframe V5, sous un chemin comme `/dobby-demo/`. Il laisse les prototypes et leurs propres workers en dehors de son service de cache.

Les appels Auth, RPC et Storage restent réseau. Le cache ne prend ni les URL de navigation contenant des paramètres ni les pièces jointes, réponses personnelles ou données médicales. Aucun préchargement du catalogue de 400 recettes. Les pages et fonctions locales utilisables suivent les règles existantes du moteur natif. Les identités et les fonctions qui en dépendent doivent être revérifiées après une ouverture hors ligne, et la file native d’écritures reprend au retour du réseau.

Une nouvelle version prépare entièrement son cache avant activation. L’écran propose l’activation ou le report. Le rechargement conserve IndexedDB et le stockage local. L’activation retire seulement les anciens caches de cette même portée DOBBY V7. L’empreinte change quand l’inventaire, un fichier précaché ou la logique du worker change. Les icônes sont un monogramme original avec le Playfair Display et les couleurs DOBBY déjà utilisés par V7.

Les historiques Santé restent soumis à la procédure de reprise avant la mise en service. Tant que l’ancien partage reste ouvert, le moteur natif peut conserver une valeur historique déjà reçue du serveur dans ses instantanés IndexedDB. Le cache d’installation ne reçoit aucun de ces instantanés. [Plan de reprise Santé](reprise-sante.md)

## Recette locale

```sh
npm ci --ignore-scripts --prefix essai-stitch-v7/tests
node scripts/build-dobby-v7-pwa.cjs --check
node --test essai-stitch-v7/tests/pwa-*.test.cjs
DOBBY_PWA_EVIDENCE=/tmp/dobby-pwa node essai-stitch-v7/tests/pwa-browser.cjs
DOBBY_ONBOARDING_PWA=1 DOBBY_ONBOARDING_WIDTHS=390 python3 -u docs/dobby-v7/comptes-enfants/tests/onboarding-local.py --evidence /tmp/dobby-pwa-sessions
```

La recette Auth utilise Docker, GoTrue, Mailpit et PostgREST locaux avec des identités fictives. Pour régénérer l’empreinte après un changement du shell, exécuter `node scripts/build-dobby-v7-pwa.cjs`.
