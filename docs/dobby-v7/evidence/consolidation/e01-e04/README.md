# Consolidation E01 / E04

Lot réalisé dans l’intégration, depuis `a84f67acf8f5cbfd59475c2137ec70e1a20732f7` (Gate 0 documentaire `bb95132`). Cette preuve locale est distincte de la CI finale et de la recette de l’aperçu publié.

## Exigences

| ID | État local | Effet et preuve |
|---|---|---|
| E01-01 | VÉRIFIÉ | États vides Missions, Midi, Soir et Gazette avec titre, description et sans bordure pointillée ; mêmes surfaces natives des cartes. |
| E01-02 | VÉRIFIÉ | Cercle vide pour une mission ouverte, confirmation explicite ; annulation sans mutation ; coche après validation du writer natif. |
| E01-03 | VÉRIFIÉ | Réouverture manuelle native, rechargement et deuxième complétion avec un seul crédit et une seule demande ; statut lu par E03. Les automatiques terminées restent consultables par leur source ; aucune réouverture forcée d’une intervention/source déjà réalisée. |
| E01-04 | VÉRIFIÉ | Helper photo E07 unique, photographie locale persistée et décodée après rechargement ; visuel générique en absence de photo ou si le fichier local ne charge pas. |
| E01-05 | VÉRIFIÉ | Midi et Soir distincts sur la journée sélectionnée, nom/durée/convives/portions réels ; fiche de la recette ciblée et choix du bon créneau vide. |
| E01-06 | VÉRIFIÉ EN LOCAL | Saisie directe via `DobbyCuisineList.add`, article retrouvé dans E07 et après rechargement ; doublon ouvert détecté sans seconde insertion ; statut natif « Sur cet appareil ». Le partage réel entre comptes n’est pas certifié. |
| E04-01 | VÉRIFIÉ | Quatre suggestions supprimées du formulaire ; catégories et saisie libre conservées. |
| E04-02 | BLOQUÉ — ÉVOLUTION NATIVE | Dépendance détaillée ci-dessous ; options non activées et explication précise dans le formulaire. |
| E04-03 | VÉRIFIÉ | Dock Missions actif (correction chrome commune), Retour et Fermer vers E03, notamment depuis l’accueil. |
| E04-04 | VÉRIFIÉ — CONSERVÉ | Avatars issus des membres et composant `DobbyMemberAvatar` existants ; attribution native conservée. |

## Récurrences : dépendance non contournée

Le modèle actuel représente des missions uniques. `family-missions-core.mjs normalizeMission()` ne conserve aucun champ série ou occurrence. `family-missions.js saveForm()` reconstruit cette même liste de champs et plafonne le registre à 200 missions. Le ledger natif attribue au plus un crédit par `missionId`. `family-modules.js editableMissions()` synchronise l’ensemble des missions par révision et conflit ; sa version de protocole concerne le ledger de runes, sans contrat de séries/occurrences.

Pour livrer Quotidien, Hebdomadaire avec jours et Mensuel avec jour défini, il faut faire évoluer ces modèles et writers natifs ensemble : définition de série versionnée, identifiants d’occurrence déterministes, génération bornée sans duplication, attribution, modification et arrêt, historique au-delà de la limite des fiches courantes, crédit par occurrence et compatibilité des payloads synchronisés. Les anciens writers ignorant ces champs peuvent les supprimer ; le protocole doit donc traiter explicitement leur coexistence. Aucun adaptateur de présentation ne fournit ces garanties.

Cette évolution significative reste bloquée dans la consolidation conformément à l’exception prévue au Gate 3. Aucune activation cosmétique, second registre, migration SQL ou écriture sur un foyer réel n’est introduite.

## Vérifications exécutées

Serveur statique : `http://127.0.0.1:8789`. Profils éphémères, enregistrements préfixés TEST, réseau externe bloqué. Chromium `/usr/bin/chromium`.

| Commande (depuis le dépôt, avec `DOBBY_TEST_ORIGIN=http://127.0.0.1:8789`) | Résultat |
|---|---|
| `node essai-stitch-v7/tests/e01-consolidation.cjs` | PASS 320 / 390 / 1440 : annulation, complétion, réouverture, ledger, E03, source automatique, Midi/Soir, photos et repli, panier unique, doublon, rechargement, E04. |
| `node essai-stitch-v7/tests/e01.cjs` | PASS 390 / 1440 et contrôle effets : consultation J0–J+6 sans écriture, cadres des trois cartes, données, liens, préférences, navigation et fichier natif en attente. |
| `node essai-stitch-v7/tests/e04.cjs` | PASS 320 / 390 / 1440 : trois panneaux, choix natifs, dates, création/édition/rechargement, brouillon, ancien membre/format, Retour et géométrie. |
| `node essai-stitch-v7/tests/e03.cjs` | PASS 320 / 390 / 1440 : page E03 préservée, filtres, compteurs et writers. |
| `node essai-stitch-v7/tests/e01-1-visual.cjs` | PASS 390 / 1440 : dates et bandeaux ; nouvelles captures dans `regression-e01-1/`. |
| `node essai-stitch-v7/tests/e01-3.cjs` | PASS Chromium 390 / 1440 : ambiance, réduction des mouvements, indépendance audio, persistance et données métier intactes ; nouvelles preuves dans `regression-e01-3/`. |
| `node --test essai-stitch-v5-famille/tests/family-missions.test.mjs essai-stitch-v5-famille/tests/runes-core.test.mjs` | PASS 9 / 9. |
| `node --check` sur `home.js`, `tools-register.js`, `tests/e01-consolidation.cjs` ; `git diff --check` du lot | PASS. |

Le nouveau test a d’abord échoué sur l’absence des quatre états vides demandés (0 au lieu de 4). Le défaut de coche, la réouverture et les nouveaux parcours sont ensuite contrôlés par les actions réelles, le state et le stockage natifs. Une attente erronée de nom de recette de fixture a été corrigée pour comparer au nom natif (`toast` désigne « Croque-monsieur et salade »).

Les tests historiques E01.1/E01.3 écrivaient dans leurs anciens dossiers sans reconnaître de variable de sortie. Ils acceptent désormais respectivement `DOBBY_E011_EVIDENCE_DIR` et `DOBBY_E013_EVIDENCE_DIR`. Les fichiers historiques ont été rétablis octet pour octet depuis le SHA de départ après copie des nouvelles preuves dans ce dossier.

Dernier contrôle visuel : un sélecteur CSS trop large étirait aussi le bouton de complétion. Une reproduction ciblée à 320 px a mesuré 107 px avant correction, puis 36 px après restriction aux `div` de contenu ([preuve](geometry.txt)). L’assertion de largeur est conservée dans le nouveau test. Le premier essai des captures comparatives après a été interrompu par l’arrêt du serveur 8789 ; les six captures finales ont été reprises avec succès sur le serveur 8790. Les parcours métier n’étaient pas en échec.

## Captures comparatives

Même fixture pour les deux colonnes : une mission manuelle ouverte attribuée au membre TEST Camille, repas Midi `toast` avec deux adultes/un enfant, repas Soir `pasta` pour trois convives. Les images présentes sont décodées avant la capture. Les captures longues conservent les barres fixes ; la recette comportementale teste également la géométrie visible.

| Largeur | Accueil avant | Accueil après | Nouvelle Mission avant | Nouvelle Mission après |
|---|---|---|---|---|
| 320 | [avant](before/home-320.png) | [après](after/home-320.png) | [avant](before/mission-320.png) | [après](after/mission-320.png) |
| 390 | [avant](before/home-390.png) | [après](after/home-390.png) | [avant](before/mission-390.png) | [après](after/mission-390.png) |
| 1440 | [avant](before/home-1440.png) | [après](after/home-1440.png) | [avant](before/mission-1440.png) | [après](after/mission-1440.png) |

Les états vides supplémentaires sont dans `after/empty-{320,390,1440}.png`. La revue visuelle utilisateur et la synchronisation familiale réelle restent distinctes de ces preuves locales.
