# Exécution — Contrats & Assurances

- A audit : terminé, architecture et limites dans AUDIT.md.
- B modèle calendrier : implémenté, tests ciblés verts ; revue de cohérence writer/import effectuée.
- B persistance native et pièces : implémentées, tests natifs et fixtures verts ; permissions backend réelles non certifiées.
- B interface native : implémentée, cinq largeurs et champs/anciens formats testés.
- B import : terminé ; bornes de titre, associations sources et noms de fichiers corrigés après revue indépendante.
- C recette locale : terminée. Campagne ciblée finale : 51 tests unitaires, cinq largeurs, import JSON/ZIP, citations, droits Archives et dix scénarios limites ; régressions natives45/45 ; quatre tests existants Archives/Storage/Maison/navigation320/390 ; première campagne transversale19/19. Revue finale sans blocage.
- D intégration/publication : commits et PR autorisés ; CI, actualisation main et recette des octets hébergés à vérifier avant déclaration de publication.

Décisions d'exécution : cahier des charges déjà validé, pas de nouveau cycle d'approbation ; tâches indépendantes en parallèle avec propriété de fichiers distincte. Ni SQL ni droits distants modifiés. Les pièces remplacées conservent leur ancienne version. Les imports mis à jour conservent un historique de la fiche précédente et toutes ses pièces ; les associations provenance/document sont persistées.

Limite adoptée après revue : retrait des références sauvegardé avant nettoyage local ; les binaires serveur restent conservés et exigent une intervention distincte pour suppression physique. Aucun traitement automatique différé n’est annoncé.
