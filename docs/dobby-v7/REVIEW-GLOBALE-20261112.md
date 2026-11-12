# DOBBY V7 — Revue globale du 12 novembre 2026

## Livraison vérifiée

Application : [ouvrir la revue globale](https://portenartco.github.io/dobby-demo/essai-dobby-v7-global-review-20261112/).

| Référence | Valeur |
|---|---|
| Branche source | `feat/dobby-v7-global-review-20261112` |
| Commit source du bundle | [`6a6fcd9bcee522da7342de391e5c3d7bfe1955b3`](https://github.com/PortenartCo/dobby-demo/commit/6a6fcd9bcee522da7342de391e5c3d7bfe1955b3) |
| Commit de publication sur `main` | [`bce17c82ef42fefb2790203a19732665f8c8203d`](https://github.com/PortenartCo/dobby-demo/commit/bce17c82ef42fefb2790203a19732665f8c8203d) |
| Empreinte SHA256 du manifeste servi | `1575b76e2f4d271224afb6b293e36920533445ab1d3dae10c5a7d2ec7a105a5e` |
| CI applicative finale | [43145552456](https://github.com/PortenartCo/dobby-demo/actions/runs/43145552456) — réussie sur le SHA source ci-dessus |
| CI synchronisation finale | [43145553693](https://github.com/PortenartCo/dobby-demo/actions/runs/43145553693) — réussie sur le même SHA |
| GitHub Pages | build terminé sur le commit de publication ; recette Chromium156 exécutée sur l’URL publique |

La publication est limitée au dossier `essai-dobby-v7-global-review-20261112/`. Les sources applicatives ne sont pas fusionnées dans `main`. Le premier commit ajoute 287 fichiers ; la correction E02 ultérieure ne modifie que ce même dossier. Aucun ancien aperçu n’est modifié ou supprimé. Le commit documentaire contenant ce rapport peut suivre le commit source : le bundle reste identifié par son propre SHA et son manifeste.

## Modules réellement intégrés

| Module | Fonctionnalités disponibles |
|---|---|
| E01 — Accueil | Synthèse quotidienne, missions, repas, événements et accès aux modules. |
| E02 — Parler à Dobby | Conversation locale, commandes déterministes existantes, liens vers les registres ; lecture et ajout dans la liste de Courses native active. Aucune IA distante. |
| E03/E04 — Missions et Runes | Création, attribution, modification, validation, récurrences, récompenses personnalisées, gains uniques, grades, historique signé et reprise explicite des anciennes missions. |
| E05 — Profil | Avatars, Maison, Patronus, grades et historique de Runes. |
| E06 — Première connexion | Rituel, Choixpeau, Maison, Patronus et reprise des questionnaires présents dans le socle E07. |
| E07 — Taverne et Courses | Recettes existantes, planning Midi/Soir, portions, import d’ingrédients, liste unique, disponibilité, archives et conflits. |
| E08 — Contrats et assurances | Registre et parcours existants. Les enregistrements de démonstration sont explicitement fictifs. |
| E09 — Salon | Membres, Agenda, événements et mémos familiaux versionnés. Les anciens mémos privés restent privés jusqu’à import explicite. |

Le header et le dock fixes, le profil en haut à droite, les préférences Effets/Son et les composants natifs sont conservés. Aucune refonte esthétique générale n’est engagée.

## Sources et réconciliation

| Source | Référence vérifiée et traitement |
|---|---|
| Socle historique | `69ef361ad139356c2d1473d825f9231e7610b0e4`, ascendant E07 et E09. |
| Base E07-P01/P02 | `c510ded81ee075c9b180e2551257351c557e541a`, CI de base `43127930111` réussie. |
| E09 Salon/Mémos | HEAD `8918068f9d53a1f7007a09dcf100ffaee3e9ec15` ; commits applicatifs `2496380`, `965645d`, `01d35be`, `1578ef4` intégrés, commit de preuves consulté. |
| Runes / compatibilité Missions | `1b9b89106aabea83081a2ba42d64e43a4308092c` ; réconciliation des seuls changements nécessaires avec leurs dépendances. |
| Partage Runes | `0a8e1ed674bc4abdbfaca29435fa495b19b32df4`, déjà ascendant des correctifs Runes, sans double application. |
| Courses de contrôle | Référence demandée `dbb61df9d46a414ef1dadd29a849955b44c93bc7`, HEAD relevé `f31659e5baead39c9188f4a18e7fc793585da505` : évolution limitée à la documentation et aux preuves, aucun delta applicatif. |

[Relevé initial des HEAD](evidence/global-review-20261112/source-heads.txt).

Le conflit réel dans `scripts/build-dobby-review.cjs` concernait les profils E07-P01 et E09. Les options, destinations, configurations et champs du manifeste ont été réconciliés en conservant les deux profils, puis leurs limites ont été testées.

`family-modules.js` a été réconcilié sémantiquement en `990c486` : mémos partagés `sharedFamilyNotes` dans le payload familial versionné, ledger Missions/Runes atomique, gains identifiés et champs inconnus préservés. Une ancienne mission dont la conversion perdrait des champs inconnus est bloquée avant écriture. Les dépendances `821acbf`/`ed1585f` (récurrences et récompenses), `fff0c8e` (client V2) et `f1aff5a` (reprise historique explicite) sont reprises ; les propositions SQL restent exclues.

Le client Courses canonique `family-v2.js` reste celui d’E07, avec ses révisions et disponibilités. Seule sa copie de démonstration est dirigée vers un domaine `.invalid` et attend le démarrage du transport fictif. Le raccord E02 (`6a6fcd9`) utilise la façade `DobbyCuisineList` existante pour lire et ajouter dans la liste active ; il ne crée ni stockage ni writer supplémentaire. Les générateurs restent la source des fichiers dérivés, et le manifeste distingue empreintes canoniques et copies transformées.

## Périmètre non repris et fonctions désactivées

Le socle E01–E08 reste celui de la base E07 validée. Les améliorations distinctes présentes dans les ancêtres de la branche Runes ne sont pas toutes reprises : filtres temporels et pagination E03, extensions de dictée et correction contextuelle des Courses, galerie de seize portraits supplémentaires, illustrations/transitions Stitch supplémentaires et révision ultérieure q2 du questionnaire E06. Les commandes, filtres statut/membre, avatars et questionnaires existants du socle restent disponibles. [Détail des commits exclus](evidence/global-review-20261112/excluded-ancestors.md).

Le catalogue existant et ses deux recettes DÉMO déjà présentes sont réutilisés ; aucun catalogue supplémentaire ni information de santé n’est inventé. Connexion, invitations et comptes familiaux réels, Supabase distant et appels IA payants sont désactivés. Les pièces jointes de démonstration restent locales.

## Validation et preuves

- **Campagne finale sur le SHA source** : CI applicative réussie, dont les 62 checkpoints historiques complets et tous les contrôles natifs/statiques, de génération, de manifeste, d’historique et de reset. La dernière correction E02 modifie une source native : cette campagne n’utilise donc aucune réutilisation de l’ancienne étape historique. La CI de synchronisation est également réussie. [Métadonnées et étapes finales](evidence/global-review-20261112/ci-final/ci-source-jobs.json).
- **Contrats natifs** : 186 tests familiaux réussis après réconciliation ; contrôles des conflits, de la persistance, des récurrences, des récompenses et des presets natifs réussis. [Journal natif](evidence/global-review-20261112/native-final.log), [récurrences](evidence/global-review-20261112/browser-recurrence-writer.log), [writer récompenses](evidence/global-review-20261112/browser-rewards-writer.log), [presets](evidence/global-review-20261112/browser-rewards-preset.log).
- **Génération** : limites integrated/E07-P01/E09, provenance des octets, refus d’écrasement et régénération depuis les sources canoniques vérifiés. [Limites du constructeur](evidence/global-review-20261112/build-boundaries.log).
- **Recette de l’URL publique** : Chromium156, largeurs **320, 390 et 1440 px**, parcours complets réussis. Zéro erreur navigateur/console, ressource manquante, requête externe ou écriture réseau réelle observée. [Résultats hébergés](evidence/global-review-20261112/hosted/summary.json), [journal](evidence/global-review-20261112/hosted/chromium.log).
- **Parcours transversal obligatoire** : créer un membre fictif → créer/attribuer/terminer une mission → gain unique → profil → repas → ingrédients dans les Courses → disponibilité → événement → mémo familial retrouvé. Navigation, Retour/Avance, rechargement et accès E02/E06/E08 vérifiés.
- **E02 et liste unique** : consultation de la liste native active, ajout par le formulaire de conversation, absence de doublon, présence dans les Courses, persistance après rechargement et lecture cohérente après mise à jour native. Régression de l’entrée directe dans la conversation sans liste E07 déjà initialisée. [RED/GREEN et revue indépendante](evidence/global-review-20261112/independent-review.md).
- **Deux clients fictifs A/B** : Courses, Runes et Mémos, reprise hors ligne, données en attente, conflit CAS par ligne et résolution native vers le serveur simulé ; identité B conservée après navigation/rechargement.
- **Reset hébergé approfondi** : pièces jointes natives A/B, timers, sauvegardes d’import, sessions et bases ouvertes supplémentaires nettoyés ; données étrangères conservées ; interruption et notifications tardives récupérées. Restauration du vrai document natif lors du retour arrière vérifiée. [Journal reset](evidence/global-review-20261112/hosted/reset.log).
- **Publication** : 287 ressources servies en HTTP200, toutes conformes aux SHA256 du bundle local validé, y compris le manifeste téléchargé. [Empreintes HTTP](evidence/global-review-20261112/hosted/http-proof.json), [manifeste servi](evidence/global-review-20261112/hosted/review-manifest.json), [périmètre Git](evidence/global-review-20261112/publication-scope.json), [build Pages](evidence/global-review-20261112/pages-build.json).

Les contrôles visuels vérifient header, dock, formulaires et largeur sans débordement horizontal aux trois tailles. Les captures Accueil/Salon du dossier `decoded` attendent aussi le chargement des polices et le décodage effectif des illustrations. Les autres captures accompagnent les étapes fonctionnelles.

## Anomalies et réserves

**Aucun P0 ou P1 connu restant dans les parcours vérifiés.**

| Priorité | Constat | Suite |
|---|---|---|
| P1 résolus | Raccord E02 : consultation de l’ancienne liste locale malgré la liste partagée active ; entrée directe susceptible d’utiliser l’ancienne préparation. | Lecture et ajout via la façade Courses existante ; régressions natives et recette hébergée. |
| P1 résolus | Reset incomplet/interrompu, notifications tardives et chargement lors d’un retour arrière. | Nettoyage complet, récupération sous Web Lock, jetons/générations et préservation du document natif déjà restauré. Tests déterministes RED→GREEN et recette hébergée. |
| P1 résolu | Historique Runes : annulations affichées comme gains. | `e5fb9e6` : +17 / −17 / +25, solde net25 ; registre confirmé inchangé. [RED](evidence/global-review-20261112/history-red.log), [GREEN](evidence/global-review-20261112/history-green.log). |
| P2 — libellés | Mémo familial : mentions héritées « Plumier privé / Conservation locale » malgré le statut partagé natif en bas. | Clarifier lors de la revue E09. |
| P2 — petit écran | À320px, les longs noms fictifs se replient fortement dans les cartes d’attribution. | Utilisable sans débordement ; arbitrage visuel différé. |
| P3 — contexte | L’Agenda revient au jour courant après rechargement ; sélectionner à nouveau la date retrouve l’événement. | Conservation de la date à arbitrer. |

Les erreurs des candidates intermédiaires restent dans les preuves historiques ; elles ne sont pas présentées comme le résultat final. La première publication `9625705` issue de `0f71950` a passé sa campagne hébergée, puis le contrôle complémentaire E02 a motivé la correction et une nouvelle validation complète.

## Isolation et limites de la démonstration

Les données sont fictives et identifiées comme telles. Préfixe de stockage : `dobby-review-v7-global-20261112|client-{A|B}|` ; backend fictif commun : `dobby-review-v7-global-20261112|backend-v1`. Les writers applicatifs, les révisions, le CAS, les conflits, les reprises et le dédoublonnage restent natifs ; le transport HTTP est simulé dans le navigateur. A et B doivent utiliser la même origine HTTPS et le même navigateur, avec IndexedDB et Web Locks.

**Cette simulation n’est pas une synchronisation Supabase réelle.** Aucun secret ni donnée privée n’est inclus dans l’aperçu. Aucun compte réel, SQL, migration ou modification Supabase n’a été utilisé. La migration `at_home_quantity` reste proposée et non appliquée. Le test ne prouve ni RLS ni RPC PostgreSQL réel ni synchronisation entre appareils.

Les anciens clients qui ignorent les mémos familiaux versionnés ou le ledger Runes V2 restent incompatibles avec ces opérations ; les anciens mémos privés demandent un import explicite. Safari/iPhone, microphone réel, commandes vocales matérielles et deux comptes familiaux réels ne sont pas validés par cette campagne Chromium.

## Captures à consulter

| Écran/parcours | 320px | 390px | 1440px |
|---|---|---|---|
| Accueil après décodage | [capture](evidence/global-review-20261112/hosted/decoded/accueil-320.png) | [capture](evidence/global-review-20261112/hosted/decoded/accueil-390.png) | [capture](evidence/global-review-20261112/hosted/decoded/accueil-1440.png) |
| Salon après décodage | [capture](evidence/global-review-20261112/hosted/decoded/salon-320.png) | [capture](evidence/global-review-20261112/hosted/decoded/salon-390.png) | [capture](evidence/global-review-20261112/hosted/decoded/salon-1440.png) |
| Mission terminée | [capture](evidence/global-review-20261112/hosted/04-completed-mission-320.png) | [capture](evidence/global-review-20261112/hosted/04-completed-mission-390.png) | [capture](evidence/global-review-20261112/hosted/04-completed-mission-1440.png) |
| Profil | [capture](evidence/global-review-20261112/hosted/05-profile-320.png) | [capture](evidence/global-review-20261112/hosted/05-profile-390.png) | [capture](evidence/global-review-20261112/hosted/05-profile-1440.png) |
| Courses/disponibilité | [capture](evidence/global-review-20261112/hosted/07-courses-availability-320.png) | [capture](evidence/global-review-20261112/hosted/07-courses-availability-390.png) | [capture](evidence/global-review-20261112/hosted/07-courses-availability-1440.png) |
| Conversation et Courses natives | [capture](evidence/global-review-20261112/hosted/13-dobby-320.png) | [capture](evidence/global-review-20261112/hosted/13-dobby-390.png) | [capture](evidence/global-review-20261112/hosted/13-dobby-1440.png) |
| Mémo familial | [capture](evidence/global-review-20261112/hosted/09-shared-memo-320.png) | [capture](evidence/global-review-20261112/hosted/09-shared-memo-390.png) | [capture](evidence/global-review-20261112/hosted/09-shared-memo-1440.png) |

[Client B](evidence/global-review-20261112/hosted/10-client-b-shared-390.png), [hors ligne](evidence/global-review-20261112/hosted/11-offline-pending-390.png), [conflit CAS](evidence/global-review-20261112/hosted/12-cas-conflict-390.png), [preuves de décodage](evidence/global-review-20261112/hosted/decoded/visual-proof.json).

## Revue progressive avec ChatGPT

1. Ouvrir l’URL et lire le bandeau de démonstration ; commencer avec le client A.
2. E01 : synthèse et liens, navigation/Retour ; E02 : consulter les Courses puis ajouter un article fictif.
3. E03/E04 : créer, attribuer et terminer une mission ; contrôler gain unique, annulation et historique.
4. E05/E06 : profil, Maison/Patronus, reprise et confirmation du Rituel.
5. E07 : Midi/Soir, portions, import et liste unique ; ouvrir B pour la disponibilité partagée simulée.
6. E08 : consulter/modifier un contrat fictif, recharger et retrouver l’enregistrement.
7. E09 : membre, événement et mémo ; synchroniser B, tester attente et reprise.
8. Examiner ensuite 320/390/1440px et les captures ; séparer corrections fonctionnelles et arbitrages esthétiques. Ne lancer aucune refonte automatiquement.

Pour chaque observation : module, client, largeur, étapes, attendu, constat, capture et priorité P0 (blocage/perte), P1 (fonction incorrecte), P2 (ergonomie/navigation/visuel), P3 (amélioration).

## Retrait éventuel

Un retrait se prépare par un nouveau commit supprimant uniquement ce dossier statique, sans toucher aux autres aperçus. Il n’a pas été exécuté ni testé. Aucune donnée distante n’est à restaurer. La réinitialisation embarquée concerne seulement les données fictives et le préfixe de cet aperçu.
