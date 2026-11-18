# Lot 2B Storage — plan d'exécution

**But :** reconstruire et éprouver localement le contrôle révocable Storage, puis sauvegarder la branche dans une PR brouillon.
**Spécification :** issue #19, conception PR #27, mission de reconstruction et CHECKPOINT-REPRISE.md.
**Architecture :** conserver le transport natif si les opérations SQL/RLS permettent de refuser l'accès courant et l'émission de nouvelles capacités signées. Démontrer séparément les capacités déjà signées ; ne pas présenter leur persistance comme une révocation réussie. Une passerelle n'est ajoutée que si une nécessité restante est démontrée dans le périmètre livré.
**Technologies :** Node.js natif, PostgreSQL 17 isolé, service Supabase Storage réel avec backend fichier jetable.

## Contraintes globales

- Aucun accès à Supabase distant ni aux comptes réels ; secrets locaux générés en mémoire, jamais publiés.
- Aucun ancien chemin exploré ; aucun écrasement de branche existante.
- Migrations Lots 1/2A et fichiers applicatifs inchangés.
- Aucun mock HTTP utilisé comme preuve physique, aucune nouvelle tentative sans hypothèse documentée.
- Distinguer toujours observations actuelles, historiques et essais non exécutés.

## Points de revue

Capacités signées antérieures ; RLS auth.sessions ; opérations et chemins Storage inconnus ; refus familial même pour l'administrateur ; autres buckets et rollback exact sans perte de fichiers.

## Étapes et interfaces

- [x] 1. Vérifier PR #29, isoler la branche, publier ce checkpoint sans données sensibles.
- [ ] 2. Reconstituer `tests/private-access/lot2b/local-storage.mjs` : démarrage/arrêt des seuls services locaux de la mission et exécution SQL ; réutiliser le catalogue publié sans ancien installateur.
- [ ] 3. Écrire `storage.test.mjs` avec contre-épreuves avant migration ; `native-transport.mjs` envoie exclusivement des requêtes HTTP au service local avec JWT fictifs.
- [ ] 4. Ajouter la candidate et le rollback selon les conventions `supabase/migrations` et `supabase/rollbacks`, avec préflight fermé et maintien des règles familiales. Vérifier les refus après suspension et les jetons déjà signés, sans prétendre les invalider par RLS.
- [ ] 5. Exécuter Storage réel et rollback ; rejouer Lot 2A et les tests natifs pertinents pour le point de composition modifié ; consigner commandes, versions, limites et preuves expurgées.
- [ ] 6. Revue indépendante, corrections justifiées, contrôle de confidentialité, push final et PR brouillon ciblant la branche de #29.

## Reprise

Chaque étape stable est sauvegardée par commit. Les journaux publiés ne contiennent ni JWT, liens signés, clés éphémères, contenus réels ni données personnelles. Consulter le rapport final pour les résultats réellement observés et les conditions bloquantes de déploiement.
