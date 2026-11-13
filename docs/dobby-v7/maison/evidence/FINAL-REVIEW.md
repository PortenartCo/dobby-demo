# Revue indépendante et corrections causales

Révision examinée : 65042f9eda7d7f705d77a77a21d80db6e8ccb979, depuis54d74b9. Revue indépendante en lecture seule, aucun accès Supabase. Verdict initial : ne pas fusionner avant corrections ; aucun critique, quatre défauts importants et une divergence de limite d’import.

1. Ancienne restauration partielle remplaçant entièrement les fiches : API native restoreBackup additive, métadonnées/programmes/journal/fichiers conservés.
2. Restauration sans liaison au foyer/révision : tokens à l’aperçu et à l’écriture ; restauration complète contrôlée après attentes ; refus sans rétablir l’ancien état dans un nouveau foyer.
3. Ajout d’une facture pendant l’édition d’une intervention perdant son ID : session d’édition et baseline conservées, un seul log modifié.
4. Navigation Retour perdant un programme ajouté au brouillon : structure des programmes conservée avec les valeurs scalaires, sans persistance anticipée.
5. Nom121 caractères accepté par le transport mais refusé au stockage : limite120 alignée dans parser/prompt/documentation. Reclassé important car un lot valide pouvait être refusé après confirmation.

Les six cas correspondants ont échoué avant correction puis passé après correction dans maison-review-regressions.cjs. Preuves : tests/review-red.log, tests/review-green.log et tests/acceptance.log. Le writer ajoute ses cas de fusion/rollback ; la suite native/sync passe désormais 503/503. Les fixtures historiques natives sont inchangées ; une nouvelle preuve d’amendement exact Maison inverse uniquement la garde de restauration complète.

Points hors verdict initial, conservés explicitement : serveur réel/deux comptes et limite hébergée non inspectés ; PDF partagés, Missions automatiques des nouveaux programmes et notifications non promis ; contrôle binaire de format/dimensions/tailles sans prétention d’antivirus ; CI et publication vérifiées séparément après les corrections. Aucun point de revue restant n’est dissimulé par une seconde revue favorable ; les corrections reposent sur les reproductions causales et suites.

Contrôle supplémentaire après rapprochement de main : stockage saturé reproduit RED puis GREEN, avec annulation des tâches dérivées de save(). Le septième cas navigateur est native-save-side-effects-rollback ; preuves tests/native-effect-red.log et tests/native-effect-green.log. Les preuves de source PREP utilisent une nouvelle couche Maison exacte, les anciennes fixtures restent figées.
