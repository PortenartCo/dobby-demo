# DOBBY V7 — Mission longue d'intégration Stitch

**MODE : EXÉCUTION AUTONOME SÉQUENTIELLE**

Dépôt : `PortenartCo/dobby-demo`

PR existante : **#3**

Branche : `feat/dobby-stitch-53-source-backed-v7`

Point de référence connu : `cb440793cc04079cd472a3cd1d8fcf3e14c1f84b`, à actualiser au début de la mission.

## 1. Règle de démarrage

Cette demande est destinée à la file d'attente Codex.

Ne pas interrompre la mission actuellement en cours.

Au démarrage, vérifier la branche, son dernier commit, l'état du répertoire de travail, le manifeste d'intégration et les résultats de la dernière mission.

Ne jamais réinitialiser la branche à un ancien commit.

Si une mission 2B a déjà été exécutée ou se trouve en cours d'exécution, ne pas la reproduire. Commencer au premier lot non terminé.

Respecter les éventuels `AGENTS.md` applicables.

## 2. Objectif général

Poursuivre l'intégration des **53 maquettes Stitch originales** dans DOBBY V7 jusqu'à ce que tous les écrans techniquement raccordables aux fonctions existantes soient intégrés, testés et documentés.

Le travail doit être exécuté successivement par domaines métier, sans solliciter une validation humaine entre chaque écran.

**Règle fondamentale :**

- Stitch est la référence visuelle.
- Le moteur DOBBY existant est la référence fonctionnelle.
- Codex doit les assembler, pas les réinventer.

Récupérer directement les véritables HTML Stitch dans `design/stitch-53/`, leurs compositions, illustrations, composants, typographies, proportions et interactions.

Ne pas reproduire la méthode V6 consistant à simplement harmoniser les couleurs de l'ancienne interface.

Réutiliser l'approche développée pour le lot Cuisine dans `essai-stitch-v7/`.

## 3. Sources de vérité

Utiliser prioritairement :

- `design/stitch-53/manifest.json`
- `essai-stitch-v7/route-manifest.json`
- `docs/dobby-v7/INTEGRATION.md`
- Les générateurs et adaptateurs V7 du lot Cuisine.
- Les modules métier existants de `essai-stitch-v5-famille/`.
- Les tests et preuves déjà qualifiés dans la PR #3.

Ne pas redécouvrir systématiquement l'architecture.

Pour chaque écran, identifier la source HTML, la route, les données nécessaires, les actions existantes et les écarts entre Stitch et le moteur DOBBY.

## 4. Lots à exécuter successivement

### Lot 2B — Contacts, mémos et listes familiales

Intégrer les six sources :

- `dobby_r_pertoire_des_contacts_familiaux`
- `dobby_cr_er_ou_modifier_un_contact`
- `dobby_biblioth_que_des_m_mos_notes_familiales`
- `dobby_cr_er_ou_modifier_un_m_mo`
- `dobby_registre_des_listes_familiales`
- `dobby_d_tail_d_une_liste_familiale`

Raccorder les opérations de consultation, création, modification, classement et suppression prévues par le moteur.

Préserver les informations et la synchronisation familiale existantes.

À la fin du lot : tests ciblés, captures, mise à jour du manifeste, commit et contrôle CI.

Si les résultats sont satisfaisants, poursuivre directement.

### Lot 3 — Maison, équipements et entretiens

Intégrer les écrans de gestion de la maison, leurs variantes, les équipements, les fiches détaillées, les historiques d'entretien et les fonctions existantes de sauvegarde, exportation et restauration.

Rechercher les sources concernées dans le manifeste original.

Conserver les contrats de données actuels.

Ne jamais effectuer de restauration destructive pendant les tests.

Les opérations d'importation et de restauration doivent conserver les validations existantes et permettre de distinguer prévisualisation, confirmation et exécution réelle.

À la fin du lot : tests ciblés, captures, manifeste, commit et CI.

Poursuivre automatiquement si les contrôles passent.

### Lot 4 — Documents, contrats, assurances et imports

Intégrer les onze sources relatives :

- À la bibliothèque documentaire et ses variantes.
- À l'ajout, la modification et la consultation de documents.
- Aux contrats et assurances du foyer.
- Aux fiches détaillées et à leurs variantes.
- Aux déclarations, renouvellements et échéances.
- À l'import intelligent, à la sélection de fichiers et à leur validation.

Préserver les vrais fichiers, leurs références, les fonctionnalités de stockage existantes et les informations contractuelles.

Ne pas présenter l'analyse automatique ou l'OCR comme opérationnels lorsqu'ils ne disposent pas d'un service réellement raccordé.

Ne pas inventer de contrats, montants, échéances ou garanties.

À la fin du lot : tests ciblés, captures, manifeste, commit et CI.

Poursuivre automatiquement si les contrôles passent.

### Lot 5 — Missions et outils transversaux

Terminer les parcours restants de la bibliothèque des missions, de création et d'attribution des tâches.

Intégrer les deux variantes de conversation avec Dobby, la recherche transversale, le menu général et le grimoire personnel déjà présents parmi les 53 sources Stitch.

Réutiliser les fonctions existantes. Ne pas inventer un moteur conversationnel ou vocal, ni des résultats magiques persistants si leur contrat de données n'existe pas encore.

Vérifier la cohérence des quatre destinations principales : Traverse, Missions, Taverne et Famille.

Terminer par une recette de navigation globale entre les domaines intégrés.

## 5. Critères de fidélité Stitch

Chaque écran doit :

1. Utiliser directement son HTML Stitch original ou un template dérivé de manière reproductible.
2. Conserver autant que possible sa structure graphique, ses proportions, illustrations, couleurs, typographies et composants.
3. Remplacer les exemples fictifs par les données réelles du foyer ou par un état vide explicite.
4. Utiliser des contrôles réellement raccordés.
5. Respecter le parcours mobile, la navigation arrière et les préférences de réduction des mouvements.
6. Ne pas dépendre du panneau visuel V5 pour une opération principale déclarée intégrée.
7. Disposer d'une comparaison entre la référence Stitch et le rendu fonctionnel DOBBY.

Lorsque des illustrations originales sont inaccessibles, conserver la provenance et documenter la substitution.

Ne jamais déclarer une copie approximative visuellement fidèle sans examen des écarts.

## 6. Conditions de réalisation

### Exécution

Travailler par domaines successifs.

Au début de chaque lot, consulter uniquement le contexte utile à celui-ci.

Réutiliser les générateurs, tests et composants existants, sans construire de moteur parallèle.

Effectuer des commits de progression cohérents.

Pousser les changements dans la même PR #3.

### Tests

Effectuer les tests utiles aux modifications du lot :

- Actions principales et secondaires.
- Lecture et modification des données.
- Persistance et rechargement.
- Navigation entre écrans.
- États vides et erreurs.
- Contrôle visuel à 320 et 390 px.

Ne pas relancer tous les tests de tous les lots à chaque commit.

Exécuter les régressions transversales lorsque le code commun est modifié, puis une validation CI générale à la fin de la mission.

La synchronisation peut être testée avec le client existant et une API simulée ; ne pas présenter ce résultat comme une validation avec les comptes familiaux réels.

### Preuves

Après chaque lot, actualiser le manifeste et la documentation.

Conserver un checkpoint compact indiquant :

- Commit final du lot.
- Écrans réellement intégrés.
- Écrans partiels ou bloqués.
- Tests réussis ou échoués.
- Écarts visuels restants.
- Prochain lot à exécuter.

Les checkpoints servent à éviter la redécouverte et à permettre une reprise fiable.

## 7. Gestion autonome des difficultés

Ne pas interrompre la mission pour une question mineure ou une différence cosmétique.

Corriger automatiquement les défauts techniques maîtrisés.

Pour une même anomalie, éviter les relances identiques sans nouvelle hypothèse ou modification causale.

Si une fonctionnalité n'existe pas dans DOBBY, ne pas créer silencieusement un nouveau stockage ou une nouvelle architecture pour la simuler.

Marquer l'écran `PARTIAL` avec la fonction manquante et poursuivre sur les autres écrans indépendants.

En cas de régression importante, de risque de perte de données, de problème de synchronisation non maîtrisé ou de modification nécessitant une nouvelle autorisation, arrêter la partie concernée et documenter le blocage.

Une anomalie localisée et non bloquante ne doit pas paralyser tout le programme.

## 8. Limites d'autorisation

Autorisé : développement, refactorisation ciblée, tests locaux, génération de captures, commits, push sur la branche de PR #3 et actualisation de ses documents.

Non autorisé :

- Fusion de la PR.
- Déploiement en production.
- Modification de la V5 publiée.
- Migration ou modification SQL/Supabase.
- Effacement ou migration de données familiales réelles.
- Introduction d'un nouveau writer ou stockage.
- Achat de services ou consommation d'API payantes externes non nécessaires.
- Création de projets ou d'infrastructures supplémentaires.

Le lot des onze écrans magiques supplémentaires n'est pas inclus dans cette mission tant que leurs fichiers sources ne sont pas disponibles dans le dépôt ou l'environnement Codex.

## 9. Définition finale de DONE

La mission se termine lorsque les lots 2B à 5 ont été traités jusqu'au maximum réalisable dans les limites autorisées.

Le rapport final doit présenter :

- Le total de sources Stitch réellement intégrées, sur 53.
- La liste exacte des sources restantes, avec motifs techniques.
- Les commits produits et le SHA final.
- Le statut réel de la PR #3 et de sa CI.
- Les liens vers les comparaisons visuelles.
- Les fonctionnalités testées et celles qui restent à valider sur des comptes réels.
- Les différences visuelles résiduelles.
- Les actions nécessitant encore une décision humaine.

Ne pas déclarer l'application finalisée uniquement parce que les tests passent.

**Ne pas commencer de nouveau projet, de refonte graphique ou de chantier d'infrastructure après ces lots.**

L'objectif est d'aboutir à la meilleure intégration fonctionnelle et visuelle possible des 53 écrans Stitch existants, avec des preuves consultables et sans intervention humaine intermédiaire inutile.