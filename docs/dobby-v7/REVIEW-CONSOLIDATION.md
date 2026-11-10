# DOBBY — Registre de revue et intégration E01–E08

État au 10 novembre 2026. Ce fichier consigne des décisions de revue utilisateur et des limites, sans déclarer les corrections réalisées.

## Contrat de revue
- Référence : pages reconstruites progressivement E01–E08, **pas** le raccordement historique des 53 maquettes Stitch.
- Ne plus faire valider une interface ancienne à la place d'une page reconstruite.
- Fournir une application de démonstration **unique** assemblant les versions reconstruites E01 à E08, avec navigation et boutons testables, avant de reprendre la revue globale.
- Les tests automatisés ne remplacent ni la revue visuelle de l'utilisateur ni les essais authentifiés de partage familial.
- Revue bloquée tant que E03, E06 et E08 ne figurent pas dans l'aperçu commun ; conserver E07.2 et la filiation E04–E05.

## Corrections et arbitrages déjà décidés
| Périmètre | Décision de revue | État |
|---|---|---|
| E01 Accueil | Harmoniser les états vides « Missions du Jour » et « Gazette des Curiosités » sur la mise en forme du « Festin du Soir » (titre mis en évidence, sous-texte, sans encadré pointillé) | À appliquer, non livré dans la démo actuelle |
| E03 Missions | Dans le hero, supprimer « Tome VII · Rayon D » et remplacer par « Grimoire des Missions » en bas à droite ; retirer l'ancien cartouche haut gauche | À appliquer |
| E03 Missions | Le vieux registre Missions montré dans l'aperçu E07.2 ne doit plus être soumis à revue ; lui substituer la branche E03 reconstruite | Intégration requise |
| E05 Profil magique | Le membre de démo devrait accéder naturellement à son profil sans état ambigu « aucun profil associé », tout en restant sans authentification réelle | À vérifier sur aperçu intégré |
| E05 Maison | Reprendre les blasons des quatre Maisons : animal et héraldique plus reconnaissables et détaillés ; conserver l'univers visuel retenu | À appliquer (design) |
| E05 Maison & Patronus | Ajouter une brève description narrative des caractéristiques/symboles de chaque Maison et Patronus, sans profilage psychologique | À appliquer |
| E05 / E06 | Raccorder « Refaire le test » aux questionnaires E06 pour Maison et Patronus ; aucune perte des choix avant confirmation | Intégration et test requis |
| E05 Runes | Retravailler la présentation : rune réellement illustrée selon le grade, jauge plus qualitative, historique lisible ; conserver les règles de gains et seuils existants | À appliquer (design) |
| E07 Courses | « 1 articles » doit être accordé en « 1 article » | À appliquer |
| E07.1 Taverne & E07.2 Courses | Deux pages à revoir en fonctionnement réel après intégration, malgré leurs tests et captures réussis | Revue utilisateur obligatoire |
| E08 Contrats | Interface acceptée en revue ; corriger plus tard « 1 contrats et assurances enregistrés » sans intervention Codex isolée | Accepté visuellement, non-régression à contrôler |

## Limites à ne pas présenter comme validées
- L'aperçu E07.2 est un environnement fictif isolé ; il n'atteste pas la synchronisation entre deux vrais comptes familiaux.
- E06 comprend des limites documentées sur la liaison vérifiée compte–foyer–membre et certaines opérations de création/invitation ; ne pas simuler ces étapes.
- Les pages familiales de l'ancien raccordement qui n'ont pas été reconstruites ne doivent pas être affichées comme pages finales ; rendre cette limite visible sans inventer une nouvelle interface métier.
- Aucune fusion des branches applicatives dans main ni migration Supabase n'a été approuvée.

## Références techniques de départ
- Intégration : branche feat/dobby-e01-e08-review-integration créée depuis E07.2 bba5b0255acc4834dbd54303df66c61decbed546.
- E03 : feat/dobby-e03-missions @ 6a86ead6341eb2f17e7552852621c21f496ad97c.
- E04 runes : feat/dobby-e04-runes @ 8bcd49c1c2250879e2fd5a96641cd77747ef9ea0 ; intégrée à E05.
- E05 : feat/dobby-e05-magic-profile @ 8418682e5094b66ee879fbf18dcd1e6a3b6d5a05.
- E06 : feat/dobby-e06-onboarding @ 1a71f9608dd29514e8fdc5743f7041aeccf5c4ab.
- E07.2 : feat/dobby-e07-cuisine-courses @ bba5b0255acc4834dbd54303df66c61decbed546.
- E08 : feat/dobby-e08-contrats @ cb937d48d136561c826a2adc707692fb00c6faf1.