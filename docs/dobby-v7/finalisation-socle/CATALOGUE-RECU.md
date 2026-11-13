# Checkpoint B reçu — conclusions exploitables

Le 13 novembre 2026, l'utilisateur a exécuté le diagnostic regroupé dans le seul projet familial et transmis sa cellule complète dans la conversation privée. Elle confirme PostgreSQL **17.11**, la transaction **READ ONLY**, l'absence de lecture de lignes métier et l'absence de migration. Aucun nouveau diagnostic distant par l'agent n'a été nécessaire.

Ce document ne contient **aucun résultat brut ni corps de fonction confidentiel**. Ceux-ci restent hors du dépôt public.

- **C07 :** la colonne `at_home_quantity` est absente. Le trigger natif augmente la révision à chaque UPDATE et protège les identités/imports ; les grants sur toute la table couvrent un champ additif. Le lot Courses existant convient, avec vérification complémentaire et contrôle F09 distinct.
- **Missions :** les treize helpers privés, le writer V2, ses reçus, policies et verrous sont désormais connus. Le writer V3 peut être développé sur leur vrai contrat, sans réutiliser une fixture défensive comme preuve.
- **Maintenance :** le SQL Editor peut administrer le writer Missions V2, mais pas le writer familial V7 fermé. Une nouvelle couche à rôle technique maintenable et droits explicites est nécessaire ; aucun `SECURITY DEFINER postgres` ou contournement par `CASCADE` n'est justifié.
- **Famille :** les identités restent les liens privés vers `familyMembers[*].id` TEXT, avec catégorie explicite et appartenance active. Les écarts de droits du second Parent et du futur accès Enfant sont confirmés par le code installé. L'invitation générique ne réalise pas le rattachement au profil enfant existant.
- **Storage :** les droits de table ne prouvent pas le droit de créer une policy sur le schéma géré. Cette partie a sa propre étape d'installation/vérification et doit être confirmée avant une activation F09 globale.

Un modèle local fictif a été reconstruit dans un **nouveau conteneur PostgreSQL 17.7 sans réseau ni ports publiés**. Les treize définitions privées Missions, le writer V2, le contexte familial, le helper d'identité réparé et les deux triggers natifs ont les mêmes empreintes que le catalogue transmis. Les données de test sont fictives ; les sources techniques d'origine et la baseline restent privées. Le SQL Editor de test utilise une session `postgres` non superuser, afin qu'un `RESET ROLE` ne revienne pas à un administrateur fictif plus privilégié.

**Checkpoint B reçu ; développement des migrations en cours.** Cela ne signifie pas qu'une migration a été appliquée ou qu'une capacité réelle a été recettée. Les clients V3, rôles et rattachement enfant demeurent fermés jusqu'aux preuves nécessaires. L'état de départ de la [matrice](MATRICE-RESERVES.md) est conservé ; les nouveaux états seront consignés par capacité après tests, installation et recette.
