# Campagnes actuelles et contrôles historiques

Les contrôles Maison actuels passent : 45 tests ciblés, cinq largeurs, import JSON/ZIP et conservation des sources, recette documentaire et restauration complète des quatre binaires, six défauts de revue reproduits puis corrigés. Les 440 tests natifs/synchronisation passent. La campagne Contrats actuelle passe également.

Une seule campagne historique complète supplémentaire a été lancée avec `DOBBY_FINAL=1`, puis reprise au point d’arrêt pour collecter les résultats sans répéter ses premières étapes. Elle n’est pas présentée verte. Son premier contrôle Contrats de consolidation exigeait un ancien libellé et une illustration supprimée par la PR13 ; l’assertion a été alignée sur la liste Contrats déjà approuvée, sans changer le produit.

Huit échecs supplémentaires ont été reproduits à la même assertion/type/ligne sur un export intact de main `54d74b9448a1c518d8a3c483cd4deaea1e493748`, servi séparément à8899. Le fichier source de chaque test est identique au candidat ; les preuves et signatures sont dans [historical-baseline.json](evidence/tests/historical-baseline.json).

- e01-consolidation : attente d’un ancien texte de récurrence dans le formulaire Missions à étapes.
- e06 : assertion de géométrie sur une composition déjà identique dans main.
- e06-edge : message de quota simulé interceptant le clic.
- e07 : cinq destinations attendues alors que le dock en possède six.
- e07-1 : ancien kicker absent de l’interface actuelle.
- integrated-preview : ancien sélecteur d’affectation de mission dans la maquette intégrée.
- e04-runes : ancienne attente d’affectation implicite d’un participant.
- e02-edge : anciens adaptateurs de commandes partagées (même dictionnaire de huit échecs sur main).

La suite historique poursuit ses autres parcours ; les résultats additionnels et le bilan définitif sont dans la PR16 et l’artefact final remis à l’utilisateur. Aucun échec n’est supprimé, assoupli ou converti en succès. Aucun changement produit dans Missions/Runes, Auth, Cheminette ou Chat n’est effectué pour satisfaire des attentes historiques divergentes. Le contrôle P04 reste PARTIEL dans le bilan.
