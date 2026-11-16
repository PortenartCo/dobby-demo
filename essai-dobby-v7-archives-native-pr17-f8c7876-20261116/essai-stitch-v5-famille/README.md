# Dobby V5 familial — intégration isolée (08/11/2026)

## Périmètre réellement raccordé
- Maquette Stitch V5 préservée : HTML identique à l'essai V5 original à l'exception des deux clés de stockage navigateur volontairement isolées et du versionnement de chargement JS. CSS Stitch de référence inchangé ; CSS supplémentaire pour la famille.
- Nouvelle section « Le panier commun » dans la page Courses, sans iframe et sans remplacement de la préparation d'origine.
- Auth Supabase avec clé *publique* seulement et comptes familiaux existants.
- Récupération possible de la clé publiable du pilote Sync V2 sur le même navigateur. Aucune copie de son mot de passe ou de ses jetons de session.
- Base personnelle Dobby : tables V2 households, memberships et grocery préexistantes.
- Cache IndexedDB isolé pour ce preview, lecture et édition des articles, coche, suppression logique, reprise hors ligne, CAS de révision et conflit explicite.
- Import depuis menus/recettes vers la liste partagée uniquement sur une action explicite, avec déduplication et identifiant d'import déterministe.
- Un compte doit appartenir à un seul foyer actif dans ce pilote.
- Un même profil de navigateur est réservé à un seul foyer afin d'éviter de mélanger les données locales ; changer de foyer exige un profil navigateur distinct. Il ne s'agit pas encore d'une application multi-foyers complète sur appareil partagé.

## Modules familiaux — socle SQL déployé, synchronisation à confirmer en sessions réelles
La synchronisation opt-in des modules menus, recipes, missions, house, family et contracts est codée dans family-modules.js. **La table Supabase a été créée et le contrôle SQL simulant deux membres et un extérieur a renvoyé PASS, selon les résultats fournis par l'utilisateur.** Les scripts GitHub n'exécutent aucune migration Supabase. L'utilisateur a confirmé que le deuxième compte a pu récupérer les six modules. La lecture et le rattachement fonctionnent donc en situation réelle ; les écritures concurrentes de chaque module et l'agenda restent à confirmer sur deux sessions réelles.

La synchronisation nécessite un consentement explicite depuis « Gérer le foyer ». Lorsque plusieurs modules sont encore inactifs et qu'aucun module familial n'est déjà publié, un bouton « Activer les 6 modules du foyer » effectue la mise en place en une seule confirmation, avec sauvegarde et exclusion des repas fictifs encore intacts. Le deuxième compte peut récupérer les modules déjà partagés en une seule opération, avec sauvegarde locale avant remplacement. Aucun de ces mécanismes ne lance automatiquement une importation ou une synchronisation sans action de l'utilisateur. Les tests simulés ne prouvent pas une synchronisation complète avec deux véritables sessions.
- Menus et préparations : planned, shopHistory, shopFinal et shopChoice.
- Recettes personnalisées et adaptations Thermomix déjà enregistrées : customRecipes et tmAdaptations.
- Missions : autoTasks (projections dérivées des équipements/contrats) et manualMissions (tâches familiales créées par les utilisateurs, séparées pour ne pas être marquées obsolètes par le moteur automatique).
- Maison : houseItems et houseLogs (fichiers/attestations locaux).
- Famille : familyMembers, famContacts, famLists, familyEvents (événements ordinaires) et sharedHealthVisits (rendez-vous médicaux saisis volontairement). Les anciens carnets famHealth restent locaux.
- Documents, contrats et assurances : fiches et références des pièces Cloud. Contrats et Assurances restent partagés. Les autres fiches, y compris Santé, exigent l'action explicite « Partager au foyer ». Aucun fichier local n'est téléversé automatiquement.

Les versions familiales existantes ne doivent pas écraser silencieusement les données locales : sauvegarde de préimage et résolution de conflit sur version de module.

La V5 peut précharger trois repas **fictifs** (poulet, pâtes, tartines) sur un appareil vierge. Si leur structure est toujours celle d'origine, l'écran « Gérer le foyer » les signale et propose un bouton facultatif pour les retirer, après confirmation et sauvegarde. Aucun véritable menu personnalisé n'est effacé automatiquement.

## Agenda, échéances et calendrier iPhone — essai fonctionnel
- Nouveau panneau « Agenda du foyer » dans la page Famille : ajouter, modifier, supprimer des événements non médicaux (famille, école, activité, anniversaire, déplacement).
- Les événements sont enregistrés dans `st.familyEvents` et empruntent le module `family` déjà sécurisé par la RLS du foyer. Pas de nouvelle table Supabase.
- La page d'accueil résume les événements du jour sur la vraie maquette Stitch V5.
- Les échéances combinent les missions ouvertes, entretiens de maison, contrats/assurances et anniversaires des membres ; les retards récents sont signalés. Aucun faux rappel Apple n'est annoncé.
- Un bouton « Calendrier » exporte un `.ics` à importer manuellement sur iPhone ou ordinateur ; aucune synchronisation native Apple Calendar n'est revendiquée.
- Les catégories médicales sont interdites dans ce module et un avertissement rappelle de ne pas saisir de données médicales ou confidentielles. Le carnet `famHealth` et les documents « Santé » ne sont jamais utilisés pour générer ce tableau.
- Tests automatisés : validité des dates, agrégation, fuites de catégories sensibles, export iCalendar, partage entre deux comptes simulés, saisie et persistance réelle dans Chromium.
- **Limite** : la synchronisation du nouvel agenda entre deux véritables sessions Supabase et Safari iOS n'est pas encore constatée.

## Missions familiales — saisie et responsabilité
- L'écran Missions comporte désormais une liste manuelle indépendante, dans laquelle on peut créer, modifier, attribuer, terminer, rouvrir et supprimer une mission.
- Responsable = membre présent dans le module Famille, échéance facultative et note non confidentielle.
- Ces missions sont sauvegardées dans `st.manualMissions`, au sein du même module `missions` partagé via Supabase V2. Aucune nouvelle table ni migration SQL.
- Le moteur historique `autoTasks` conserve son propre fonctionnement ; il ne peut plus classer ces missions manuelles « obsolètes ».
- Les missions datées figurent dans les échéances communes sur l'accueil et dans l'agenda.
- Aucun rappel ni attribution Apple Rappels n'est envoyé automatiquement.
- Vérification : tests unitaires, deux comptes simulés et création persistante dans Chromium. Les modifications entre deux comptes réellement connectés restent à confirmer.

## Documents et rendez-vous médicaux — activation simple
- Documents : une section « Documents communs » permet d'envoyer volontairement un PDF ou une image de 10 Mo maximum, soit depuis une pièce locale existante, soit depuis un fichier choisi. La lecture sur l'autre appareil utilise la session familiale déjà ouverte.
- Fichiers : un seul bucket privé `dobby-family-files` ; accès via le dossier du foyer et trois politiques standard (lire, ajouter, supprimer). Aucun nouveau rôle ni code PIN.
- SQL : `sql-proposals/dobby-family-files.sql` prépare l'espace privé. GitHub ne l'exécute pas. Le projet personnel Supabase doit l'appliquer une fois avant un véritable transfert.
- Les anciennes fiches, les PDF locaux et les photos locales ne sont pas envoyés automatiquement. Les transferts ne commencent que sur action explicite.
- Retirer une fiche liée à un fichier distant retire aussi ce fichier. Une modification de fiche se synchronise par le module Documents existant.
- Rendez-vous médicaux : les anciens carnets famHealth restent locaux. Un nouvel écran Famille permet de créer volontairement des rendez-vous partagés, sous `sharedHealthVisits` dans le module Famille déjà actif.
- Les fiches de catégorie Santé restent locales par défaut et peuvent être partagées explicitement comme n'importe quel document du foyer.
- Tous les membres actifs du même foyer ont accès à ce qui a été partagé. Pas de système de rôles ni d'approbations supplémentaires.
- Validation utilisateur du 08/11/2026 : le fichier du test familial est visible sur les deux sessions après activation du bucket privé (3 politiques, 10 Mo). La récupération inter-session est constatée ; ouverture/lecture du contenu et scénarios concurrents ne sont pas explicitement certifiés par ce seul retour. Éviter de rejouer ce test à chaque modification UI. L’interface masque désormais le second sélecteur de fichier local pour les fiches partagées, tout en gardant une éventuelle copie locale accessible dans une section repliée.
- Limites : ni calendrier Apple ni Rappels Apple ne se synchronisent automatiquement.
## Données intentionnellement exclues du partage
- Les anciennes fiches de santé (famHealth) restent locales. Les nouveaux rendez-vous médicaux partagés sont saisis volontairement et visibles aux membres actifs du foyer. Les documents Santé restent locaux tant qu'ils ne sont pas choisis pour le partage.
- Les documents et mémos qui n'ont pas été volontairement partagés ainsi que les pièces jointes locales sont conservés sur cet appareil.
- Contenu Apple Rappels/Calendrier : pas de connecteur actif.
- Génération IA de recettes ou validation Thermomix : pas de service ajouté.

La migration des anciens carnets de santé privés reste exclue du partage automatique. Le stockage privé du foyer est désormais actif pour les fichiers volontairement partagés.

## Conservation, recette et rollback
- La clé de stockage de l'ancien preview Stitch V5 reste inchangée ; le nouveau dossier utilise deux espaces distincts. L'import volontaire des données de l'ancien essai, inutile pour une utilisation vierge, est désormais rangé dans une option repliée. Les fichiers joints binaires ne sont pas copiés.
- La production racine, l'ancien essai Stitch V5 et Sync V2 restent indépendants.
- GitHub Actions vérifie syntaxe, cœur offline, conflits, quantité nullable, contraintes statiques, smoke-tests simulés et égalité du grand HTML Stitch V5 après neutralisation des deux changements de noms de stockage.
- Les tests automatisés ne remplacent pas un test Safari iOS ni un vrai test de sécurité inter-foyers. Aucun ami ou nouveau foyer ne doit être invité avant validation de ces tests.
- La synchronisation V1 -> V2 a été une copie à un instant T. Une réconciliation reste requise si la V1 évolue.
- Rollback : rouvrir /essai-stitch-v5/ ou / ; ne pas effacer les caches du preview avant d'avoir récupéré les modifications en attente.
