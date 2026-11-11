# E07-P02 — Courses et reprise des effets

Base : `69ef361ad139356c2d1473d825f9231e7610b0e4` (E07.4).
Branche indépendante : `feat/dobby-e07-courses-final`.

Corrections : une liste, présentations Préparation/Magasin ; suppression directement accessible avec confirmation ; achat réversible ; déclaration maison totale/partielle, modification et annulation séparées des achats ; options secondaires pour synchronisation manuelle et copie de l’appareil, réessai visible sur erreur ; consignes sous Terminer retirées. Seuls les achats cochés sont archivés.

Import : noms strictement identiques après normalisation d’espacement/casse, conversions explicites g/kg/mg et ml/cl/dl/L. Autres unités identiques uniquement. Les quantités inconnues et les produits ambigus restent séparés. Aperçu regroupé avec repas d’origine, complément net, articles existants et quantité disponible. Reçus E07.2 conservés, réimport du même ensemble idempotent. La couverture familiale est calculée sur l’ensemble des repas avant filtrage des dates ; une réallocation touchant des apports hors période requiert un aperçu élargi.

Effets : l’absence de réaction à la transition de `dv7-loading` est reproduite sans interaction ; un observateur limité à cette transition relance le système commun existant. Pas de réécriture des animations, son OFF par défaut, OFF explicite et réduction système respectés. Sur le chargement ordinaire, un rendu ultérieur pouvait déjà masquer la panne ; le test déterministe vérifie la transition elle-même et le test navigateur mesure le déplacement des particules.

Limite explicite : « Déjà à la maison » reste une annotation de la préparation sur cet appareil, isolée par foyer, distincte de l’achat et retirée avec les articles concernés. Aucun inventaire ni nouveau champ distant. Les quantités natives de la liste familiale continuent à suivre son writer et ses conflits existants. La disponibilité n’est pas partagée avec un autre appareil.

Le panier familial conserve aussi `import_source_id` lors de sa normalisation du cache natif, afin de distinguer un article manuel d’un apport après synchronisation/rechargement. La façade d’import accepte les unités compatibles des anciens apports en conservant leur unité enregistrée. Aucune modification des règles de révision, de l’authentification, du schéma SQL ou des points d’accès.

Vérification : tests de modèle, scénario navigateur Courses à 390/320/1440 px, déplacements réels des particules sur six vues, ON/OFF persistant, réduction système, aucun audio automatique. Fixture HTTP familiale : CRUD, hors ligne/rechargement, conflits, provenance, réimport et clôture partielle, sans compte ni données réels. Quatre cas issus de la revue indépendante reproduits puis corrigés avec tests de non-régression : disponibilité périmée, couverture manuelle périmée, conversion d’unité et période restreinte.

Publication : le wrapper `scripts/build-dobby-courses-review.cjs` réutilise le générateur E07.4 et crée un répertoire neuf, un préfixe de stockage distinct et un manifeste de provenance. Seul ce répertoire sera copié pour publication Pages. Les sources de la branche ne seront pas fusionnées.

Intégration : `cuisine-e07.js` reste partagé avec E07-P01 ; reprendre uniquement les blocs Courses (`shop`, actions `e072-*`), l’état de présentation associé et les styles Courses. Aucun changement dans `taverne`, `pick` ou les actions de sélection des repas. Correctif commun dans `chrome.js` à reprendre une seule fois. Aucun fichier Runes ou Missions modifié.
