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

Après intégration de main #15, PREP a détecté cinq empreintes historiques affectées par les changements Archives approuvés. La nouvelle couche `archives-source-extensions.json` inverse les seuls amendements de six fichiers complets, vérifie les empreintes avant/après et rejette les octets ou empreintes parent altérés. Les manifests PR11/PR15 et toutes leurs assertions sont conservés. `provenance-red.log` puis `provenance-green.log` montrent les cinq échecs puis les dix tests de provenance réussis ; `prep-regression.log` confirme les 57 contrôles et les parcours PREP, sans normaliser le code réellement exécuté par l'application.

La seconde revue indépendante a porté sur la composition main16. Elle a confirmé deux P1 : une restauration partielle pouvait contourner le cycle d’archive et des listes actives exposaient des fiches réactivées d'un autre foyer. Les gardes `mergeRestored`, les précontrôles d'import et les filtres par accès source corrigent ces cas. `main16-review-green.log` couvre les cinq listes, les refus de restauration et la lecture conservée des programmes/historiques/PDF. Le blocage du lien Maison → contrat a été reproduit par la campagne Maison (`maison-composition-red.log`) puis corrigé en gardant l'ID de la source lors du contrôle, avant d'autoriser la destination au rendu.

`retired-recipe-red.log` et `writer-green.log` couvrent le statut natif removedAt ; une recette déjà retirée doit être restaurée dans ses réglages avant changement d'archive. `derived-rollback-red.log` puis le writer vert prouvent le rollback des effets natifs sur autoTasks si la sauvegarde échoue.

Retest indépendant après corrections : les deux P1 sont clôturés, les reproductions Maison/isolation passent et les inversions native8/source7 sont validées. Aucun défaut concret restant dans ce périmètre de revue ciblé. Les campagnes finales Archives et Maison sont vertes ; l'inspection visuelle finale couvre la liste et le bandeau à 320/1440 px, en complément des quatre largeurs automatisées.
