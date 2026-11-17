# Régressions natives Dobby — 16 novembre 2026

- Contrôle en lecture seule de `/workspace/dobby-demo` ; aucun fichier du dépôt, branche ou commit modifié par cette mission.
- Branche observée : `feat/dobby-v7-settings-20261116` ; HEAD : `521c9199ac18cb71b2fbbd2717ded2f7781aa4db`.
- Vérification terminée le 2026-11-16T23:07:56+00:00.
- **Résultat : 628 tests réussis / 628, aucun échec, aucune annulation et aucun test ignoré** (55 fichiers).
- Aucun navigateur, serveur HTTP ou générateur de bundle lancé. Les transports Node `net`, `http`, `https`, `dgram` et `fetch` sont bloqués avant le chargement des tests par `/workspace/scratch/dobby-native-network-guard.cjs`.

| Groupe | Fichiers | Tests | Réussis | Échecs | Code de sortie | Log |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| core | 39 | 439 | 439 | 0 | 0 | `/workspace/scratch/dobby-native-core.log` |
| permissions | 3 | 15 | 15 | 0 | 0 | `/workspace/scratch/dobby-native-permissions.log` |
| courses-repas | 7 | 84 | 84 | 0 | 0 | `/workspace/scratch/dobby-native-courses-repas.log` |
| contrats-maison | 6 | 90 | 90 | 0 | 0 | `/workspace/scratch/dobby-native-contrats-maison.log` |

## Commandes et couverture

Chaque commande commence par `node --require /workspace/scratch/dobby-native-network-guard.cjs --test` ; les chemins ci-dessous sont relatifs au dépôt.

### Socle natif

`essai-sync-v1/tests/*.test.mjs essai-sync-v2/tests/*.test.mjs essai-stitch-v5-famille/tests/*.test.mjs`

Couvre notamment synchronisation V1/V2, contrats et Maison, accès natif, rattachement canonique, membres et rôles, politiques d'écriture, profils, reprises de session, missions, runes et réserves. Les API distantes des tests sont factices.

### Permissions enfants et membres

`essai-stitch-v7/tests/access-flow-child-socle.test.mjs essai-stitch-v7/tests/reserves-family-role.test.mjs essai-stitch-v7/tests/v7-chat-permissions.test.cjs`

Contrôle l'acceptation d'une invitation enfant, la lecture seule canonique des enfants, le refus des écritures et suppressions par le chat, la perte du droit parent avant exécution et le refus de s'appuyer sur des rôles locaux obsolètes.

### Courses et repas

`essai-stitch-v5-famille/tests/prep-writer.test.cjs essai-stitch-v5-famille/tests/preparation-sync.test.cjs essai-stitch-v7/tests/prep-courses.test.cjs essai-stitch-v7/tests/e07-p02-model.test.cjs essai-stitch-v7/tests/e07-p02-home-core.test.mjs essai-stitch-v7/tests/e07-4-timers.test.cjs essai-stitch-v7/tests/e07-4-import-format.test.mjs`

Contrôle modèles, agrégation des courses, importations, écritures natives avec reçus, persistance et reprise, périmètres de foyer, refus d'une portée devenue obsolète, restauration sur échec et minuteurs persistants.

### Contrats et Maison

`essai-stitch-v5-famille/tests/contracts-writer.test.cjs essai-stitch-v5-famille/tests/house-writer.test.cjs essai-stitch-v7/tests/contracts-model.test.mjs essai-stitch-v7/tests/contracts-import.test.mjs essai-stitch-v7/tests/house-model.test.mjs essai-stitch-v7/tests/equipment-import.test.mjs`

Contrôle les writers, modèles, imports JSON/ZIP et documents, refus des entrées invalides, conservation des valeurs inconnues et du zéro, échéances, maintenance, ainsi que la protection des données existantes en cas d'erreur.

## Limites et suite possible

Aucun échec observé : aucune distinction préexistant/régression n'a donc été nécessaire. Ces tests ont lu le worktree actif pendant le développement parallèle ; ils ne figent pas un artefact immuable. Les écrans Paramètres, sauvegarde et navigation doivent recevoir la validation navigateur prévue par l'agent principal, puis une nouvelle passe native peut être lancée lorsque les derniers changements sont stabilisés.

Les scripts Playwright et scripts npm combinant des tests navigateur ont été volontairement exclus de cette passe. Aucun test ne vise un service distant réel.
