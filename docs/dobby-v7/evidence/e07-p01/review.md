# Revue indépendante ciblée E07-P01

Revue statique du 12 novembre 2026, comparée à `69ef361ad139356c2d1473d825f9231e7610b0e4`. Aucun test, accès Supabase, commit ou déploiement exécuté par le rôle de revue. Seul ce compte rendu a été écrit.

**Verdict : aucun blocage statique restant identifié dans le périmètre relu.** Les résultats de navigateur appartiennent aux preuves QA distinctes ; le fichier `functional/results.json` consulté annonce les douze contrôles PASS avec les vrais writers natifs et des données fictives.

## Sources à la clôture de lecture

| Fichier | SHA256 |
|---|---|
| `cuisine-p01.js` | `ff769e9b3c0bb46723f67ead5ad774313d92aa249deb498ae4b910d48463a8ac` |
| `cuisine-p01.css` | `7a995a944d01e005454b3f8379c00126930ae7a71ff4f022896e789870155687` |
| `cuisine.js` | `b65ca97f778d2c1cf2bd38380704234deb64f2bf330dff3fd94d434050a9ef81` |
| `cuisine-engine.js` | `4eb0ec960701457c64fe26d4f802a195619af99bc6be827723a4fb639b2b5044` |
| `cuisine-e07.js` | `179aec2ee8e8c202557b812accb15bcbc84b3968c10903cf6f06e2b8cc568ae8` |
| `home.js` | `2c9d381ca7783a202a7aaf0deaff6e1d45a6844b80e8e105fb9a8d4ef4d1bf45` |

## Points corrigés et relus

- Les contextes partiels des événements de recherche conservent `recipeVisual` ; la recherche ne perd plus ce helper lors du rafraîchissement des résultats.
- Les filtres prennent en compte les métadonnées structurées et les champs importés, dont `importDetails.tags`, `keywords`, `dietary` et `metadata`. Les ligatures françaises œ/æ sont reconnues sans modifier les recettes.
- Le changement de semaine décale également le jour sélectionné, conserve un jour doré dans la grille et ne réécrit pas le planning natif.
- Les cartes « Les Repas du Jour » de la Taverne utilisent la date civile du jour en Europe/Brussels, indépendamment du dernier jour natif planifié. Le calendrier de consultation garde son état séparé. Cela évite qu'une planification future remplace les repas du jour affichés au retour.
- Le remplacement conserve les portions et extensions du repas ; une provenance d'import d'ingrédients n'est pas transférée vers une recette différente. Le déplacement conserve le record complet et la cascade native des créneaux occupés.
- Annulation et remplacement passent par une confirmation ; les snapshots attendus refusent les données devenues obsolètes. Les erreurs de persistance sont transmises à l'enveloppe de rollback sans ajouter de writer métier.

Le diagnostic Home a trouvé des instantanés `innerText` vides pendant les vérifications de visibilité, avec données et texte DOM corrects. Aucune règle de révélation par IntersectionObserver ou `content-visibility` n'a été trouvée dans Home/Chrome. La QA attend maintenant le titre réellement visible et son texte exact. Aucune modification du produit Home n'a été faite sur cette hypothèse.

## Limites explicites

- La réserve lit uniquement le stock déclaré `st.have` positif. Elle rapproche des recettes déjà enregistrées qui utilisent au moins un ingrédient retenu ; ce n'est ni une garantie que tout le plat est couvert, ni un générateur de recettes inédites. Aucun nouvel enregistrement fictif ni appel IA n'est introduit.
- Faute de catégorie d'âge culinaire native, les moins de trois ans sont comptés comme bébés et exclus ; de trois à dix-sept ans comme enfants. Un âge inconnu est signalé et proposé parmi les adultes. Les convives restent modifiables et aucune fiche familiale n'est réécrite.
- Les nouveaux repas utilisent 0,65 pour les enfants ; les coefficients déjà enregistrés sont conservés.
- Le déplacement natif change la date en conservant Midi ou Soir et peut décaler les repas occupés après confirmation. Il ne crée pas un déplacement entre créneaux.
- Le catalogue d'environ 200 recettes générales et 200 diététiques, avec son référentiel et ses règles de quantités crues, reste distinct. E07-P02 reste hors périmètre.
- Les preuves consultées utilisent des données fictives, une locale belge et un navigateur automatisé. Aucune synchronisation familiale réelle ni vérification physique Safari/iPhone n'en est déduite.

La revue reste limitée à P01 et aux raccordements modifiés. Elle ne réaudite ni les 53 maquettes ni les imports, TM5 ou minuteurs inchangés.
