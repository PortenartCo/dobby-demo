# CODEX — DOBBY : Synchronisation familiale des runes V2

**MODE : EXÉCUTION — Développement, tests PostgreSQL et préparation du déploiement.**

## 1. Objectif

Résoudre définitivement le blocage de synchronisation des récompenses en runes dans le foyer partagé DOBBY.

Résultat attendu :

- Deux membres du foyer peuvent compléter ou rouvrir des missions depuis des appareils différents.
- Une mission terminée attribue exactement une récompense.
- Sa réouverture annule cette récompense.
- Une nouvelle complétion attribue à nouveau la récompense.
- Les récompenses personnalisées et les missions récurrentes fonctionnent en mode partagé.
- Aucun doublon, crédit fantôme ou historique perdu n'est possible lors d'écritures concurrentes, de rejeux ou de reprises après déconnexion.

**Principe : conserver le moteur de runes existant et renforcer uniquement les mécanismes serveur et client nécessaires à son partage.**

## 2. Sources de référence

Dépôt : `PortenartCo/dobby-demo`

Branche validée :
`fix/dobby-e03-e06-review-20261111`

SHA final :
`9a3e5dbc1c856ce417e344f2b5aca6e0d9c0040a`

Code testé :
`b381fc74bc1b529514a3bf9c35e5b29bb21ce045`

Lire en priorité :

- `docs/dobby-v7/REVIEW-E03-E06-20261111-REWARDS.md`
- `docs/dobby-v7/REVIEW-E03-E06-20261111.md`
- `essai-stitch-v5-famille/family-runes-core.mjs`
- `essai-stitch-v5-famille/family-missions-core.mjs`
- `essai-stitch-v5-famille/family-missions.js`
- `essai-stitch-v5-famille/family-modules.js`
- `sql-proposals/dobby-v2-modules.sql`

Vérifier également les tests existants et le fichier `AGENTS.md` applicable, s'il existe.

Créer une branche et un worktree indépendants :

`feat/dobby-shared-runes-v2-20261111`

Ne pas modifier les branches E03–E06 et E07.4.

## 3. Diagnostic technique établi

Le mécanisme local V2 fonctionne et a été testé.

Le cycle `+10 → 0 → 10` est validé.

Le registre utilise les structures natives `runeCredits` et `runeRequests`, avec les événements `grant` et `reversal`, les identifiants déterministes et les cycles de complétion.

Le problème concerne le partage :

- Le module `missions` utilise actuellement `dobby_v2_modules`.
- Les données sont enregistrées sous forme de payload JSONB.
- Le protocole comporte une révision et un contrôle CAS.
- Le payload est limité à 256 Kio.
- Le serveur ne garantit pas l'immuabilité des événements de runes ni toutes les transitions du registre V2.
- Un ancien client peut potentiellement écraser un historique plus récent.
- Le client bloque donc volontairement les récompenses personnalisées et compensations partagées.

**Ne pas supprimer ces protections avant d'avoir démontré l'efficacité du nouveau writer serveur.**

## 4. Architecture attendue

Privilégier une évolution minimale de la synchronisation existante.

### A. Writer serveur transactionnel

Créer une opération PostgreSQL/RPC dédiée aux modifications du module Missions qui affectent les récompenses.

Chaque transaction doit :

1. Authentifier l'utilisateur.
2. Vérifier son appartenance active au foyer concerné.
3. Verrouiller l'état pertinent contre les écritures concurrentes.
4. Vérifier la révision et l'opération demandée.
5. Valider la mission et les transitions du registre des runes.
6. Enregistrer atomiquement la mission, le changement de statut et les événements correspondants.
7. Incrémenter la révision.
8. Renvoyer un résultat confirmé et exploitable par le client.

Utiliser une véritable transaction PostgreSQL, pas une succession d'écritures indépendantes côté navigateur.

Examiner la possibilité d'un RPC `SECURITY INVOKER`. Si un RPC `SECURITY DEFINER` est nécessaire pour interdire les écritures directes sur Missions, documenter cette nécessité et appliquer des contrôles stricts d'identité, de permissions, de `search_path` et de droits `EXECUTE`.

Ne jamais exposer de clé `service_role` au navigateur.

### B. Protéger le registre V2

Appliquer côté serveur les règles du moteur existant :

- Aucun événement confirmé ne peut être supprimé ou réécrit.
- Une annulation référence un gain réel.
- Le bénéficiaire et le montant de l'annulation correspondent exactement au gain annulé.
- Un seul gain peut être actif par mission ou occurrence.
- Les cycles sont cohérents et ordonnés.
- Les événements identiques rejoués ne produisent aucun effet supplémentaire.
- Les événements contradictoires sont refusés.
- Les montants et soldes respectent les limites numériques.
- Les versions du registre évoluent de manière monotone.

Conserver les récompenses V1 et l'ensemble des historiques existants.

### C. Neutraliser les anciens writers incompatibles

Point critique : un nouveau RPC ne suffit pas si un ancien client peut encore effectuer un `PATCH` direct du payload Missions.

Inspecter les politiques RLS et permissions existantes.

Empêcher les écritures directes non validées sur le module `missions`, tout en préservant les écritures légitimes des autres modules.

Prévoir une réponse explicite lorsqu'un ancien client tente une opération devenue incompatible.

Ne pas utiliser un indicateur de session manipulable par le client comme preuve d'autorisation.

### D. Synchronisation client

Adapter uniquement les chemins concernés dans `family-modules.js` et les writers Missions.

Réutiliser le moteur de runes V2 existant.

Gérer :

- Révision attendue.
- Identifiant idempotent d'opération.
- Réponse serveur confirmée.
- Conflit de version.
- Relecture de l'état distant.
- Reprise après déconnexion.
- Échec de transaction.
- Réessai sans double crédit.

Un conflit ne doit jamais provoquer un écrasement silencieux.

Conserver les opérations locales en attente lorsque leur synchronisation n'a pas été confirmée.

Respecter les marqueurs et protections existants, notamment `runeSyncRequired`.

## 5. Migration et compatibilité

Préparer les migrations nécessaires, sans les exécuter en production.

Examiner d'abord si le payload JSONB existant peut être sécurisé durablement.

Créer une structure dédiée aux événements uniquement si la conservation de l'historique, sa croissance ou la concurrence le justifient réellement.

Éviter deux registres concurrents ou deux sources de vérité pour le solde.

Prévoir :

- Compatibilité des crédits V1.
- Adoption contrôlée de V2.
- Historique intégral préservé.
- Migration rejouable ou reprise sûre.
- Sauvegarde préalable.
- Plan de retour arrière qui ne supprime aucun crédit ou événement.
- Gestion explicite de la limite de 256 Kio.

Une incompatibilité doit produire un refus clair, jamais une troncature de données.

## 6. Campagne de tests obligatoire

Utiliser PostgreSQL réel sur un environnement de test isolé, avec des données fictives.

Les tests en mémoire et les mocks sont complémentaires, mais insuffisants pour valider les transactions et la concurrence.

### Scénarios fonctionnels

| Scénario | Résultat attendu |
|---|---|
| Première complétion | +10 |
| Deuxième complétion identique | Toujours +10 |
| Réouverture | 0 |
| Réouverture répétée | Toujours 0 |
| Nouvelle complétion | +10 |
| Deux appareils complètent simultanément | Un seul gain actif |
| Deux appareils rouvrent simultanément | Une seule annulation |
| Changement du montant après crédit | Ancien montant conservé |
| Changement de bénéficiaire | Aucun transfert rétroactif |
| Mission récurrente | Un cycle indépendant par occurrence |
| Récompense personnalisée | Montant exact |
| Déconnexion puis reprise | Aucun doublon |
| Ancien client V1 | Écriture incompatible refusée |
| Échec SQL au milieu de l'opération | Rollback intégral |
| Utilisateur hors foyer | Accès refusé |
| Rejeu après confirmation perdue | Même résultat, aucun deuxième effet |

### Tests de concurrence

Exécuter de véritables transactions depuis deux connexions PostgreSQL indépendantes.

Tester les opérations simultanées sur une même mission et sur des missions différentes du même foyer.

Vérifier les verrous, révisions, événements, soldes et résultats observables après commit.

### Non-régression

Préserver les tests E03–E06 existants.

Vérifier :

- Missions normales et récurrentes.
- Récompenses prédéfinies 10/25/50.
- Récompenses personnalisées, dont zéro.
- Historique et affichage des runes.
- Douze grades.
- Réouverture et suppression de mission.
- Gestion de conflits et synchronisation.
- Modules Recettes, Courses, Profil et Contrats inchangés.

Ne pas modifier les tests pour dissimuler un défaut.

## 7. Périmètre et autorisations

Autorisé :

- Lire et modifier le code du dépôt.
- Créer la branche et les commits.
- Préparer les migrations SQL.
- Exécuter les tests locaux et PostgreSQL isolés.
- Pousser la branche.
- Produire le rapport et les preuves.

Non autorisé :

- Déployer les migrations sur le Supabase familial réel.
- Modifier les comptes ou données réels.
- Fusionner sur `main`.
- Publier une nouvelle version de DOBBY.
- Modifier les branches E07.4 ou E03–E06.
- Introduire un nouveau serveur, une infrastructure payante ou une dépendance non nécessaire.
- Utiliser les projets Supabase professionnels Portenart comme environnement de test.

Si l'environnement PostgreSQL de test n'est pas disponible, produire les migrations, les tests reproductibles et un état `BLOCKED` explicite, sans prétendre que les transactions ont été validées.

Vérifier la documentation Supabase/PostgreSQL actuelle avant tout choix d'API, de privilège ou de migration.

## 8. Checkpoints et critères DONE

### Checkpoint 1 — Contrat et migration

Produire le diagnostic exact des accès directs existants, le contrat du writer V2, les migrations et la stratégie de compatibilité.

**DONE :** aucune ancienne voie d'écriture destructrice ne reste possible dans le schéma cible.

### Checkpoint 2 — Transactions serveur

Implémenter et tester le writer atomique et idempotent.

**DONE :** les scénarios de concurrence et de rollback passent sur PostgreSQL réel.

### Checkpoint 3 — Intégration client

Raccorder DOBBY au writer, conserver les comportements locaux et lever les blocages uniquement lorsque le protocole V2 est réellement disponible.

**DONE :** récompenses partagées, conflits, reprise et historique sont correctement traités dans les tests d'intégration.

### Checkpoint 4 — Préparation au déploiement

Produire :

- Branche et SHA des commits.
- Fichiers modifiés.
- Migrations SQL.
- Rapport des tests et CI.
- Preuves PostgreSQL.
- Résultats des scénarios de concurrence.
- Analyse des droits RLS/RPC.
- Procédure de sauvegarde.
- Plan d'activation progressive et de rollback.
- Liste des risques et blocages restants.

**DONE :** livraison prête pour validation humaine, sans migration de la base réelle.

## 9. Restitution finale

Présenter clairement :

- `CODE_MODIFIÉ`
- `TESTS_UNITAIRES`
- `TESTS_POSTGRESQL_RÉELS`
- `CONCURRENCE_VALIDÉE`
- `INTÉGRATION_CLIENT`
- `PRÊT_À_DÉPLOYER`
- `DÉPLOYÉ`
- `TESTÉ_AVEC_DEUX_COMPTES_RÉELS`

Ne jamais confondre un test simulé, une CI verte et une mise en service réelle.

**Arrêt obligatoire après préparation et vérification de la branche.**

La migration et la recette sur les deux véritables comptes familiaux seront réalisées uniquement après validation distincte.

**Objectif final : permettre à DOBBY d'attribuer, d'annuler et de synchroniser les runes familiales de manière fiable, sans modifier inutilement son architecture existante.**