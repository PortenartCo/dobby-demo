# E07-P01 — Finalisation du choix des repas

Source exacte : `69ef361ad139356c2d1473d825f9231e7610b0e4`. Branche indépendante `feat/dobby-e07-p01-20261112`, worktree `/workspace/dobby-e07-p01-20261112`. [Plan et périmètre](../superpowers/plans/2026-11-12-e07-p01.md). Les exclusions historiques de P01 dans les rapports E07.3/E07.4 sont remplacées uniquement pour cette page par la demande actuelle.

## Corrections réalisées

- « Choisir un repas » reprend l’illustration et les traitements Stitch, avec « Choix du repas » en bas à droite, sans clignotement. Les encarts Note du Chef, techniques et préférences culinaires sont retirés de cette seule vue. En-tête commun et cinq destinations du dock restent permanents.
- Calendrier unique lundi–dimanche en français belge, semaines précédente/suivante et retour à la semaine courante. Sélection dorée, soleil/lune indiquant les repas, Midi jaune ou Soir jaune indépendamment. La consultation ne modifie ni `st.day`, ni le planning, ni les portions enregistrées.
- Convives dérivés du foyer et modifiables. Faute de catégorie d’âge culinaire native, la convention explicite est : bébé avant trois ans exclu, enfant de trois à dix-sept ans, adulte à partir de dix-huit ans. Un âge inconnu est signalé et compté comme adulte ajustable. Une date de naissance future n’est pas utilisée comme âge valide. Les nouveaux repas utilisent **0,65** par enfant ; les anciens repas conservent leurs nombres et coefficients.
- Trois modes, sans recettes affichées avant leur choix : bibliothèque, tirage aléatoire limité aux filtres, réserve réelle. Recherche et filtres utilisent aussi les métadonnées structurées/importées ; viande, poisson, végétarien, légumes multiples, féculents et Diététique se combinent. « Bœuf » et « boeuf » sont équivalents pour la recherche.
- La réserve lit uniquement les stocks positifs natifs `st.have`. Le moteur ne dispose pas de générateur local de nouvelles recettes : ce mode rapproche explicitement les recettes enregistrées utilisant au moins un ingrédient sélectionné, avec vérification des autres ingrédients/quantités annoncée. Aucun plat ni stock n’est inventé ou enregistré.
- La Taverne conserve son calendrier compact et complète les actions natives déplacer, préparer et annuler. Un déplacement conserve le créneau et utilise la cascade native si la date est occupée, après confirmation. Une annulation demande confirmation et conserve le record. Les snapshots attendus empêchent d’écraser une modification concurrente locale.
- Les cartes « Les Repas du Jour » de la Taverne utilisent désormais le jour civil de Bruxelles, comme l’Accueil ; le calendrier conserve sa consultation indépendante. Une planification future ne détourne plus les cartes quotidiennes vers la dernière date du moteur.

## Conservation des données et de E07.4

Le writer Cuisine natif reste l’unique writer. La replanification conserve les notes, champs inconnus et coefficients du record antérieur. La référence d’import Courses est conservée pour la même recette, retirée lors d’un remplacement par une autre, afin de ne pas prétendre que ses nouveaux ingrédients ont déjà été importés. Un échec de stockage restaure ensemble mémoire et valeur persistée.

La planification ne remplit pas le panier unique automatiquement. Le brouillon dérivé du planning reste natif ; l’incorporation à la liste requiert toujours l’action explicite existante. Liste finale, stocks, achats et historique sont contrôlés inchangés par les tests de planification.

Grimoire, favoris, recherche, import JSON/ZIP externe sans API payante, images, étapes, TM5, vérification humaine, minuteurs, fiche et calendrier superposé restent raccordés. Leurs modules sont préservés ; les tests immédiats de catalogue, fiche, moteur et garde de rendu couvrent les changements de composants partagés. Effets ON/Son OFF par défaut et préférences persistantes ne sont pas réimplémentés. Aucun fichier Missions, Runes ou Supabase n’est modifié.

## Tests et preuves

- **12 scénarios fonctionnels P01 PASS** : calendrier, créneaux, convives, filtres/métadonnées, tirage, réserve, planification future, remplacement, concordance Accueil/Taverne, déplacement, préparation/annulation, CAS et rollback.
- **Trois largeurs visuelles PASS** : [avant/après](evidence/e07-p01/visual/), 320, 390 et 1440 px.
- **Cinq suites de conservation PASS** : Taverne E07.3, catalogue E07.3, fiche E07.4, moteur E07.4 et garde de rendu asynchrone. [Résultats et empreintes des sources](evidence/e07-p01/ci/boundaries-results.json).
- **Deux tests du générateur PASS** : nouveau profil P01 et profil E07.4 inchangé.
- [Contrôles directs des handlers natifs](evidence/e07-p01/native-smoke/) et [Accueil contrôlé](evidence/e07-p01/reviewed-home-390.png).

Le test historique Taverne conserve ses assertions métier. Seuls les gestes vers l’ancien Pick sont adaptés aux nouveaux contrôles et l’horloge est fixée à la date de sa fixture ; les mesures tactiles excluent les contrôles volontairement fermés dans les nouveaux détails. Aucun contrôle de conservation n’est retiré.

Les tests ont révélé puis corrigé la perte de métadonnées lors d’un remplacement, l’ancienne dépendance des repas quotidiens à `st.day` et un contexte de recherche incomplet. Les comparaisons Accueil attendent le rendu visible après défilement, sans remplacer leurs assertions par des données internes. Aucune campagne exhaustive E01–E08 n’est relancée ; la CI utilise le périmètre causal P01 et ses frontières immédiates.

## Aperçu et état réel

Profil : `e07-p01`, namespace distinct `dobby-review-e07-p01-20261112|`. Le générateur refuse une sortie existante, consigne les empreintes source/sortie et désactive les comptes réels. Les deux mêmes recettes explicitement DÉMO de E07.4 sont conservées.

Publication préparée : `essai-dobby-e07-p01-review-20261112/`, chemin distant libre lors du contrôle initial. La publication sera limitée à ce nouveau dossier statique, sans fusion applicative ni remplacement d’aperçu. Les SHA, liens de CI et preuves HTTP seront ajoutés après vérification effective.

À ce stade : code et tests locaux PASS ; publication et recette hébergée encore en attente. Aucun backend réel, aucune modification Supabase, aucune recette familiale privée publiée.

## Suivi conservé et limites

**E07 n’est pas déclaré entièrement terminé.** Le catalogue validé d’environ **200 recettes générales et 200 diététiques**, fondé sur le référentiel fourni, reste une mission distincte avant la revue complète des Courses. Il devra conserver images du plat et des étapes, ingrédients et quantités, TM5, métadonnées des filtres et règles de quantités, notamment riz et pâtes pesés crus. Aucun catalogue artificiel n’est généré ici.

**E07-P02 « Préparer la liste de courses » reste hors périmètre jusqu’à sa revue.** La génération inédite depuis la réserve n’existe pas dans le moteur local et n’est pas simulée. Le déplacement conserve le créneau selon le contrat natif ; aucune nouvelle mécanique de transfert Midi↔Soir n’est introduite. La synchronisation réelle et les comptes familiaux ne sont pas testés dans cet aperçu isolé.
