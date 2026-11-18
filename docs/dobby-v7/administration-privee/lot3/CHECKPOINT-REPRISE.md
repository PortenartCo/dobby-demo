# Lot 3 — checkpoint initial

18 novembre 2026. Mission de développement/validation locale des comptes et invitations, sans déploiement.

- Dépôt : `PortenartCo/dobby-demo`.
- Base obligatoire PR #30, HEAD vérifié via Git et API : `24ab5b7944c34c9f29ede5867f4715111b5c2f47`.
- Branche dédiée : `feat/dobby-private-access-lot3-20261118-18kuxi7q`, nouveau worktree isolé.
- Dépendances #29/#28 ; issue #19 ; conception et plan lus au commit documentaire `440cc2394c2dd5e9865a9b71fcd17b43e351f034` sans fusion de cette branche.
- Aucun AGENTS.md applicable trouvé dans le dépôt ou les parents.

## Périmètre autorisé

Backend Edge `dobby-access-admin`, validation/Auth Admin isolés, nouvelles migrations et RPC, callbacks d'invitation/login explicitement confirmés, saga de livraison idempotente, tests sur GoTrue/SMTP/PostgREST locaux avec comptes fictifs. Pas de console Lot 4. Les anciennes migrations, effets saisonniers et comptes réels restent inchangés.

Les schémas/contracts des Lots 1/2A/2B ont été relus au delta nécessaire : admissions sans révision ni ledger de livraison ; consommateurs V7 actuellement réservés aux actifs ; callbacks PKCE existants ; absence de capture de token_hash. Les gardes existantes sont conservées et complétées, sans droit familial de lecture pour le propriétaire global.

## État initial des preuves

Aucun scénario Lot 3 déclaré PASS à ce checkpoint. Le runtime local GoTrue, l'inbox fictive et PostgREST sont en préparation ; leur simple disponibilité ne prouve pas les parcours métier. Les résultats antérieurs des autres lots ne sont pas transférés à ce lot.

Les réserves Lot 2B restent intactes : anciens liens et jetons d'upload signés non révoqués par RLS ; visibilité réelle des sessions Auth sous RLS non certifiée pour l'hébergement.

## Sauvegarde et limites

Sauvegarder les contrats/tests, puis serveur/migrations, puis intégration/résultats/revue sur cette seule branche, après contrôle de confidentialité. Livrer une nouvelle PR brouillon empilée sur #30, jamais une fusion ni une publication applicative. Aucun accès Supabase hébergé ni e-mail réel. Toute capacité Auth indisponible est signalée BLOCKED avec preuve ; aucune promotion ni contournement de permissions gérées.
