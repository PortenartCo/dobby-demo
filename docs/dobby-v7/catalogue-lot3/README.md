# DOBBY V7 · Catalogue et images, lot 3

Le correctif part du lot 2 de la PR #42. Le module Recettes et sa révision restent la référence du Grimoire, du Mode Cuisine, du planning et des courses. Le catalogue intégré passe par le même registre natif des recettes de référence. Les recettes ajoutées au foyer restent identifiables comme recettes personnelles.

## Recettes et images du foyer

L’import `dobby-recipes` v2 conserve les fichiers sur l’appareil et les rattache à la couverture ou au couple méthode et index d’étape. Les mêmes octets sont transférés au foyer si un parent a activé le partage du module Recettes et que le service des images est installé. Le serveur vérifie le type, la taille et le SHA-256. Un membre canonique actif peut charger une image lorsque sa référence exacte existe dans la révision confirmée du foyer. Un enfant ne peut pas téléverser. Les membres inactifs, les comptes extérieurs et les anonymes sont refusés.

`03-images-recettes.sql` ajoute la table privée et ses trois interfaces. Le writer natif Recettes conserve son contrôle de révision. Les données préparées lors d’un échec de synchronisation restent inaccessibles sans référence dans une révision confirmée. Le renvoi est idempotent. Le correctif n’efface ni fichier ni historique. Les archives ZIP sources restent sur l’appareil. Un export JSON conserve les liens d’étapes et les champs d’ingrédients et exclut les fichiers image. Le ZIP source conserve les images, si elles étaient fournies.

En cas de serveur antérieur, le texte continue de se synchroniser. Les images restent consultables sur l’appareil d’origine et leur copie est retentée à la prochaine synchronisation avec le service installé. Une photo historique absente de tous les appareils ne peut pas être restaurée. Avant une ouverture réelle, appliquer la migration après revue et vérifier les limites de requête PostgREST sur des médias jusqu’à 10 Mio. Suivre la taille du stockage avant l’import à grande échelle.

## Préparation du catalogue éditorial

Le registre embarqué est vide tant que les ZIP approuvés n’ont pas été reçus. Les quatre recettes de référence déjà présentes dans le moteur restent utilisables. L’éditeur prépare des ZIP `dobby-recipes` v2, par lots pouvant être importés dans le flux natif. Les limites en vigueur restent 150 recettes, 2 Mio pour le JSON, 40 Mio par ZIP, 80 Mio décompressés, 180 entrées, 10 Mio par image et 10 images par recette.

Pour le catalogue, chaque recette porte `importKey`, un `catalogue` avec `collection` (`classic` ou `diet`), `course` (`starter`, `main` ou `dessert`), `description`, `difficulty` (`facile`, `intermediaire` ou `avancee`), `tags` et `allergens`. Chaque ingrédient doit avoir `id`, `canonicalId`, quantité, unité et `optional`. Le format existant distingue `photo-originale` et `illustration-IA`. Les liaisons `method` et `stepIndex` commencent à zéro pour chaque méthode.

```sh
node essai-stitch-v7/build-recipe-catalogue.mjs audit - /tmp/catalogue-audit.json /chemin/prive/lot-*.zip
node essai-stitch-v7/build-recipe-catalogue.mjs build /chemin/prive/revues.json /tmp/catalogue-candidat /chemin/prive/lot-*.zip
```

L’audit produit les empreintes, les motifs de rejet et les comptes par catégorie et durée. Le code de retour reste non nul tant que le dossier est incomplet. Le fichier de revue est indexé par `importKey`. Les champs `fingerprint`, `editorial` et `rights` lient l’acceptation aux octets examinés. `dietReviewed` atteste la revue privée. `tm5` et `tm5Date` attestent le contrôle humain du modèle TM5. `mediaException` documente dans la revue privée les rares recettes simples avec moins de deux illustrations intermédiaires. Les fichiers de cet examen, les règles individuelles et leurs valeurs restent privés.

Pour générer le registre, les deux collections doivent chacune contenir 140 plats, 30 entrées et 30 desserts approuvés, avec quatre portions, préparation traditionnelle, médias référencés, provenance et historique de vérification. L’audit détecte les doublons d’identifiant, de titre normalisé et de composition et de texte identiques. La cohérence culinaire, les allergènes, les doublons sémantiques, les droits, la pertinence des images et la validation sur le référentiel diététique individuel exigent une revue humaine. Les attestations et les références privées ne figurent pas dans le registre de diffusion.

## Preuves

- `tests/catalogue-lot3.test.mjs` couvre le format d’entrée, le contrôle éditorial, le lien à l’empreinte, l’approbation privée et le rejet des doublons sans produire de recettes réelles.
- `test-postgres.py` installe le SQL sur des comptes fictifs, vérifie les permissions, la révision Recettes et l’intégrité des octets. La base est éphémère et sans réseau.
- `tests/catalogue-lot3-ui.cjs` utilise deux profils Chromium et une interface HTTP fictive. Il vérifie l’import, la synchronisation native, le rechargement et les images exactes à 320, 390 et 1440 px. Les captures sont des artefacts CI.
- Les tests de transport E07.3/E07.4 et de provenance des sources restent exécutés. Aucun contrôle local ne remplace la recette sur les deux comptes familiaux ou l’examen des ZIP éditoriaux.
