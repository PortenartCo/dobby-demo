# CODEX — DOBBY E07 : Taverne Gourmande et Courses essentielles

**MODE : EXÉCUTION — Mission autonome, ciblée, avec preuves et arrêt pour revue.**

## 1. Contexte et base technique

Dépôt : `PortenartCo/dobby-demo`

Créer une branche indépendante `feat/dobby-e07-cuisine-courses` depuis E05 :

`8418682e5094b66ee879fbf18dcd1e6a3b6d5a05`

E06 (première connexion) est développé séparément. Ne pas modifier sa branche, fusionner ses travaux ou écraser ses composants. La convergence interviendra lors de l'intégration générale.

Vérifier les éventuelles instructions `AGENTS.md` applicables.

**Pièce jointe obligatoire : `DOBBY-E07-STITCH-TAVERNE-COURSES.zip`.**

Vérifier son contenu et l'accès effectif aux fichiers avant toute modification.

Le ZIP contient deux nouvelles maquettes :
- `dobby_la_taverne_gourmande_version_simplifi_e_rapide/code.html`
- `dobby_ma_liste_de_courses_usage_magasin_simplifi/code.html`

Il contient aussi les captures et deux illustrations originales de Dobby.

Si les fichiers ne sont pas disponibles, signaler le blocage sans reconstruire leur apparence de mémoire.

## 2. Objectif

Intégrer les deux nouvelles compositions graphiques Stitch dans DOBBY V7 :

**A. La Taverne Gourmande**

Planification des repas, dîner du soir, semaine, accès aux recettes et préparation des courses.

**B. Ma liste de courses**

Préparation des achats, achats en magasin, articles complémentaires et panier familial.

Nous recherchons :

**La richesse graphique et l'identité magique des premières versions DOBBY, associées à la simplicité ergonomique des dernières maquettes Stitch.**

Ne pas reconstruire le module Cuisine.

Les treize écrans Cuisine actuellement opérationnels et leurs fonctionnalités natives doivent être préservés.

## 3. Sources de vérité techniques

Utiliser en priorité :

- `docs/dobby-v7/INTEGRATION.md`
- `docs/dobby-v7/evidence/cuisine/README.md`
- `essai-stitch-v7/cuisine.js`
- `essai-stitch-v7/cuisine.css`
- `essai-stitch-v7/cuisine-engine.js`
- `essai-stitch-v7/build-cuisine.cjs`
- `essai-stitch-v7/build-source.cjs`
- `essai-stitch-v7/cuisine-routes.json`
- `essai-stitch-v7/route-manifest.json`

Points d'ancrage connus :
- `renderTaverne(data)`
- `renderShop(data)`
- `renderShared(shared, sample)`
- `renderFinal(data)`

Tests existants :
- `essai-stitch-v7/tests/cuisine.cjs`
- `essai-stitch-v7/tests/cuisine-family.cjs`
- `essai-stitch-v7/tests/cuisine-visual.cjs`

Réutiliser le moteur V5 masqué, son état, son writer et les adaptateurs V7.

Aucune nouvelle base, aucun nouveau moteur de recettes, de courses ou de synchronisation.

## 4. Checkpoint A — La Taverne Gourmande

Route existante : `index.html#taverne`.

Remplacer sa composition graphique par la nouvelle maquette Stitch.

### Conserver

- Le repas du soir avec les vraies données du planning.
- Le nom de la recette et la durée connue.
- Les convives et les portions calculés par le moteur existant.
- Les sept journées du planning.
- La sélection, modification et consultation des repas.
- L'accès au Grimoire.
- L'accès à la préparation des courses.

### Présentation

Utiliser le visuel Dobby et la cuisine magique de la nouvelle maquette.

Conserver Dobby bien visible, avec son visage, ses oreilles et son buste correctement cadrés.

La scène doit rester immersive, mais compacte.

Corriger le chevauchement des éléments dans la carte « Repas prévu ce soir ».

La semaine doit rester lisible sur smartphone, sans nécessiter de nombreuses manipulations.

Respecter les données réelles :
- Aucun repas fictif ajouté.
- Aucune date codée en dur.
- Aucune durée inventée.
- Aucun nombre de convives fictif.
- Aucun ingrédient ajouté artificiellement.

En cas d'absence de repas, afficher un état vide clair avec le bouton « Choisir un repas ».

**DONE A :** la nouvelle Taverne est raccordée au planning et aux recettes existants. Les opérations fonctionnent après enregistrement et rechargement.

## 5. Checkpoint B — Courses et provisions

Routes techniques existantes :

- `index.html#shop` : préparation.
- `index.html#shop-1` : variante existante.
- `index.html#shop-final` : liste validée et achats.
- `index.html#shop-history` : historique.

Le nouvel écran Stitch « Ma liste de courses » doit fournir la référence graphique commune.

**Attention : ne pas confondre les étapes du parcours.**

### Préparation des courses

Conserver le fonctionnement natif :
- Ingrédients issus des repas planifiés.
- Quantités et unités calculées lorsqu'elles sont connues.
- Choix « À acheter » ou « Pas nécessaire ».
- Ajout et retrait d'achats complémentaires.
- Validation de la préparation.

Une quantité inconnue reste « À préciser ».

### Courses en magasin

Après validation, conserver la liste native :
- Cases à cocher suffisamment grandes.
- Articles achetés et restant à acheter.
- Progression des achats.
- Modification de la préparation.
- Historique.

La nouvelle identité visuelle doit également être cohérente avec cet état validé, sans recréer son writer.

### Panier familial

Conserver les mécanismes existants :
- Panier local distinct du panier partagé.
- Publication des ingrédients uniquement sur action explicite.
- Ajout, édition, suppression et coche des articles familiaux.
- Synchronisation et reprise hors connexion.
- Gestion des conflits existante.

Ne pas déduire un état « synchronisé » de la seule présence d'une session.

Afficher correctement l'état réel : local, partagé, en attente, déconnecté ou conflit selon les informations effectivement disponibles.

Ne jamais fusionner silencieusement les paniers ou dupliquer les articles à chaque synchronisation.

### Présentation

Réutiliser le visuel de Dobby avec son panier magique.

Corriger son cadrage afin que le personnage soit clairement visible.

Garder les noms d'articles lisibles, y compris lorsqu'ils sont longs.

Les articles restent facilement cochables et modifiables sur smartphone.

Éviter les grands blocs décoratifs répétés entre les articles.

**DONE B :** préparation, validation, achats et panier familial restent fonctionnels, avec la nouvelle identité graphique.

## 6. Checkpoint C — Cohérence graphique DOBBY

Utiliser les illustrations locales fournies dans le ZIP.

Les nouveaux HTML Stitch contiennent encore des URL Google externes pour les images. Ne pas conserver ces dépendances dans l'application.

Associer les deux illustrations locales aux écrans correspondants et vérifier leur affichage.

Conserver une apparence cohérente de Dobby entre les deux vues. Si les illustrations présentent une différence notable de personnage, documenter l'écart sans générer arbitrairement un troisième Dobby.

Préserver :
- Les teintes chaudes et la palette or ancien.
- Les ornements fantasy.
- Les textures de parchemin et de bois.
- Les typographies existantes.
- Les illustrations de cuisine magique.
- Les effets lumineux discrets.

Ne pas sacrifier la lisibilité aux effets décoratifs.

**Très important : conserver les bandeaux communs DOBBY déjà intégrés.**

Navigation à cinq destinations :
Traverse · Missions · Taverne · Famille · Menu.

Ne pas recopier les bandeaux incomplets issus des maquettes Stitch.

Les boutons et actions doivent utiliser les composants et conventions du projet.

Préserver l'accessibilité, les contrastes et la préférence de réduction des animations.

## 7. Construction et conservation des sources

Conserver intacts les 53 HTML originaux de `design/stitch-53/`.

Les nouvelles sources E07 doivent être intégrées selon le processus de dérivation déjà utilisé par DOBBY V7.

Éviter toute modification manuelle des fichiers générés qui serait perdue lors de `build-source.cjs`.

Réutiliser les adaptateurs existants, en limitant les changements à la présentation et à son raccordement.

Les pages secondaires Cuisine ne doivent pas être redessinées.

Une harmonisation CSS strictement nécessaire entre préparation et liste validée est autorisée, mais pas une refonte des autres pages.

## 8. Vérifications

### Fonctionnelles

Vérifier :
- Repas du soir présent et absent.
- Semaine de sept jours.
- Choix et remplacement d'une recette.
- Quantités et portions existantes.
- Courses calculées depuis les repas.
- Achat complémentaire.
- Quantité inconnue.
- Validation de la liste.
- Coche et décoche en magasin.
- Persistance après rechargement.
- Panier familial connecté, déconnecté et hors connexion.
- Conflits de synchronisation.
- Absence de publication automatique des courses locales.

### Visuelles

Réaliser des comparaisons des deux nouvelles sources Stitch avec les interfaces intégrées.

Largeurs :
- 320 px.
- 390 px.
- 1440 px.

Vérifier particulièrement :
- Cadrage de Dobby.
- Chevauchements dans le repas du soir.
- Noms d'articles longs.
- Grandes cases à cocher.
- Navigation commune.
- Images chargées localement.
- Défilement et éléments fixes.
- États vides et listes longues.

### Non-régression

Exécuter d'abord les tests Cuisine ciblés.

Étendre uniquement si des composants communs ont réellement changé.

Terminer par une campagne de non-régression adaptée au diff final et les CI du SHA livré.

Vérifier qu'aucun mécanisme E01–E05 n'est altéré. La compatibilité E06 pourra être vérifiée lors de la future composition, sans modifier sa branche.

Ne pas répéter des tests identiques déjà verts sans changement causal.

## 9. Limites

Ne pas :
- Développer de nouvelles fonctionnalités Cuisine.
- Modifier les recettes ou le calcul des portions.
- Modifier les writers.
- Recréer le panier familial.
- Ajouter de fonctions d'achat, de livraison ou de paiement.
- Modifier Supabase.
- Changer l'architecture de synchronisation.
- Modifier E06.
- Fusionner les branches.
- Publier GitHub Pages.
- Introduire un nouveau framework ou design system.

Les données et comptes réels ne doivent pas être utilisés dans les tests.

## 10. Livraison

Pousser la branche E07 pour revue, sans fusion.

Créer :

`docs/dobby-v7/E07-TAVERNE-COURSES.md`

Le rapport doit contenir :
- Références des nouvelles maquettes.
- Fichiers modifiés et commits.
- Fonctionnalités réellement raccordées.
- Captures comparatives.
- Résultats des tests et CI.
- Écarts graphiques restants.
- Limites de synchronisation ou de recette réelle.
- Éléments éventuels à vérifier lors de l'intégration E06/E07.

Distinguer code livré, tests exécutés, intégration vérifiée, déploiement et fonctionnement réel.

**Arrêter pour revue humaine. Aucune fusion, publication ou action serveur.**