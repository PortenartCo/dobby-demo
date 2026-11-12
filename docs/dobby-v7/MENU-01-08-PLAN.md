# MENU-01 à MENU-08 — Plan d’implémentation

**Objectif :** appliquer le cahier des charges [MENU-01-08-SPEC.md](MENU-01-08-SPEC.md), exécuté de manière autonome jusqu’au commit local.

**Base :** `5b764ef367553e9945fb72a6b563b55adc41e040`, intégration Famille sur la source globale validée `6a6fcd9`. Les preuves Famille finales distantes sont incomplètes ; les tests locaux sont relancés.

**Architecture retenue :** un layout canonique Menu dérivé par le builder existant, cinq liens natifs, filtrage DOM local sans writer. La sous-route `settings` réutilise le template Menu via un alias du registre (comme les workflows Cuisine) et expose uniquement la sauvegarde native `backup`. Header et dock E01 inchangés.

**Contraintes :** aucune publication/fusion, aucune migration ni nouvelle dépendance produit ; modules, routes, writers et données conservés. Listes et santé restent à revoir avec l’utilisateur avant intégration Famille.

## Travail et vérification

- [x] Isoler branche/worktree et auditer source globale/Famille, templates et génération.
- [x] Ajouter puis observer l’échec des tests Menu : cinq liens, recherche partielle/accents/casse/espaces, vide, effacement/focus, Paramètres/sauvegarde, historique/rechargement, préservation des données, 320/390/1440.
- [x] Implémenter `menu-layout.html`, sa dérivation dans `build-register.cjs`, l’alias `settings` dans `register.js`, les adaptateurs Menu/Paramètres dans `tools-register.js` et les styles limités aux deux vues dans `register.css`. Retirer le message de partage générique de ces deux pages dans `family.js`.
- [x] Adapter les seules assertions historiques qui attendent les accès supprimés ; conserver leur couverture par routes profondes ou dock.
- [x] Exécuter les tests Menu, la commande npm test existante, les contrôles pertinents Famille/globaux/préservation/navigation et la génération reproductible.
- [x] Revue indépendante du diff, captures des trois résolutions, rapport d’implémentation, commit local et état propre.

## Points de revue

- Recherche limitée aux libellés des cinq cartes ; pas de résultat issu des données ni des modules masqués.
- Aucun header contextuel, avertissement générique ou footer issu de la maquette sous le titre Menu.
- Paramètres est une route rechargeable ; le lien de sauvegarde réutilise les handlers existants.
- Au clavier, liens réels, nom accessible, effacement avec retour du focus ; derniers liens atteignables au-dessus du dock.
- Aucun changement des sources natives Famille/Cuisine/Runes/Sync, pièces jointes ou données ; mêmes identifiants médicaux et listes après navigation.

## Résultat des contrôles

Menu, génération, npm test ciblé, six suites Famille natives et régressions métier pertinentes vérifiés. Les anciens tests `family.cjs`, `e05-edge.cjs` et deux cas de `register-review.cjs` échouent également sur la base Famille : permissions des fixtures et éditeurs magiques remplacés par E06. Aucun changement produit ajouté pour contourner ces échecs ; détail dans les preuves et le rapport de livraison.
