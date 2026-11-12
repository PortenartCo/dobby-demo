# DOBBY — consolidation préparatoire E07-P01 + E07-P02

**État :** branche de développement isolée, sans fusion applicative ni publication.

Base commune : `69ef361ad139356c2d1473d825f9231e7610b0e4`. P01 : `e93f3dd64e9406fc145e95c105bedcb575d70034`. P02 : `0c081f64f8bd5cd537de8f406fed97d787671184` (sources applicatives).

Le fichier `essai-stitch-v7/cuisine-e07.js` a été réconcilié sur ses modifications non recouvrantes. Les fichiers Courses (CSS, liste, tests, utilitaire d'aperçu) reprennent les versions P02. Les fonctionnalités P01 de calendrier, convives et planning, ainsi que E07.4, restent dans la base.

La CI doit exécuter P01 + frontières E07.4 et les tests P02 de modèle, navigateur, effets et client familial simulé. **Aucune réussite n'est présumée avant contrôle GitHub Actions sur le SHA final.**

**Reste à traiter :** `Déjà à la maison` se trouve encore dans `shopFinal.homeByScope` sur chaque appareil ; cette annotation n'est pas synchronisée par `dobby_v2_grocery`. La table du projet Supabase personnel `dobby-family-sync` ne peut pas être inspectée via le connecteur disponible dans cette session. Ne pas créer de second panier, ne pas écrire en base sans contrôle du schéma existant. Un aperçu unifié ne peut pas être qualifié multi-appareils avant ce correctif.

Le catalogue de 200 recettes générales et 200 diététiques constitue un lot distinct. Pas de nouvelle recette fictive ou de modification des données réelles.
