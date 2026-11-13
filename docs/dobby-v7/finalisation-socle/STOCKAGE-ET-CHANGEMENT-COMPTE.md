# Stockage local et changement de compte / foyer

État examiné : `main` à `b77cb9de100a864c8aace8fb9e07053220ccd23a`, 13 novembre 2026. Examen ciblé des sources uniquement ; aucune opération distante et aucun effacement local. Le parcours réel de déconnexion/reconnexion du compte B est déjà validé dans [la livraison générale](../REVUE-GENERALE-LIVRAISON.md).

## Décision

Conserver la protection `FOYER-LOCAL-AUTRE`. Aucune bascule entre foyers dans un même profil de navigateur n'est développée ou certifiée par cette intervention. La procédure disponible consiste à utiliser un profil de navigateur distinct par foyer et à conserver l'ancien profil intact. Elle ne demande ni nouvel utilisateur DOBBY, ni nouvelle invitation, ni SQL.

La navigation privée a permis l'accès réel du compte B. Elle convient à une vérification temporaire, mais sa fermeture peut supprimer les données locales de cette session : utiliser un profil persistant distinct pour le fonctionnement quotidien avec des modifications hors ligne.

## Pourquoi le message existe

Le contrôle intervient après vérification des appartenances et de l'accès au foyer. Il compare le foyer autorisé avec `deviceHouseholdId`, conservé sur cet appareil ; une valeur différente bloque l'adoption du foyer ([family-v2.js](../../../essai-stitch-v5-famille/family-v2.js), fonction `requireHousehold`). Il n'indique pas qu'un autre foyer est simultanément connecté au serveur.

| Stockage | Partition réelle | Conséquence |
| --- | --- | --- |
| Courses IndexedDB `dobby-v5-household-preview-v2`, store `items` | Préfixe `userId\|householdId\|articleId` | Les articles sont séparés par contexte, y compris les valeurs en attente et les conflits. |
| État des modules dans le store `meta` | Clé `v2-module-state:userId\|householdId` | Les révisions, snapshots et opérations Missions en attente appartiennent au contexte. |
| État applicatif `st` dans `localStorage` | Une clé globale `dobby-v5-familial-preview-20261108` | Profils, menus, Missions, crédits, notes et autres données locales ne sont pas tous séparés par foyer. |
| Pièces jointes IndexedDB `dobby-v5-familial-files-20261108`, store `docs` | Identifiants de documents, sans préfixe de foyer généralisé | Leur association ne peut pas être transférée implicitement vers un autre foyer. |
| Session et marqueur du foyer dans `meta` | Clés globales `session`, `verifiedContext`, `deviceHouseholdId` | Déconnecter retire la session ; cela ne transforme pas les autres données locales en données du prochain compte. |

La déconnexion native supprime `session`, invalide l'identité en mémoire et réinitialise le fournisseur de modules. Elle conserve les fiches, choix magiques, articles et opérations locales. Le `reset()` du fournisseur ne remplace pas `st` et ne vide pas les bases IndexedDB. L'adoption du registre vérifié protège également les modifications en attente et refuse un registre local divergent ([family-modules.js](../../../essai-stitch-v5-famille/family-modules.js), fonctions `reset` et `adoptVerifiedFamily`).

Effacer seulement `deviceHouseholdId`, contourner la comparaison ou vider les données du site pourrait donc perdre des opérations hors ligne ou mélanger un état applicatif et des pièces d'un foyer avec le contexte d'un autre. Aucune de ces opérations ne constitue une correction sûre.

## Procédure disponible

1. Conserver l'ancien profil de navigateur et ses données. Ne pas supprimer les données du site pour résoudre ce message.
2. Dans Chrome, utiliser l'icône du profil du navigateur → **Ajouter** → **Continuer sans compte**, puis ouvrir l'[URL officielle](https://portenartco.github.io/dobby-demo/). Le profil Chrome est distinct du profil de membre DOBBY.
3. Choisir **Connexion** avec le compte DOBBY existant, sans rejouer une invitation déjà acceptée. Garder un profil Chrome persistant pour chaque foyer.
4. Pour reprendre les opérations hors ligne de l'ancien foyer, rouvrir son ancien profil et le compte autorisé pour ce foyer. Les éventuels conflits doivent être examinés dans ce contexte ; ne pas les importer automatiquement dans le nouveau foyer.

Une sauvegarde applicative ne justifie pas un effacement général. L'export historique `dobby-complete-backup` contient `st` et les pièces jointes locales, mais pas l'intégralité du store de synchronisation `meta` ni des articles IndexedDB. Il ne constitue donc pas à lui seul une archive restaurable de toutes les opérations en attente. Ne pas transmettre de sauvegarde familiale dans le chat ou dans le dépôt public.

## Ce qu'exigerait une bascule intégrée

Une future commande « changer de foyer sur cet appareil » doit d'abord séparer explicitement l'état applicatif, les pièces, les brouillons et les files de synchronisation. Elle doit conserver un manifeste de l'ancien contexte, gérer les interruptions entre `localStorage` et IndexedDB, fermer les écritures des autres onglets et vérifier la restauration avant de changer le contexte actif. Le nouvel état doit être initialisé isolément et adopté seulement après une vérification serveur. Ce périmètre dépasse une simple suppression de marqueur.

Tests ciblés nécessaires avant de déclarer cette bascule sûre :

- A → B → A entre deux foyers, avec articles hors ligne, conflit de module, opération Missions non confirmée, crédits historiques et pièces jointes ; aucune perte, aucun envoi au mauvais foyer.
- Réponse réseau tardive, fermeture/rechargement, manque d'espace et échec d'écriture à chaque étape du changement ; l'ancien contexte reste restaurable.
- Deux onglets et deux comptes, notamment deux comptes du même foyer : aucun ancien résultat ne rétablit une identité remplacée ; toute autorité est revérifiée côté serveur.
- Export/restauration réellement complets, incluant articles et métadonnées de synchronisation, sans exporter de jeton d'authentification ni réactiver une opération sous un autre acteur.

Les tests existants `stitch-access-races.cjs` vérifient déjà, en fixture, la déconnexion visible, la sérialisation de l'action et la conservation des membres en cache. Ils ne prouvent pas un changement entre foyers dans le même profil. Ils n'ont pas été rejoués pour ce seul examen documentaire.
