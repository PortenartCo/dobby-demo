# DOBBY V7 — finalisation du socle familial

Reprise du `main` réel `b77cb9de100a864c8aace8fb9e07053220ccd23a`, branche/worktree isolé. La recette réelle nominale des deux comptes, dont reconnexion B et choix magiques conservés, est acquise ; les cinquante points livrés ne sont pas rouverts.

- [Dix réserves et leurs preuves](MATRICE-RESERVES.md).
- [Livraison intégrée, CI et état de publication](LIVRAISON-SOCLE.md).
- [Diagnostic réel reçu](CATALOGUE-RECU.md), sans données brutes confidentielles publiées.
- **[Intervention manuelle regroupée](supabase/README.md)** : installation et catalogue confirmés, puis 38 contrôles DB/RPC hébergés réussis sous claims SQL simulés ; parcours HTTP/Auth encore nécessaires.
- [Contrôle HTTP 31 en lecture seule](recettes-http/README.md) : retour 31b partiel du seul Parent A, non PASS.
- [Cas Auth restants et iPhone/Safari physique](RECETTE-AUTH-MICRO.md).
- [Stockage et changement de compte](STOCKAGE-ET-CHANGEMENT-COMPTE.md) : protection conservée, aucune suppression silencieuse.
- [Audit initial et dépendances](ETAT-CODE-ET-DEPENDANCES.md), conservé comme état avant le catalogue.

**CODE_DÉVELOPPÉ / TESTS_PASS** : migrations et clients du socle, avec gates fermés. **INTÉGRÉ** : [PR #12](https://github.com/PortenartCo/dobby-demo/pull/12), SHA applicatif `43eef7a57a56fe352f88902dfe89b208a4036495`, arbre identique au head testé et quatre CI réussies. **DÉPLOYÉ** : 152 comparaisons GET et contrôle navigateur anonyme réussis ; la publication documentaire `54d74b9` conserve exactement cette application ([preuves et CI](LIVRAISON-SOCLE.md)).

L'installation et le [catalogue hébergé](evidence/hosted-installation-summary.json) sont confirmés. **RECETTE_RÉELLE_VALIDÉE, périmètre précis** : le nominal familial des deux Parents et la reconnexion B restent acquis ; le contrôle `30` a ensuite réussi **38/38 contrôles DB/RPC sur le serveur hébergé**, sous rôle et claims JWT simulés en SQL. [Douze tables observées sont identiques après annulation interne et le rôle SQL est restauré](evidence/hosted-runtime-summary.json). Cette preuve serveur n'est pas un login Auth HTTP ni un parcours UI connecté.

**Dernier retour HTTP 31b — partiel, non PASS :** pour le seul Parent A, Auth et contexte répondent **200**, le contexte est `active/parent` et les contrôles sujet/foyer/profil/marqueur local concordent. L'accès natif reste pourtant `nativeAccessVerified=false`, phase `unavailable` ([synthèse sans données personnelles](evidence/hosted-http-partial-summary.json)). B et le tiers n'ont pas été exécutés. Deux courses de démarrage avaient été observées : les vérifications concurrentes sont déjà sérialisées par `main` `25dd637` ; le correctif candidat retarde seulement `ready` jusqu'à la restauration du foyer. Ce candidat est validé localement et attend CI/publication. Aucun rétablissement chez l'utilisateur n'est confirmé avant une nouvelle preuve 31.

**BLOQUÉ** : frontières HTTP/Auth, acceptation UI, Storage physique et concurrence multi-session avant activation des nouveaux parcours ; Safari physique reste à recetter. Les flags et gates demeurent **false**, sans déclaration globale des nouvelles fonctions comme opérationnelles.

**Ne rejouer ni `00`, ni `10`, ni `11`, ni `20`, ni `30`.** Le troisième compte Auth de test a été créé et reste non lié après l'annulation ; ne pas le recréer. Les deux comptes et le foyer déjà validés sont conservés. La validation de `31` reste ouverte pendant l'examen du correctif ; aucun SQL d'activation n'est demandé. Aucun identifiant personnel, mot de passe ou jeton n'est demandé dans la conversation.

Aucun SQL distant par l'agent, aucun reset, aucune recréation de compte/foyer et aucun rejeu de Stitch 01/04/06/11. La suite du chantier suit les checkpoints serveur ; une preuve locale n'est pas un succès Supabase.
