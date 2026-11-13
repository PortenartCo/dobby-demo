# DOBBY V7 — revue indépendante avant publication

Périmètre : diff depuis `b327aa5194b5f5897f4354e13266059815722eaa` jusqu'au worktree courant de `/workspace/dobby-v7-review`, branche `feat/dobby-v7-revue-generale-20261113`. HEAD observé pendant la revue : `f18a656b7c8cf02060977b29860927c5ba1a2659` ; des finitions locales restaient en cours. Références : prompt et registre normatifs `/workspace/dobby-v7-spec/01_PROMPT_CODEX.md` et `02_REGISTRE_RECETTE.md`.

## Résultat à ce checkpoint

**Aucun P1/P2 restant démontré sur le worktree revu.** Un défaut P2 confirmé pendant cette revue a été corrigé par le lot Missions puis vérifié indépendamment, y compris le parcours navigateur. Les dépendances backend décrites plus bas restent fermées et ne sont pas déclarées opérationnelles. Ce document ne remplace pas la CI finale du commit publié.

### R1 — P2 : une nouvelle mission sans attribution ne peut plus être terminée

- Fichiers : `essai-stitch-v5-famille/family-missions.js`, lignes 211–225 à la découverte ; `family-missions-core.mjs`, helper `assignmentIds` ; `family-runes-core.mjs`, `completionRequests`.
- Déclencheur : créer une nouvelle mission sans sélectionner de responsable ni « Toute la famille ». Le formulaire accepte cet état et enregistre `participantVersion:1`, `assigneeIds:[]`, `allFamily:false`.
- Défaut : le dialogue de complétion utilise directement les seuls IDs attribués et ne contient donc aucune case. La confirmation appelle `allocateReward(total,[])`, qui rejette avec « Choisissez des participants distincts ». La mission normale par défaut est bloquée tant qu'elle n'est pas modifiée.
- Preuve indépendante : `normalizeMission` accepte cet objet ; avec un membre parent réel de fixture, `assignmentIds` retourne `[]` ; `completionRequests` lève l'erreur ci-dessus. Aucun serveur nécessaire pour reproduire.
- Correction minimale recommandée : pour une mission réellement non attribuée seulement, proposer les humains présents et exiger le choix des participants réels. Conserver le refus pour une référence d'ancien membre supprimé et pour les animaux. Une maisonnée réellement vide peut conserver la complétion historique sans crédit, sans inventer de membre. Le validateur du calcul et les deux dialogues doivent partager cette même règle.
- État final : **CORRIGÉ, revérifié indépendamment**. Les helpers `completionCandidateIds` et `canCompleteWithoutParticipants` de `family-runes-core.mjs` centralisent la même règle dans le calcul, le dialogue natif et le dialogue V7 (`tools-register.js`). La référence à un membre retiré reste refusée ; les animaux/bébés ne reçoivent pas de Rune ; une maisonnée réellement vide peut terminer sans crédit avec information explicite. Le gate de partage V3 reste fermé.
- Preuve finale : **26/26 unités ciblées PASS** après modification et `missions-unassigned-review.cjs` **PASS à 320 px** : création par le wizard sans responsable, choix explicite d'un participant réel, 25 Runes uniquement à ce participant, refus sans choix, maisonnée vide sans crédit, attribution supprimée non contournable.

Empreintes du correctif revérifié avant commit :

| Fichier | SHA-256 |
|---|---|
| `essai-stitch-v5-famille/family-runes-core.mjs` | `4f63519da41c9f1ba9c49aa923093e92c5e96e058292c66d5d7b712803cbf2ec` |
| `essai-stitch-v5-famille/family-missions.js` | `38d8c5d06a5ab0c74bd52f5af711d3bf977e820d0b59dd13e040a81e4648a218` |
| `essai-stitch-v7/tools-register.js` | `472657b7e8f3b0c12757e2aa9a9b2bf112f7a1f2edb1a85d56af2daf122f9695` |

## Contrôles indépendants réellement exécutés

| Contrôle | Résultat |
|---|---|
| Allocations, zéro/solo, compensation, historiques, concurrence simulée, gates V3, politique transport enfant, permissions du chat, puis régression sans attribution | **26/26 tests unitaires PASS** après correction |
| `v7-meals-model.cjs` : dessert distinct, portions, état préparé, CAS périmé, transaction/restauration, déplacement, rechargement | **PASS** dans navigateur local et fixtures fictives |
| `review-shopping.cjs` : liste unique, compteur, quantité disponible non achetée, modale, focus/scroll, corrections, clôture, persistance | **PASS à 320/390/768/1024/1440/1920 px** |
| `v7-transversal.cjs` : six destinations, appui maintenu, relâchement/cancel/blur/changement de route, callback tardif, clavier, halo avec effets OFF, brouillon/envoi | **PASS**, six largeurs |
| `missions-unassigned-review.cjs` : wizard sans responsable, participants réels, maison vide, attribution supprimée | **PASS**, 320 px, indépendant après correction |
| `git diff --check` | **PASS** au moment de l'exécution |

Commandes :

```bash
node --test essai-stitch-v5-famille/tests/mission-participants-runes.test.mjs essai-stitch-v5-famille/tests/missions-review.test.mjs essai-stitch-v5-famille/tests/missions-v3-sharing-gate.test.mjs essai-stitch-v5-famille/tests/family-write-policy.test.mjs essai-stitch-v7/tests/v7-chat-permissions.test.cjs
DOBBY_TEST_ORIGIN=http://127.0.0.1:8765 node essai-stitch-v7/tests/v7-meals-model.cjs
DOBBY_TEST_ORIGIN=http://127.0.0.1:8765 DOBBY_SHOPPING_EVIDENCE=/workspace/dobby-independent-shopping-evidence node essai-stitch-v7/tests/review-shopping.cjs
DOBBY_TEST_ORIGIN=http://127.0.0.1:8765 DOBBY_TRANSVERSAL_EVIDENCE=/workspace/dobby-independent-transversal-evidence node essai-stitch-v7/tests/v7-transversal.cjs
DOBBY_TEST_ORIGIN=http://127.0.0.1:8765 node essai-stitch-v7/tests/missions-unassigned-review.cjs
git diff --check
```

Les fixtures Playwright ci-dessus bloquent toutes les requêtes hors de l'origine HTTP locale. Captures indépendantes conservées hors du dépôt dans les deux répertoires indiqués. Les gestes navigateur sont réels, mais les callbacks de reconnaissance vocale sont simulés.

## Lecture ciblée et gates

- L'événement V3 contient une répartition atomique et un total unique ; l'ordre et le reste sont déterministes. Les gates refusent l'entrée d'allocations V3 et de missions multiples dans les writers historiques V1/V2. Ils conservent les états locaux plutôt que rétrograder silencieusement le journal.
- La fin de Cuisine vérifie recette, dernière étape et snapshot du seul composant ; plat et dessert conservent états et portions séparés. Une deuxième confirmation n'est pas un second achèvement. Le déplacement préserve `_e072ImportRef`, utilisé par le writer courses pour ses reçus ; une suspicion initiale de duplication après déplacement n'a pas été retenue comme défaut.
- La nouvelle UI de disponibilité utilise les writers et contrôles CAS préexistants. L'état « à domicile » ne coche pas l'achat. Les erreurs de colonne/permission ne sont pas présentées comme un succès.
- La protection du chat relit l'identité et la catégorie canonique à l'exécution de la suppression confirmée. La garde du transport interdit au profil enfant connu les mutations REST/storage/RPC hors magie propre et lectures explicitement admises. Ces gardes clientes ne valent pas preuve des autorisations serveur.

## SQL manuel et limites de livraison

Lecture de `supabase/README-ROLES.md`, `roles-00-preflight.sql`, `roles-01-apply.sql`, `roles-02-verify.sql`, `roles-03-rollback.sql`, du contrat Missions et des scripts Courses. Aucun SQL exécuté par cette revue. Le pack rôles est explicitement restrictif et conserve les données ; il ne certifie pas les RPC SECURITY DEFINER existantes. Son rollback est explicitement décrit comme pouvant réouvrir les droits précédents.

Le contrat Missions indique sans ambiguïté que la migration V3 complète n'est **pas fournie** : les trois SQL présents sont des contrôles en lecture seule. Les corps privés réels du writer historique manquent dans les sources disponibles. Cette absence est un **travail backend restant**, pas une installation prête ni une fonctionnalité partagée opérationnelle. Le gate doit rester fermé et les IDs concernés `ATTENTE_UTILISATEUR`/`PARTIEL`. Le rattachement Auth d'un enfant existant demeure désactivé ; la gestion complète d'un autre parent requiert aussi le contrat serveur annoncé.

Cette revue n'a pas contacté Supabase, GitHub ou la production. Aucun fichier produit modifié, aucun push/merge, aucune migration. Elle ne valide ni accès réels A/B, RLS/RPC, e-mails Auth, navigateur physique iPhone, microphone matériel, ni nouveau déploiement. Le worktree a évolué pendant la revue ; les corrections ultérieures doivent rester sous les mêmes vérifications et CI.
