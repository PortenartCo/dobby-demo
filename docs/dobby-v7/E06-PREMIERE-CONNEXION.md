# E06 — Première connexion et cérémonie magique

> Ce document conserve la livraison historique. Les décisions du 11 novembre et leurs corrections actuelles sont suivies dans [la consolidation](CONSOLIDATION.md) et [la matrice exhaustive](CONSOLIDATION-MATRIX.md). Les points bloqués/reportés ne sont pas déclarés terminés.


Branche indépendante `feat/dobby-e06-onboarding`, depuis E05 `8418682e5094b66ee879fbf18dcd1e6a3b6d5a05`. Spécification utilisateur : [E06-SPEC.md](E06-SPEC.md). Livraison bornée pour revue humaine ; aucune fusion, publication Pages, opération serveur ou utilisation de comptes familiaux réels.

## Périmètre livré et sources

Sept compositions HTML Stitch réellement dérivées des sources du ZIP et raccordées au routeur Famille V7, au profil E05 et au writer natif existants. **Cinq écrans fonctionnels et deux partiels**, sans déclarer une capacité serveur absente comme livrée. Le recensement des 53 sources antérieures reste inchangé : E06 constitue un inventaire séparé `onboarding` dans le [manifeste](../../essai-stitch-v7/route-manifest.json).

| Scène / route | HTML original sous `design/e06/references/stitch/` | État réel |
|---|---|---|
| `onboarding-foyer` | `dobby_mon_foyer_magique` | Partiel : connexion native configurée, registre local et choix explicite du membre ; création/invitation/liaison vérifiée non livrées |
| `onboarding-identity` | `dobby_mon_identit` | Fonctionnel : création/modification native, nom de famille, huit avatars E05 et emoji ; photo indisponible, autorisation parentale non représentée |
| `onboarding-house` | `dobby_le_myst_re_des_quatre_maisons` | Questionnaire fonctionnel ; partiel graphiquement, illustration Choixpeau originale indisponible |
| `onboarding-house-result` | `dobby_la_r_v_lation_de_la_maison` | Résultat calculé, quatre thèmes/emblèmes, confirmation explicite |
| `onboarding-patronus` | `dobby_le_miroir_des_mes` | Questionnaire exact, miroir original local |
| `onboarding-patronus-result` | `dobby_l_apparition_du_patronus` | Douze résultats calculés et illustrations E05, confirmation explicite |
| `onboarding-final` | `dobby_mon_identit_magique_consacr_e` | Identité réelle du membre, grade/runes E04, sortie vers Traverse |

Les sources originales sont inchangées et vérifiées par [empreintes SHA-256](../../design/e06/provenance.json). `build-onboarding.cjs` produit les templates et données de routes ; le JSON de calcul distribué est une copie exacte. Le même routeur gère les retours et reprises. Pendant la cérémonie, les barres habituelles sont masquées au profit de l’en-tête léger ; elles sont restaurées à la sortie. Préférences de sons/effets et `prefers-reduced-motion` conservées. Refaire un questionnaire depuis E05 fonctionne ; les changements manuels E05 restent disponibles.

La Cheminette n’a pas été trouvée dans les sources accessibles (inventaires et recherche ciblée des noms/contenus) : elle n’a pas été recréée. L’entrée E06 est accessible depuis le profil et par `famille.html#onboarding-foyer` ; aucun compte n’est arbitrairement associé ni redirigé comme s’il disposait d’une liaison vérifiée.

## Calcul exact — checkpoint A

`onboarding-scoring.mjs` utilise les textes, identifiants A/B/C/D, poids et règles du JSON canonique. Maison : six questions, complément seulement si l’écart le demande ; Patronus : cinq questions, complément conditionnel pour départager les modes/nuances. Aucun résultat intermédiaire exposé, aucun hasard, horloge, compte ou ID de membre dans le calcul.

**25 600 comparaisons JavaScript/Python passent** : toutes les combinaisons de base et les quatre réponses complémentaires, y compris les compléments non nécessaires qui doivent être ignorés. `validate.py` reproduit aussi exactement le `qa-results.json` fourni. Les quatre Maisons et douze Patronus sont accessibles. Mapping explicite des IDs français du barème vers les IDs existants du catalogue E05. [Tests exhaustifs](../../essai-stitch-v7/tests/e06-scoring.test.mjs), [journal](evidence/e06/logs/e06-unit-11.log).

## Identité, reprise et intégrité — checkpoints B/D

- Une seule identité canonique `familyMembers` par ID ; création et sauvegardes via `v23MemberForm/save` natifs. Noms historiques conservés sans découpage arbitraire ; prénom/nom structurés uniquement sur saisie explicite. Champs inconnus préservés.
- Résultat recalculé et écrit seulement après confirmation explicite : IDs E05 dans `magicProfile`, versions `houseAlgorithmVersion` / `patronusAlgorithmVersion: e06-v1`. Une édition manuelle E05 retire uniquement la provenance du résultat concerné.
- Brouillons dans le magasin `meta` IndexedDB déjà existant, isolés par utilisateur/foyer puis membre. Pas de second stockage ou moteur de synchronisation. Écriture atomique dans une transaction native ; les onglets préservent les brouillons de membres différents et refusent une révision concurrente du même membre.
- Retour, pause, passage ultérieur, rechargement et reprise gardent les réponses utiles. Les réponses brutes du questionnaire sont effacées à sa confirmation ; la fin efface les réponses et champs d’identité temporaires restants. Aucun jeton ni clé dans ces brouillons.
- Changement de contexte/membre, suppression, profil modifié, version incompatible ou accès explicitement refusé : blocage sans écriture silencieuse. Un refus de stockage restaure l’état précédent et laisse l’utilisateur réessayer/quitter. Après création réussie mais reprise temporaire en échec, l’ID créé est immédiatement fixé pour éviter tout doublon.
- Les gains, seuils, crédits, historique et protocole de runes E04 restent inchangés. Nouveau membre : valeur réelle du ledger, Pastille de cuivre et 0 rune ; membre existant testé avec 85 runes, conservées. Les libellés des grades sont harmonisés en « Pastille » sans changer le calcul.

## Compte–foyer–membre — checkpoint C

| Parcours | Livré / limite |
|---|---|
| Connexion à un foyer existant | Réutilisation de `login` / `requireHousehold()` et memberships natifs, uniquement avec configuration publique déjà présente. États vérifié, cache hors ligne, vérification en cours et refus explicite distingués |
| Compte reconnu → entrée directe du membre terminé | Bloqué : aucune liaison compte–membre vérifiée disponible. Aucune déduction par nom, email, ordre ou dernier profil |
| Premier adulte : inscription + création foyer | Bloqué : capacités serveur autorisées non établies dans les sources accessibles |
| Second adulte : invitation + association | Bloqué : invitation et liaison vérifiées non disponibles ; pas de succès simulé |
| Enfant sans compte | Profil possible via les droits existants du registre ; aucune nouvelle permission parentale revendiquée ni rôle déduit côté client |
| Membre existant | Choix explicite par ID, modification et reprise sans duplication, conservation des données/runes |

La clé publique n’est pas inventée ou copiée depuis les fixtures. Si elle n’est pas déjà configurée, la limite est expliquée et la configuration native avancée reste accessible. Aucune authentification alternative. La façade E06 expose les seuls états de connexion, sans secrets.

[Proposition technique minimale](../../sql-proposals/E06-PREREQUIS.md) **non exécutée** : création atomique foyer/membership, invitations vérifiées, liaison stable compte/foyer/membre canonique, droits parentaux, configuration publique et protection des writers. L’existence éventuelle de capacités en production n’a pas été vérifiée avec un compte réel ; aucune prétention d’absence absolue du serveur.

## Visuel et médias

[Comparaisons écran par écran](evidence/e06/README.md) : **60 captures**, dont 21 avant (sources HTML), 21 après, 4 Maisons, 12 Patronus et 2 profils après resynchronisation. Sept scènes à **320, 390 et 1440 px** ; variantes à 390 px. Contrôles navigateur des débordements, réponses tactiles, retours, validations, thèmes et dimensions réelles des illustrations.

Écarts nécessaires : typographies et header/progression DOBBY communs, correction responsive des dimensions, vraies questions à la place des exemples, sélection directe des résultats retirée, données fictives retirées, actions non livrées explicitement inactives. Les cadres et compositions des HTML originaux sont conservés. Le rendu « avant » local n’exécute pas le CDN Tailwind et ne prétend pas restaurer les médias manquants ; les captures Stitch fournies sont aussi liées pour comparaison.

Le miroir original est localisé et vérifié (49 860 octets, SHA-256 `04aaf1d77ab1129639d7026a1411da910381388115546f86c91d1a76c7fc29fa`). L’URL originale du Choixpeau renvoie HTTP 200 avec du HTML, pas une image : absence affichée dans son cadre, aucune illustration inventée ou capture utilisée comme asset. [Provenance médias](../../essai-stitch-v7/assets/onboarding/provenance.json). Les portraits, quatre emblèmes et douze Patronus viennent des assets locaux E05. Import photo privé toujours indisponible.

## Vérifications et revue

- Tests Node natifs V1/V2/Famille + E06 : **91/91 PASS** ; sous-ensemble E06 : **11/11 PASS**, incluant calcul exhaustif, isolation/reprise, conflit natif et limite interversions. [Journal 91](evidence/e06/logs/unit-91.log).
- E06 navigateur : `e06-auth.cjs` (4 fixtures HTTP), `e06.cjs` (7 scènes × 3 largeurs), `e06-edge.cjs` (variantes, quota, profil existant), `e06-recovery.cjs`, `e06-review.cjs`, `e06-shared.cjs` (320/390), `e06-visual.cjs` (21 références). Writer et IndexedDB natifs réels dans le navigateur ; API réseau simulée. Ce ne sont ni une authentification réelle ni une validation RLS.
- Revue technique indépendante du diff E05→E06 : trois P2 établis, corrigés avec tests causaux conservés : création partiellement réussie puis retry, concurrence entre deux onglets IndexedDB réels, membership restaurée puis refusée. [Journal causal](evidence/e06/logs/review-causal.log).
- Défauts de recette corrigés et revalidés : retour intercepté par le vieux bridge, pause après refus meta, choix visuel après erreur de stockage, illustration Patronus réduite par absence d’un utilitaire CSS compilé. Tests causaux et dimensions >=150×150 ajoutés ; parcours et 12 variantes rerun PASS.
- Une campagne générale finale `tests/ci.cjs` couvre les 45 scripts, dont E01/E02/E04/E05, Cuisine, Famille et registres. **45/45 scripts PASS, code de sortie 0**. Son journal est conservé dans [general-browser.log](evidence/e06/logs/general-browser.log).
- E03 vérifié sur **composition temporaire sans merge ni commit** depuis `6a86ead6341eb2f17e7552852621c21f496ad97c` : E03 et parcours E06 PASS à 320/390/1440. Renderer/générateur Missions E03 conservés ; adaptations de sélecteurs QA explicitées, aucune assertion retirée. [Métadonnées](evidence/e06/e03-composition.json), [tests E03](evidence/e06/logs/e03-regression.log), [E06 sur composition](evidence/e06/logs/e03-e06-journey.log).
- Génération des templates/manifeste et copies de sources vérifiée reproductible ; aucune nouvelle dépendance applicative.

Commandes de recette locale :

```sh
node --test essai-sync-v1/tests/*.test.mjs essai-sync-v2/tests/*.test.mjs essai-stitch-v5-famille/tests/*.test.mjs essai-stitch-v7/tests/e06-*.test.mjs
DOBBY_TEST_ORIGIN=http://127.0.0.1:8766 CHROMIUM_PATH=/usr/bin/chromium node essai-stitch-v7/tests/ci.cjs
node essai-stitch-v7/build-source.cjs
```

Les workflows `Dobby Sync regression (local)` et `Dobby V7 - Stitch functional UI` doivent réussir **au SHA final poussé**, sans publication. Leurs exécutions sont consultables dans [Actions, branche E06](https://github.com/PortenartCo/dobby-demo/actions?query=branch%3Afeat%2Fdobby-e06-onboarding) ; les IDs et résultats exacts sont fournis au bilan de livraison, sans nouveau commit qui invaliderait ce SHA.

## Limites ouvertes et recette réelle

**Protection interversions non livrée** : un ancien writer qui reconstruit un membre peut effacer `magicProfile`, ses versions et les noms structurés. Le test `E06 interversion LIMIT` démontre cette perte ; il ne la considère pas corrigée. Les writers compatibles et choix de conflit natifs préservent les extensions, vérifiés par rechargement et PATCH de fixture. Versionner les URLs des adaptateurs ne protège pas tous les anciens clients.

Avant toute recette réelle à deux comptes : environnement et comptes de test dédiés, capacités serveur approuvées et vérifiées, configuration publique autorisée, liaison compte–membre vérifiée, contrôle des droits parentaux, invitation/révocation/expiration/rejeu, isolation interfoyers et RLS lecture/écriture, conflits et protection interversions. Conserver la séparation native des profils navigateur par foyer tant que la partition complète n’est pas garantie. Aucun de ces contrôles réels n’est remplacé par les fixtures ou la CI.

Livraison pour revue humaine uniquement. Aucune migration SQL, modification Supabase, donnée familiale réelle, fusion ou publication réalisée.
