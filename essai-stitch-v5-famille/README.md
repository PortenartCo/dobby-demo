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
- Un même profil de navigateur est réservé à un seul foyer afin d'éviter de mélanger les données locales ; changer de foyer exige un profil navigateur distinct. Il ne s'agit pas encore d'une application multi-foyers complète sur appareil partagé.

## Modules familiaux — socle SQL déployé, synchronisation à confirmer en sessions réelles
La synchronisation opt-in des modules menus, recipes, missions, house, family et contracts est codée dans family-modules.js. **La table Supabase a été créée et le contrôle SQL simulant deux membres et un extérieur a renvoyé PASS, selon les résultats fournis par l'utilisateur.** Les scripts GitHub n'exécutent aucune migration Supabase. La synchronisation réelle des six modules reste à valider avec les deux comptes connectés.

La synchronisation nécessite un consentement explicite depuis « Gérer le foyer ». Lorsque plusieurs modules sont encore inactifs et qu'aucun module familial n'est déjà publié, un bouton « Activer les 6 modules du foyer » effectue la mise en place en une seule confirmation, avec sauvegarde et exclusion des repas fictifs encore intacts. Le deuxième compte peut récupérer les modules déjà partagés en une seule opération, avec sauvegarde locale avant remplacement. Aucun de ces mécanismes ne lance automatiquement une importation ou une synchronisation sans action de l'utilisateur. Les tests simulés ne prouvent pas une synchronisation complète avec deux véritables sessions.
- Menus et préparations : planned, shopHistory, shopFinal et shopChoice.
- Recettes personnalisées et adaptations Thermomix déjà enregistrées : customRecipes et tmAdaptations.
- Missions : autoTasks.
- Maison : houseItems et houseLogs (fichiers/attestations locaux).
- Famille : familyMembers, famContacts et famLists.
- Contrats et assurances : métadonnées des fiches uniquement, sans les fichiers joints.

Les versions familiales existantes ne doivent pas écraser silencieusement les données locales : sauvegarde de préimage et résolution de conflit sur version de module.

La V5 peut précharger trois repas **fictifs** (poulet, pâtes, tartines) sur un appareil vierge. Si leur structure est toujours celle d'origine, l'écran « Gérer le foyer » les signale et propose un bouton facultatif pour les retirer, après confirmation et sauvegarde. Aucun véritable menu personnalisé n'est effacé automatiquement.

## Données intentionnellement exclues du partage
- Santé et rendez-vous médicaux : famHealth, ainsi que les catégories de documents Santé.
- Documents personnels, pièces d'identité, autres documents, mémos familiaux et fichiers binaires.
- Contenu Apple Rappels/Calendrier : pas de connecteur actif.
- Génération IA de recettes ou validation Thermomix : pas de service ajouté.

Un modèle distinct de permissions privées et un stockage de fichiers sécurisé seront nécessaires avant de migrer ces données.

## Conservation, recette et rollback
- La clé de stockage de l'ancien preview Stitch V5 reste inchangée ; le nouveau dossier utilise deux espaces distincts. L'import volontaire des données de l'ancien essai, inutile pour une utilisation vierge, est désormais rangé dans une option repliée. Les fichiers joints binaires ne sont pas copiés.
- La production racine, l'ancien essai Stitch V5 et Sync V2 restent indépendants.
- GitHub Actions vérifie syntaxe, cœur offline, conflits, quantité nullable, contraintes statiques, smoke-tests simulés et égalité du grand HTML Stitch V5 après neutralisation des deux changements de noms de stockage.
- Les tests automatisés ne remplacent pas un test Safari iOS ni un vrai test de sécurité inter-foyers. Aucun ami ou nouveau foyer ne doit être invité avant validation de ces tests.
- La synchronisation V1 -> V2 a été une copie à un instant T. Une réconciliation reste requise si la V1 évolue.
- Rollback : rouvrir /essai-stitch-v5/ ou / ; ne pas effacer les caches du preview avant d'avoir récupéré les modifications en attente.
