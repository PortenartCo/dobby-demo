# Dobby V5 familial — intégration isolée (08/11/2026)

## Périmètre réellement raccordé
- Maquette Stitch V5 préservée : HTML identique à l'essai V5 original à l'exception des deux clés de stockage navigateur (localStorage et IndexedDB des fichiers), volontairement isolées. CSS identique.
- Nouvelle section « Le panier commun » dans la page Courses, sans iframe et sans remplacement de la préparation d'origine.
- Auth Supabase avec clé *publique* seulement et comptes familiaux existants.
- Récupération possible de la clé publiable du pilote Sync V2 sur le même navigateur. Aucune copie de son mot de passe ou de ses jetons de session.
- Base personnelle Dobby : tables V2 households, memberships et grocery préexistantes.
- Cache IndexedDB isolé pour ce preview, lecture et édition des articles, coche, suppression logique, reprise hors ligne, CAS de révision et conflit explicite.
- Import depuis menus/recettes vers la liste partagée uniquement sur une action explicite, avec déduplication et identifiant d'import déterministe.
- Un compte doit appartenir à un seul foyer actif dans ce pilote.

## Autres modules préparés, mais EN ATTENTE de migration SQL
La synchronisation opt-in des modules menus, recipes, missions, house, family et contracts est codée dans family-modules.js. **La table Supabase correspondante n'existe pas encore** dans le projet personnel. Le SQL proposé est disponible sous sql-proposals/dobby-v2-modules.sql. Les commits GitHub ne l'exécutent pas.

Après application de ce SQL et vérification RLS, la synchronisation de chaque module devra être activée explicitement depuis « Gérer le foyer » ; elle ne sera jamais enclenchée par une simple navigation.
- Menus et préparations : planned, shopHistory, shopFinal et shopChoice.
- Recettes personnalisées et adaptations Thermomix déjà enregistrées : customRecipes et tmAdaptations.
- Missions : autoTasks.
- Maison : houseItems et houseLogs (fichiers/attestations locaux).
- Famille : familyMembers, famContacts et famLists.
- Contrats et assurances : métadonnées des fiches uniquement, sans les fichiers joints.

Les versions familiales existantes ne doivent pas écraser silencieusement les données locales : sauvegarde de préimage et résolution de conflit sur version de module.

## Données intentionnellement exclues du partage
- Santé et rendez-vous médicaux : famHealth, ainsi que les catégories de documents Santé.
- Documents personnels, pièces d'identité, autres documents, mémos familiaux et fichiers binaires.
- Contenu Apple Rappels/Calendrier : pas de connecteur actif.
- Génération IA de recettes ou validation Thermomix : pas de service ajouté.

Un modèle distinct de permissions privées et un stockage de fichiers sécurisé seront nécessaires avant de migrer ces données.

## Conservation, recette et rollback
- La clé de stockage de l'ancien preview Stitch V5 reste inchangée dans cet ancien preview ; le nouveau dossier utilise deux espaces distincts. Un bouton permet d'importer volontairement les données V5 locales dans le nouvel essai, après sauvegarde. Les fichiers joints binaires ne sont pas copiés.
- La production racine, l'ancien essai Stitch V5 et Sync V2 restent indépendants.
- GitHub Actions vérifie syntaxe, cœur offline, conflits, quantité nullable, contraintes statiques, smoke-tests simulés et égalité du grand HTML Stitch V5 après neutralisation des deux changements de noms de stockage.
- Les tests automatisés ne remplacent pas un test Safari iOS ni un vrai test de sécurité inter-foyers. Aucun ami ou nouveau foyer ne doit être invité avant validation de ces tests.
- La synchronisation V1 -> V2 a été une copie à un instant T. Une réconciliation reste requise si la V1 évolue.
- Rollback : rouvrir /essai-stitch-v5/ ou / ; ne pas effacer les caches du preview avant d'avoir récupéré les modifications en attente.
