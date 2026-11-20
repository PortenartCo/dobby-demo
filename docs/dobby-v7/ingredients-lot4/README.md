# DOBBY V7 · Avec mes ingrédients, lot 4

Les entrées « Que puis-je cuisiner ? » dans la Taverne et « Avec mes ingrédients » dans le Grimoire ouvrent le même écran. La sélection est gardée en mémoire pendant la navigation. Elle disparaît au rechargement ou si le compte change. Le menu propose une recherche, des catégories et la possibilité de retirer chaque ingrédient sélectionné. Les quatre produits implicites sont l’eau, le sel, le poivre et l’huile de cuisine générique.

## Correspondance

Le moteur utilise les recettes autorisées et actives du registre natif. Il compare les identités d’ingrédients nécessaires, avec un dictionnaire conservateur de synonymes et la normalisation fournie à l’import. Il exclut les identités incomplètes et les recettes importées signalées incertaines. Les ingrédients explicitement facultatifs ne sont jamais comptés comme manquants. Une huile spéciale reste un produit distinct.

Les recettes prêtes à cuisiner apparaissent d’abord. Le groupe suivant montre exactement les un ou deux ingrédients manquants. Pour chaque groupe, le classement alterne les familles de plats et de durées sur un ordre stable. Les filtres facultatifs permettent d’affiner par collection, durée totale, type de plat, méthode et recettes personnelles. Les recettes personnelles sans collection éditoriale apparaissent avec le filtre « Toutes ». Le choix d’ingrédients ne mesure pas les quantités disponibles.

## Actions natives

- « Voir la recette » ouvre la fiche et ses quantités.
- « Commencer à cuisiner » ouvre le Mode Cuisine dans la méthode choisie. Les ingrédients manquants sont signalés. Une préparation lancée depuis la recherche est indépendante d’un créneau déjà planifié pour la même recette.
- « Ajouter au planning » ouvre le calendrier existant par-dessus les résultats. La liste des ingrédients manquants reste visible. Les confirmations et la protection contre l’écrasement du créneau viennent du calendrier natif.
- « Ajouter les ingrédients manquants aux courses » utilise la liste et ses reçus natifs. Un ingrédient déjà présent est conservé. Les confirmations répétées utilisent le même identifiant de contribution dans la liste active. Un ajout explicite après archivage utilise un nouveau reçu dérivé de l’article archivé. Les lignes sont enregistrées sans quantité car la recherche ne sélectionne aucun nombre de convives.

L’interface et le modèle ne créent aucun registre de stock. Ce lot ne requiert aucune migration. Les essais de la liste partagée passent par le client natif et des réponses HTTP fictives. L’essai sur les deux comptes familiaux, l’installation des migrations antérieures et l’import des 400 recettes restent des conditions distinctes avant mise en service.

## Preuves

Les tests automatisés fixent les cas de qualificatifs et synonymes, les quatre basiques, les exclusions, les groupes, la diversité, les filtres et le traitement des recettes non analysables. Les deux accès et les quatre actions sont exercés à 320, 390 et 1440 px. Les captures du parcours de recherche et du calendrier sont disponibles dans les artefacts de la CI.
