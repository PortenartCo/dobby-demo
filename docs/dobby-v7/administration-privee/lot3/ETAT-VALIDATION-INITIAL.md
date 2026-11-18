# Checkpoint contrats et tests initiaux — Lot 3

Point de sauvegarde intermédiaire du 18 novembre 2026, pas une déclaration de fin.

- Base #30 vérifiée : `24ab5b7944c34c9f29ede5867f4715111b5c2f47` ; checkpoint initial `725a306`.
- Composition du catalogue par défaut : 6/6 tests ciblés PASS après adaptation causale pour Auth réel.
- Client callbacks/transports : 186/186 tests ciblés PASS, avec des transports fictifs pour cette suite.
- Épreuve Chromium physique : un test, deux parcours avec GoTrue/PostgREST/SMTP réels et contextes isolés, PASS. Harnais HTML minimal des modules livrés ; pas la page familiale complète ni la console.
- Première intégration métier réelle : 10/13 PASS, trois échecs identifiés. Deux reprises d'envoi sur compte invité non confirmé et le rollback à cause des droits REVOKE du rôle applicatif fermé sont en correction.

Le checkpoint conserve les contrats et tests avant publication de l'implémentation serveur complète. Les tests qui importent les modules nouveaux doivent être lus avec le commit d'implémentation suivant. Les résultats définitifs, étapes de reprise, réserves et preuves expurgées seront dans RAPPORT.md/RESULTATS.json.

Aucun compte, e-mail ou projet réel utilisé. Aucun changement Supabase hébergé ni migration historique modifiée. Les limites du Lot 2B et la fermeture des gates de production restent inchangées.
