# DOBBY V7 — baseline Git, CI et publication (lecture seule)

Observation : **2026-11-13, environ 01:26 UTC**. Mission normative lue dans l'ordre `00_LIRE_D_ABORD.md`, `01_PROMPT_CODEX.md`, `02_REGISTRE_RECETTE.md` sous `/workspace/dobby-v7-spec`. Rapport technique indépendant limité à la reprise de livraison ; il ne remplace pas le rapprochement fonctionnel des 60 IDs.

## État intégré exact

- Dépôt public : https://github.com/PortenartCo/dobby-demo ; branche par défaut `main`.
- Clone initial propre sur `main`, en phase avec `origin/main` : **`b327aa5194b5f5897f4354e13266059815722eaa`**. Le SHA annoncé par l'utilisateur est confirmé par l'API GitHub.
- Aucun `AGENTS.md` trouvé dans le dépôt par `rg --files -g AGENTS.md`.
- Branche antérieure conservée : `feat/dobby-v7-stitch19-20-integration-20261112`, tête **`efea3a3718fb717a0c264744c40c39a3e711a5b2`**.
- [PR #4](https://github.com/PortenartCo/dobby-demo/pull/4) **MERGED** le `2026-11-13T00:06:02Z`, merge **`6b11db2ea60eefb0611972226c801bb3f08760f3`**.
- `git merge-base --is-ancestor efea3a3718fb717a0c264744c40c39a3e711a5b2 b327aa5194b5f5897f4354e13266059815722eaa` retourne **0** : le chantier est réellement intégré. Ne pas repartir du vieux `0f3131f3deb1ff63f3accca9c591521b04f4f212`.

Correctifs ultérieurs déjà intégrés à préserver :

| PR | Tête du correctif | Merge | Fusion UTC |
|---|---|---|---|
| [#5 — diagnostic connexion/contexte](https://github.com/PortenartCo/dobby-demo/pull/5) | `23f1cd0b0612930b1c6dc5ea6f2f7b91fbdb1d09` | `e8d53fd861a3963db8721581330029a66f994c8d` | 2026-11-13T00:33:56Z |
| [#6 — compatibilité Auth géré](https://github.com/PortenartCo/dobby-demo/pull/6) | `29f133c226e0cfacff1a88d55cd397d9f0000151` | `7c2fb86304f6a87a0d94b09416fb1d0726041297` | 2026-11-13T00:55:09Z |
| [#7 — invitation consommée/reprise](https://github.com/PortenartCo/dobby-demo/pull/7) | `d5d49368d1948d19dc9b5316e63a41eb967e446a` | `b327aa5194b5f5897f4354e13266059815722eaa` | 2026-11-13T01:14:34Z |

## CI et GitHub Pages

| Contrôle | SHA | Résultat / preuve |
|---|---|---|
| CI fonctionnelle PR Stitch #4 | `efea3a3718fb717a0c264744c40c39a3e711a5b2` | [43331196920](https://github.com/PortenartCo/dobby-demo/actions/runs/43331196920), `completed/success`, fin 00:05:10Z |
| CI synchronisation PR #4 | même tête | [43331196907](https://github.com/PortenartCo/dobby-demo/actions/runs/43331196907), `completed/success` |
| CI fonctionnelle main actuel | `b327aa5194b5f5897f4354e13266059815722eaa` | [43343412745](https://github.com/PortenartCo/dobby-demo/actions/runs/43343412745), `completed/success`, fin 01:21:53Z |
| Pages build/deploy main actuel | même tête | [43343410885](https://github.com/PortenartCo/dobby-demo/actions/runs/43343410885), `completed/success`, fin 01:16:29Z |
| Pages build API | même tête | `status=built`, aucune erreur, `updated_at=2026-11-13T01:16:19Z` |
| Déploiement Pages | même tête | ID `7754310545`, environnement `github-pages`, dernier statut `success` à `2026-11-13T01:16:29Z` |

Pages utilise **main, racine `/`, build legacy**, HTTPS imposé. URL canonique : **https://portenartco.github.io/dobby-demo/**. Le document racine canonique relaie vers **https://portenartco.github.io/dobby-demo/essai-stitch-v7/famille.html#access** ; il protège les entrées Auth/invitation et conserve `index-v2.9.2.html` comme archive.

La CI de main contient les contrôles syntaxe, offline/family/conflicts, provenance builder, E06, import recettes et timers, génération reproductible, sources Stitch, navigateur natif 19/20 et PREP-01 en succès. Les étapes « Famille integration native contracts… », « Global E01–E09… » et son archivage sont **skipped** sur cette exécution ; ne pas les présenter comme relancées sur b327aa5. Le push CI annulé de la branche antérieure est suivi par le PR CI réussi cité ci-dessus.

## Source ↔ hébergement

Contrôle **HTTP GET statique sans exécution JavaScript** : **78/78 fichiers HTTP 200**, strictement identiques octet pour octet à `git show b327aa5194b5f5897f4354e13266059815722eaa:<fichier>`. Cela inclut racine, archive V2.9.2, quatre HTML V7, tous les scripts/styles locaux déclarés par `famille.html`, illustration d'accueil et illustrations Maison. Aucun cache local ou fichier en cours d'édition n'a servi de source de comparaison.

Les SHA-256, tailles, Content-Type, ETag, URL et résultat individuels sont conservés dans **`/workspace/dobby-baseline-hosted.json`**. L'API de déploiement associe la publication à b327aa5 ; l'identité des 78 contenus établit la correspondance des ressources vérifiées avec ce commit. Aucun marqueur de commit autonome n'est exposé dans le HTML : ne pas dire que le serveur retourne littéralement un SHA Git embarqué.

## Sources persistantes et limites constatées

Les sources attendues sont présentes : `docs/dobby-v7/stitch19-20/{MISSION,SPECIFICATION,ARCHITECTURE,VALIDATION}.md`, `supabase/{README,DASHBOARD}.md`, preuves navigateur/unités/six largeurs, captures et SQL manuels. Le code natif d'accès/cérémonies et les correctifs #5–#7 sont déjà présents. Aucun nouveau développement nécessaire pour reconstruire leur chantier.

L'état Supabase est **uniquement documentaire** dans cette mission : les rapports existants indiquent que l'utilisateur a déjà exécuté/vérifié les SQL 01, 06 et 11. Ne pas les réexécuter. `INVITATION-REPRISE.md` documente deux comptes actifs liés à deux profils distincts du même foyer, mais réserve encore la reprise navigateur du compte B, la synchronisation Courses et la reconnexion. Le présent audit n'atteste pas ces parcours réels ni les futurs changements du registre.

**Aucune requête, aucun connecteur, aucune API et aucune mutation Supabase ; aucun test de navigateur hébergé susceptible d'en déclencher. Aucun write GitHub ou production.** Les accès réseau ont été limités aux API GitHub en lecture et aux fichiers statiques GitHub Pages.

Blocages/limites pour la suite : recette Auth/RLS/RPC et synchronisation à deux comptes non vérifiables ici sous l'interdiction d'accès distant ; micro physique et iPhone réel non testés par ce sous-audit ; la conformité fonctionnelle des 60 IDs reste à rapprocher et tester par les lots responsables. Aucun blocage de reprise Git/Pages : commencer depuis b327aa5 est justifié.

## Commandes de preuve (lecture seule)

```bash
git -C /workspace/dobby-demo status --short --branch
git -C /workspace/dobby-demo log -6 --format='%h %H %cI %s'
git -C /workspace/dobby-demo merge-base --is-ancestor efea3a3718fb717a0c264744c40c39a3e711a5b2 b327aa5194b5f5897f4354e13266059815722eaa
gh api repos/PortenartCo/dobby-demo/branches/main
gh api repos/PortenartCo/dobby-demo/branches/feat%2Fdobby-v7-stitch19-20-integration-20261112
gh pr list --repo PortenartCo/dobby-demo --state all --head feat/dobby-v7-stitch19-20-integration-20261112 --json number,state,mergedAt,url,headRefOid,mergeCommit
gh pr list --repo PortenartCo/dobby-demo --state merged --limit 6 --json number,title,url,mergedAt,headRefName,headRefOid,mergeCommit
gh pr view 4 --repo PortenartCo/dobby-demo --json number,state,mergedAt,url,commits,statusCheckRollup
gh run list --repo PortenartCo/dobby-demo --limit 12 --json databaseId,workflowName,headSha,status,conclusion,url,createdAt,updatedAt,event,headBranch
gh api repos/PortenartCo/dobby-demo/actions/runs/43343412745/jobs
gh api repos/PortenartCo/dobby-demo/pages
gh api repos/PortenartCo/dobby-demo/pages/builds/latest
gh api repos/PortenartCo/dobby-demo/deployments
gh api repos/PortenartCo/dobby-demo/deployments/7754310545/statuses
```

Comparaison statique exécutée par Python `urllib.request` (GET des seuls chemins locaux issus de l'HTML + ressources illustrées), `git show <SHA>:<path>` et `hashlib.sha256`, avec sortie JSON détaillée ci-dessus. Aucun navigateur ni SDK applicatif exécuté.
