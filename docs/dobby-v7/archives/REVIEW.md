# Revue indépendante et corrections causales

La revue indépendante a inspecté l'état de travail contre main `25dd637` et exécuté les neuf tests Archives writer/sync ainsi que des reproductions navigateur jetables. Elle a signalé trois défauts. Ils ont été reproduits avant correction, puis corrigés dans la passe finale :

| Défaut | Correction | Preuve |
|---|---|---|
| P1 : un refus get() devenait une absence de garde ; route directe d'un autre foyer lisible/modifiable | Précontrôle avant rendu canonique ; refus propagé aux commandes ; formulaires natifs et API protégés ; recettes refusées avant hydratation | review-isolation-red.log → review-green.log, scénario isolation, y compris soumission du formulaire natif |
| P2 : recette archivée retirée de la résolution des menus existants | Conserver les recettes pour résoudre les menus ; filtrer uniquement les catalogues/sélecteurs et refuser une nouvelle sélection au writer | review-planned-red.log et review-selection-red.log → review-green.log |
| P2 : onglets Préparation et Classique/TM5 désactivés avec les mutations | Garder les commandes de lecture actives et désactiver uniquement les commandes de modification | review-instructions-red.log → review-green.log |

Un contrôle supplémentaire a reproduit la perte de statut lors de l'import d'une sauvegarde partielle ancienne Maison. Les imports Maison et mémos locaux fusionnent maintenant les champs absents au lieu de remplacer la fiche. `partial-backup-red.log` puis `sources-final.log` vérifient cette conservation. Le fixture de provenance inverse exactement les six amendements natifs et conserve toutes les preuves historiques des modules antérieurs.

Les cinq axes de revue sont couverts : omission d'un ancien pair et réparation CAS, contexte changé pendant confirmation, échec de sauvegarde et rollback local, même ID dans deux sources, recette déjà planifiée. Aucun accès distant ni recette réelle A/B n'a été effectué.

La clôture des correctifs repose sur leurs tests causaux et les suites locales, sans seconde revue indépendante. Le contrôle global de CI reste une réserve distincte décrite dans AUDIT.md.
