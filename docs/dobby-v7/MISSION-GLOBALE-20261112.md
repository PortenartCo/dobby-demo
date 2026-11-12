# CODEX — DOBBY V7 : intégration générale et déploiement de revue

## Mission

Consolider les développements existants de DOBBY dans une version V7 intégrée, puis **publier une URL unique de revue interactive** sur GitHub Pages.

L'objectif n'est plus de produire des aperçus indépendants écran par écran. Je souhaite pouvoir parcourir l'ensemble de l'application et procéder ensuite à une revue globale dirigée par ChatGPT.

**Exécute la mission jusqu'à la publication vérifiée. Ne t'arrête pas à une PR, à des tests locaux ou à un rapport de préparation.**

Ne sollicite une intervention humaine qu'en présence d'un blocage réel, d'un risque avéré de perte de données ou d'une action dépassant les autorisations ci-dessous.

## 1. Dépôt et références

Dépôt : `PortenartCo/dobby-demo`

Sources prioritaires à vérifier avant toute intégration :

| Périmètre | Source | Référence vérifiée |
|---|---|---|
| Socle E01–E08 | Branche historique d'intégration | `69ef361ad139356c2d1473d825f9231e7610b0e4` |
| E07 — Taverne, choix des repas et Courses | `feat/dobby-e07-p01-p02-integration-20261112` | `c510ded81ee075c9b180e2551257351c557e541a` |
| E09 — Salon, Agenda, Membres, Mémos | `feat/dobby-e09-famille-salon-20261112` | `8918068f9d53a1f7007a09dcf100ffaee3e9ec15` |
| Runes et correctifs de compatibilité Missions | `fix/dobby-runes-v2-legacy-missions-20261112` | `1b9b89106aabea83081a2ba42d64e43a4308092c` |
| Partage Runes | `feat/dobby-shared-runes-v2-20261111` | `0a8e1ed674bc4abdbfaca29435fa495b19b32df4` |
| Courses partagées — référence de contrôle | `feat/dobby-e07-courses-final` | `dbb61df9d46a414ef1dadd29a849955b44c93bc7` |

La dernière CI de consolidation E07 est verte : `43127930111`.

Avant toute modification, relever les HEAD actuels. En cas d'évolution des branches, examiner les nouveaux commits et ne retenir que les changements pertinents et vérifiés.

**Ne pas remplacer aveuglément des fichiers entiers par ceux d'une autre branche.**

## 2. Création de la branche d'intégration

Créer une branche dédiée :

`feat/dobby-v7-global-review-20261112`

Prendre pour base le dernier état validé E07-P01/P02, puis intégrer les changements nécessaires à E09, Runes et aux correctifs Missions.

Préserver les fonctionnalités E01–E08 déjà présentes.

Les branches sources, les aperçus publiés et les autres worktrees ne doivent pas être modifiés.

Aucun `force-push`, aucun écrasement de travail concurrent, aucune réinitialisation destructive.

## 3. Réconciliation technique

Examiner particulièrement les fichiers communs :

- `essai-stitch-v5-famille/family-modules.js`
- `family-v2.js` et les cœurs natifs correspondants
- `essai-stitch-v7/family-engine.js`
- `family.js`, `family-register.js`
- `cuisine.js`, `cuisine-e07.js`
- `chrome.js`
- `scripts/build-dobby-review.cjs`
- les générateurs et manifestes dérivés.

Conserver les mécanismes existants de stockage, synchronisation, révisions CAS, résolution des conflits, reprise hors ligne et dédoublonnage.

Il ne doit exister **aucun deuxième writer familial concurrent**, aucun deuxième panier de courses et aucun registre parallèle de runes ou de mémos.

Les corrections E09 doivent coexister avec le ledger Runes et les missions partagées. Préserver les champs inconnus des payloads familiaux et les historiques déjà enregistrés.

Régénérer les fichiers dérivés à partir des sources canoniques. Ne pas corriger uniquement les fichiers générés.

Documenter les conflits réellement rencontrés et leur résolution.

## 4. Périmètre fonctionnel de la version intégrée

Rendre accessibles depuis une seule application :

- **E01 — Accueil** : synthèse quotidienne, missions, repas et événements.
- **E02 — Parler à Dobby** : conversation et commandes existantes.
- **E03/E04 — Missions et Runes** : création, attribution, modification, validation, gains uniques, grades et historique.
- **E05 — Profil** : avatars, Maison, Patronus, grades et éléments associés.
- **E06 — Première connexion** : Rituel, Choixpeau, Maison et Patronus.
- **E07 — Taverne et Courses** : recettes existantes, planning Midi/Soir, choix des repas, quantités et liste de courses unique.
- **E08 — Contrats et assurances** : parcours et registre existants.
- **E09 — Salon des Curiosités** : membres, agenda, événements et mémos.

Ne pas inventer de recettes, de données familiales, de contrats, de rendez-vous ou d'informations de santé.

Ne pas entreprendre à ce stade de refonte esthétique générale. L'objectif immédiat est une **application intégrée, fonctionnelle et suffisamment stable pour être évaluée**.

Conserver les conventions visuelles existantes : header et dock fixes, profil en haut à droite, préférences Effets/Son communes, navigation cohérente et composants natifs.

## 5. Environnement de revue et limites

Créer un nouvel aperçu autonome :

`essai-dobby-v7-global-review-20261112/`

Il doit utiliser les vrais modules applicatifs consolidés et leurs writers natifs, mais fonctionner avec des **données fictives clairement identifiées** et un environnement isolé.

Conserver la possibilité de démontrer les échanges entre deux clients fictifs pour les Courses, les Runes et les Mémos.

La synchronisation simulée ne doit jamais être présentée comme une synchronisation Supabase réelle.

Interdire depuis l'aperçu public :
- l'authentification sur un compte familial réel ;
- toute écriture dans Supabase réel ;
- l'accès aux secrets et données privées ;
- les appels IA payants ou services externes non nécessaires.

Utiliser un préfixe de stockage propre à cet aperçu. Prévoir une réinitialisation des données fictives, sans affecter les autres démonstrations.

**Aucune migration SQL, aucune modification Supabase, aucune activation de partage familial réel dans cette mission.**

La migration `at_home_quantity` reste proposée mais non appliquée. Les limites de compatibilité des anciens clients concernant Mémos et Runes doivent rester documentées et explicitement signalées.

## 6. Validation avant publication

Réutiliser les tests existants. Ne pas multiplier les campagnes redondantes.

Effectuer :

1. Tests ciblés des intégrations ayant des fichiers communs.
2. Vérification des contrats natifs et de la persistance.
3. Parcours transversaux E01–E09 en Chromium.
4. Contrôles visuels à 320, 390 et 1440 px.
5. Vérification du header et du dock, des formulaires, du défilement et de l'absence de débordements.
6. Validation des profils fictifs, des données en attente, des conflits et de la reprise après rechargement.
7. Une campagne globale de non-régression sur la version candidate.

Parcours transversal obligatoire :

Créer un membre fictif → créer une mission → l'attribuer → la terminer → vérifier le gain unique de runes → ouvrir son profil → planifier un repas → vérifier les ingrédients dans les Courses → modifier une disponibilité → créer un événement → créer et retrouver un mémo familial.

Tester également navigation, retour arrière, rechargement, restauration du contexte et isolation des données de démonstration.

En cas d'échec : identifier sa cause, corriger, puis relancer uniquement le périmètre concerné et ses dépendances. Faire une validation globale finale lorsque tous les blocages sont levés.

Ne pas assimiler une CI verte à une recette réelle sur iPhone/Safari ou sur deux comptes familiaux.

## 7. Déploiement GitHub Pages

Lorsque la version candidate est validée :

1. Construire le bundle depuis un commit source identifié, avec worktree propre.
2. Générer un manifeste avec commit source, fichiers et empreintes SHA256.
3. Publier uniquement le **nouveau répertoire statique** sur la branche `main`, utilisée par GitHub Pages.
4. Ne pas fusionner les sources applicatives dans `main`.
5. Ne pas supprimer ni remplacer les anciens aperçus.
6. Vérifier que le répertoire publié est accessible à l'URL publique attendue.
7. Exécuter une recette Chromium sur **l'URL hébergée**, pas seulement en local.
8. Comparer les ressources servies avec le manifeste du bundle validé.

Cette mission autorise la publication du nouveau dossier d'aperçu uniquement. Elle n'autorise pas une mise en production générale.

Si un défaut critique empêche une démonstration fiable, corriger avant publication. Si le blocage ne peut pas être résolu dans le périmètre autorisé, ne pas publier une version présentée comme validée.

## 8. Préparation de la revue dirigée par ChatGPT

Produire un document unique :

`docs/dobby-v7/REVIEW-GLOBALE-20261112.md`

Il doit comprendre :

- l'URL définitive de revue ;
- les références exactes des commits et de la CI ;
- la liste des modules réellement intégrés ;
- les parcours fonctionnels vérifiés ;
- les éventuelles fonctionnalités absentes ou désactivées ;
- les anomalies fonctionnelles ;
- les anomalies visuelles ;
- les réserves concernant Supabase, la synchronisation réelle et Safari/iPhone ;
- les preuves et captures à consulter.

Classer les anomalies par priorité :

**P0** — blocage ou perte de données  
**P1** — fonctionnalité incorrecte  
**P2** — ergonomie, navigation ou incohérence visuelle  
**P3** — amélioration non bloquante

Préparer une revue progressive avec ChatGPT, module par module, sans engager automatiquement les corrections esthétiques qui nécessitent un arbitrage utilisateur.

## 9. Critères DONE

La mission est terminée uniquement si :

- Les modules E01–E09 sont accessibles depuis une même version.
- Les fonctionnalités des branches intégrées sont préservées.
- Les réconciliations des fichiers communs sont documentées et testées.
- Les tests ciblés et la campagne globale finale sont réussis.
- La version ne présente pas de blocage fonctionnel critique connu.
- Le nouvel aperçu est effectivement publié sur GitHub Pages.
- L'URL publique a été testée avec succès.
- La publication est limitée au nouveau dossier statique.
- Aucune donnée réelle ni migration Supabase n'a été touchée.
- Le rapport de revue et les preuves sont disponibles.

## 10. Compte rendu final attendu

Répondre uniquement avec un bilan opérationnel :

1. **URL publique de l'application intégrée.**
2. Branche et SHA source.
3. Commit de publication.
4. Résultat des CI et des tests hébergés.
5. Modules effectivement intégrés.
6. Réserves ou blocages encore ouverts.
7. Lien vers le rapport et les captures de revue.

**Ne pas déclarer DONE sur la seule base du code, d'une PR ou d'une CI. La publication hébergée et sa vérification sont obligatoires.**

Exécute maintenant cette mission jusqu'au résultat vérifié, dans les limites ci-dessus.