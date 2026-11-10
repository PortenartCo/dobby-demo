# E03 ledger
- Base 258b0f9 : tête PR #3 à l'inspection ; CI 42727078167 réussie. CI parallèle 42727070298 en échec sur alignement compte E01.
- Isolation : dépôt bare indépendant + worktree ; aucun accès au worktree de l'autre session.
- Exécution autonome autorisée par le cahier des charges ; pas de nouvelle phase de validation de design.
- Task 1: en cours.
- Task 1: complète ; E03_PASS 320/390/1440. Cycle rouge : 0 filtres au lieu de 4 sur la base ; vert : parcours natifs, filtres combinés, dates invalides, responsable disparu, consultation automatique sans source, rechargement et chrome.
- Décision : le formulaire existant n'offre pas Terminer/Supprimer. Aucun ajout autorisé ; clôture vérifiée depuis E01 et suppression depuis E02, édition/attribution depuis la fiche Stitch.
- Task 2: en cours ; les tests historiques des boutons retirés utilisent désormais les actions natives existantes (la couverture UI E03 vérifie E01/E02 et les liens cartes).
- Revue indépendante : deux défauts importants dans sanitizeClaims historique (compteurs exacts 3/17, titre natif débutant par Sceau de protection locale). Correction unique : ignorer le nettoyage historique lorsque la composition réelle E03 est présente.
- Régression : e03-counts.cjs rouge (3 missions -> filtres cachés), vert (3/17 et titre réel) ; suite étendue en cours.
- Mineur différé : remplacement des cartes au rafraîchissement perd le focus d'une carte et referme les consultations ; aucune modification supplémentaire, filtres et navigation clavier accessibles.
- Décision : composants E01/E02 et formulaire inchangés ; correction commune bridge.js gardée strictement conditionnelle à Missions E03. Risque à l'intégration si E02 modifie ce même composant après la base.
- Premier npm test : E03/E02/E01 passent ; arrêt environnement sur chemin Chrome Windows dans smoke.cjs. Reprise avec CHROMIUM_PATH explicite ; suites déjà vertes non répétées sauf parcours affectés par correction commune.
- Task 2: complète ; toutes les suites de la CI finale couvertes. Lancement initial arrêté sur chemin Windows, reprise avec Chromium Linux. Unique échec de reprise : register-tools.cjs (adaptation de test, case absente), corrigé via événement natif identique à E01 ; relance ciblée PASS 320/390. Aucun échec restant.
- Revue finale : défauts importants corrigés dans 4971dce ; mineur focus/repli conservé dans limites. Comparaison visuelle source/résultat inspectée, fichiers interdits inchangés, données réelles et E02 jamais modifiés.
- Livraison : conserver branche et worktree ; pas de push/PR/CI distante/fusion/déploiement. Base E02 figée, nouveau commit E02 6c667ce hors intégration.

## Raccordement demandé après E02 final
- Base E02 finale 9c73e845 ; rebase sans conflit, trois patches identiques selon range-diff (9f5a9db / 3d1f59d / cf91b4e).
- bridge.js compatible : aucune évolution E02 depuis la base initiale ; garde strictement Missions E03 conservée.
- Défaut causal CI identifié avant push : build-source.cjs reconstruisait l’ancienne page Missions. Composition déjà validée extraite dans missions-layout.html et intégrée au générateur ; HTML résultant strictement identique, autres sorties inchangées.
- Tests ciblés existants e03-counts/e03/e01/e02 : PASS après rebase. Captures conservées (hashes et runtime E03 inchangés), liens GitHub dans le rapport.
- Nouvelle autorisation utilisateur : push de la branche E03 seule et CI, sans force-push/fusion/Pages ; PR E02 préservée. CI existante déclenchée par push, pas de draft PR nécessaire.

## Harmonisation graphique finale demandée
- Base 9aaeaa1 confirmée locale/distante ; worktree propre. E04 non consulté/non modifié.
- Composition seulement : cadre image autonome + bloc titre/CTA sans encadrement, cadrage/hauteur conservés ; libellé Missions conditionnel dans chrome.js.
- Génération réutilisée ; tests existants E03 PASS 320/390/1440 ; comparaison géométrique/sous-titres E01/E02 PASS. Aucun code métier ou formulaire modifié.
- Captures actuelles et avant correctif enregistrées ; push de la même branche et attente CI existante, sans fusion/Pages.
- Attente historique Missions également présente dans tests/e01.cjs : alignée au libellé demandé ; E01 PASS 390/1440 et effets. Première CI arrêtée avant verdict pour éviter cet échec déterministe ; nouveau commit uniquement test/documentation, runtime et captures inchangés.

## Harmonisation typographique demandée
- Base 10e1662 identique locale/distante ; worktree propre. Mesures/captures natives avant pour Accueil, Famille, Missions aux 320/390/1440.
- Constat navigateur : CTA E03 Georgia déclaré / LiberationSerif-Bold rendu, 13px/700 ; Salon PlayfairDisplay-SemiBold rendu, 16px/600. Titre E03 interligne/marge différaient également.
- Reprise des classes/tokens existants du Salon pour titre/CTA, suppression de quatre règles personnalisées ; gouttières et gap existants, marge intérieure 8px pour le texte en capitales à 320px. Cadre illustré indépendant préservé.
- Après : valeurs typographiques calculées identiques à Famille, fontes custom réellement rendues confirmées ; E03 PASS 320/390/1440 après correction finale de la marge. Aucun changement de code métier/JavaScript/formulaire/source originale.
- Une seule CI sur le commit final, sans fusion/publication ; attente de revue visuelle humaine.
