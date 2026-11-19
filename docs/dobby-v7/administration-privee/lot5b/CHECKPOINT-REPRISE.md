# Lot 5B — checkpoint initial, 19 novembre 2026

Base vérifiée : PR #33, `f4d18eb532e8ab3a9aa6eb6b5f4feaaec41db764`, conservée en brouillon. Branche dédiée issue exactement de ce commit ; aucun ancien worktree réinitialisé, aucun AGENTS.md applicable trouvé.

Périmètre : réconciliation SQL, permissions Auth/rôles et autorité Storage ; seuls les correctifs indépendants démontrables seront développés et testés en local. Les quatre migrations historiques et leurs empreintes ne sont pas modifiées pour accepter un catalogue inconnu.

Les nouveaux constats hébergés sont **fournis par l’utilisateur**, issus de sa lecture ChatGPT : PostgreSQL 17.11, 27 signatures et 12 dépendances Missions présentes, 21 corps divergents, différences d’ACL du stamper et memberships des writers, Auth RLS sans policy, Storage privé et helpers conformes. Ce sont des preuves rapportées ; aucune définition distante n’est jointe à la consigne. Les 21 signatures divergentes ne sont pas identifiées individuellement dans les données reçues.

CODEX ne dispose d’aucun outil DOBBY dédié dans cette session. Un unique appel `supabase_get_project` au projet personnel `pqcdkrwljgvgagzwrcmg` retourne `MCP error -32600: You do not have permission to perform this action`. Aucun autre appel au projet, SQL hébergé, recherche de credential, projet de substitution ou ligne personnelle n’a été utilisé.

Travail indépendant à poursuivre :

1. Matrice des 27 signatures et des 12 dépendances, avec blocages explicites et lectures minimales manquantes ; aucune qualification inventée des 21 corps inconnus.
2. Vérification locale des conditions exactes ADMIN/INHERIT/SET et des grants à plusieurs grantors.
3. Étude officielle des accès Auth étroits par fonctions privées et de la gestion des policies Storage, y compris les délégations de plateforme éventuelles ; aucun owner/rôle géré à s’approprier.
4. Correctifs candidats distincts uniquement après contre-épreuve, tests causaux de refus et rollback ; rapport, confidentialité et PR brouillon empilée sur #33.

Aucune écriture Supabase, migration distante, e-mail, compte A/B testé, rotation/invalidation Storage, fusion, déploiement ou ouverture de gate enfant. Les anciens bearer Storage restent une réserve séparée. Ce checkpoint documentaire ne déclenche aucune campagne historique (`[skip ci]`).
