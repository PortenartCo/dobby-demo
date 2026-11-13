# Missions V3 — validation locale du candidat exact

**CODE_DÉVELOPPÉ / TESTS_PASS**, au périmètre local ci-dessous. Aucun accès Supabase distant, installation réelle, compte Auth réel ou activation du client n'est revendiqué.

Le [résultat structuré](evidence/local-tests.json) porte sur une installation propre des fichiers Famille et Missions, leurs empreintes capturées **avant** installation et contrôlées **après** les tests :

- Famille : `f74c6913484d2c5914b8923058f268ab9edfb2579d92f49bc12723a7e43af5d7`.
- Missions : `5f8cca31d1e79a0fa6bb8e4134470bdc483b53da4683feb672d544e4d5bd2b3a`.

Environnement : PostgreSQL **17.7**, conteneur dédié `dobby-socle-missions-pg-20261113`, réseau `none`, aucun port publié. L'installation utilise une **connexion directe au rôle `postgres` non superuser**, conforme aux droits de maintenance vérifiés ; un simple `SET ROLE` depuis une session superuser aurait faussé les contrôles après `RESET ROLE` et n'est pas employé. Seuls la préparation de comptes fictifs et les contrôles internes du harness utilisent le superuser local de fixture.

La baseline reprend le modèle réellement reçu : tables/contraintes/RLS/grants, writer V2, treize helpers privés Missions dont les MD5 correspondent au retour utilisateur, acteur réparé 11 et trigger de révision réparé. Les définitions brutes et cette baseline restent **hors du dépôt public**. Aucun ancien test de campagne n'a été rejoué ; les données de test sont fictives.

## Dix-huit groupes de contrôles réussis

1. Création réelle locale des profils/foyers et invitation générique via RPC ; deux parents, enfant lié et autre foyer distinct.
2. Première opération V3 sur une mission V2 déjà terminée : changement de métadonnées sans nouveau crédit ni réécriture d'historique.
3. Gestion par le second parent ; événements V1/V2 et dates avec décalage horaire conservés, ainsi que les extensions de module, mission et crédit.
4. Refus enfant, extérieur, non lié, animal, ID retiré, doublon/absence de participants ; table directe, ancien RPC V2 et reçus privés protégés.
5. Un seul événement de 25, allocations 13 + 12 ; rejeu exact après réponse perdue ; UUID réutilisé par autre acteur/contenu refusé ; deuxième complétion sans gain.
6. Annulation de toute l'ancienne répartition, réouverture Parent seulement, nouvelle complétion au cycle suivant ; ancien reçu renvoie le module courant.
7. Solo, zéro, mission véritablement non attribuée gérée par le parent, aucun repli après attribution disparue ; ID TEXT de 120 caractères et tri UTF-16 Unicode conforme à JavaScript.
8. Deux transactions PostgreSQL concurrentes, même révision : un seul gain, un conflit CAS ; une Rune par occurrence native de récurrence.
9. Deux transactions avec même UUID et même intention : un effet et un rejeu, sans allocation partielle.
10. Dépassement numérique et erreur injectée **après l'UPDATE du module**, lors de l'insertion du reçu : module, crédit, révision et reçu entièrement annulés.
11. Compensation exacte des gains V1/V2, pas d'éligibilité rétroactive ; cycle V3 suivant d'une ancienne mission V2.
12. Ancienne activation V2 Parent toujours utilisable sur un foyer V2 ; downgrade/fallback d'un foyer V3 refusé, import de crédits par nouveau snapshot refusé.
13. UUID commun à V2/V3 : réutilisation dans les deux sens et concurrence entre protocoles refusent un second effet.
14. Altération des champs opaques historiques, réécriture de crédit et régression de version refusées sans mutation partielle.
15. Capabilities réservées au foyer canonique ; comptes non liés, autre foyer et argument de foyer absent refusés ; rôle fermé et alias original V2 inaccessible au navigateur.
16. Compte canonique inactif refusé ; une désactivation d'appartenance concurrente attend effectivement la fin de la transaction autorisée.
17. Futur protocole de ledger inconnu conservé, sans downgrade automatique ni perte.
18. Fichiers exacts de vérification en lecture seule et de rollback conservateur : données/reçus conservés, flag client fermé et nouveaux RPC révoqués.

La revue indépendante des fichiers de vérification et retour arrière n'a identifié aucun défaut prioritaire restant. La vérification utilise les **signatures exactes**, le MD5 de l'original V2 après normalisation de son seul nom d'alias et les permissions effectives ; elle ne transforme pas ces métadonnées en preuve de parcours réel.

Pour reproduire après préparation privée de la baseline et installation des deux candidats exacts :

```sh
python docs/dobby-v7/finalisation-socle/supabase/missions/tests/run-local.py \
  --installed-family-sha256 f74c6913484d2c5914b8923058f268ab9edfb2579d92f49bc12723a7e43af5d7 \
  --installed-missions-sha256 5f8cca31d1e79a0fa6bb8e4134470bdc483b53da4683feb672d544e4d5bd2b3a \
  --evidence docs/dobby-v7/finalisation-socle/supabase/missions/evidence/local-tests.json
```

Le harness exige une base de test fraîche et les empreintes des fichiers **effectivement installés** ; il ne réinitialise pas les données pour contourner un échec. Il nécessite le catalogue technique privé reçu et n'est pas annoncé comme une campagne CI publique indépendante de cette baseline.

**Limites réelles :** backend familial distant non installé/recetté par cette preuve, JWT/PostgREST et sessions navigateur réels non testés ici, gates frontend conservés. Les tests d'API sous rôles PostgreSQL fictifs ne remplacent pas la recette familiale après installation manuelle.
