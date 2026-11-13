# DOBBY V7 — finalisation du socle familial

Reprise du `main` réel `b77cb9de100a864c8aace8fb9e07053220ccd23a`, branche/worktree isolé. La recette réelle nominale des deux comptes, dont reconnexion B et choix magiques conservés, est acquise ; les cinquante points livrés ne sont pas rouverts.

- [Dix réserves et leurs preuves](MATRICE-RESERVES.md).
- [Livraison intégrée, CI et état de publication](LIVRAISON-SOCLE.md).
- [Diagnostic réel reçu](CATALOGUE-RECU.md), sans données brutes confidentielles publiées.
- **[Intervention manuelle regroupée](supabase/README.md)** : installation utilisateur Famille/Missions/Courses et Storage confirmée, contrôle du catalogue réussi ; recettes réelles encore nécessaires.
- [Cas Auth restants et iPhone/Safari physique](RECETTE-AUTH-MICRO.md).
- [Stockage et changement de compte](STOCKAGE-ET-CHANGEMENT-COMPTE.md) : protection conservée, aucune suppression silencieuse.
- [Audit initial et dépendances](ETAT-CODE-ET-DEPENDANCES.md), conservé comme état avant le catalogue.

**CODE_DÉVELOPPÉ / TESTS_PASS** : migrations et clients du socle, avec gates fermés. **INTÉGRÉ** : [PR #12](https://github.com/PortenartCo/dobby-demo/pull/12) fusionnée dans `main` au SHA `43eef7a57a56fe352f88902dfe89b208a4036495`, avec arbre identique au head testé et quatre CI réussies. **DÉPLOYÉ** : Pages a publié ce SHA ([run 43413328142](https://github.com/PortenartCo/dobby-demo/actions/runs/43413328142)) ; 152 comparaisons GET et le contrôle navigateur anonyme ont réussi ; [preuves et liens CI](LIVRAISON-SOCLE.md). **Installation utilisateur confirmée ; contrôle du catalogue réussi**, selon la [synthèse du retour hébergé](evidence/hosted-installation-summary.json). Cela ne certifie aucun nouveau parcours runtime ou Auth. **RECETTE_RÉELLE_VALIDÉE** : parcours nominal familial des deux Parents et reconnexion B déjà consignés dans `main`, sans extrapolation aux nouvelles fonctions. **BLOQUÉ** : recettes runtime/RPC/RLS/Auth réelles avant activation V3/F08/F09 et validation C07.

**Ne rejouer ni `10`, ni `11`, ni `20`, ni le diagnostic `00`.** La prochaine étape [30](supabase/30-runtime-rollback.sql), recette technique ciblée avec annulation interne observée puis `ROLLBACK` final, est prête ; voir sa [notice](supabase/RECETTE-SERVEUR-ROLLBACK.md). Elle nécessite un troisième compte Auth de test confirmé et non lié ; les deux comptes et le foyer déjà validés sont conservés. Aucun identifiant personnel, mot de passe ou jeton n'est demandé dans la conversation.

Aucun SQL distant par l'agent, aucun reset, aucune recréation de compte/foyer et aucun rejeu de Stitch 01/04/06/11. La suite du chantier suit les checkpoints serveur ; une preuve locale n'est pas un succès Supabase.
