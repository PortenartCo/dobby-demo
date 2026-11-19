# V7 sans ADMIN — correction locale du SQLSTATE 25006

19 novembre 2026 · PR #34 en brouillon · reprise de `598b008a4e627c02354978d083890f8164f37405`.

**FAISABLE SANS ADMIN V7 dans la recette locale publiée.** Les deux prévisualisations fonctionnent en READ ONLY et en HTTP GET/POST STABLE. La garde RLS protège directement les écritures et le replay, sans modification des fonctions détenues par V7. **La compatibilité hébergée et l’intégration Missions complète restent NON VÉRIFIÉES.**

[Résultats, SHA et empreintes](V7-GARDE-RESULTATS.json) · [Graphe](V7-GARDE-DEPENDANCES.json) · [Confidentialité](V7-GARDE-CONFIDENTIALITE.json) · [Revue](REVUE.md#correction-25006--garde-privée-directe) · [Diagnostic antérieur conservé](V7-SANS-ADMIN.md).

## Correction et privilèges

Les six policies `AS RESTRICTIVE FOR ALL TO dobby_v7_writer`, USING et WITH CHECK, appellent désormais directement `dobby_access_v7_gate.check_access()`. Elles couvrent `pending_profiles`, `account_links`, `operations`, `households`, `memberships` et `modules`. Le SELECT du reçu de replay est ainsi contrôlé avant tout retour anticipé.

La garde sans argument lie l’identité et la session courantes au registre d’autorisations, verrouille sa ligne SHARE NOWAIT puis appelle `assert_active()` : statut réel, session existante et borne de réactivation. Les claims anciens ou un statut actif forgé ne suffisent pas. Le propriétaire est le writer d’administration existant `dobby_access_writer`, NOLOGIN/NOSUPERUSER/NOBYPASSRLS. SECURITY DEFINER lui permet ce contrôle sans exposer le registre à V7 ; le `search_path` est vide et les noms sont qualifiés. Il n’appelle aucune table V7 protégée : pas de boucle RLS vers le contexte. L’isolation transitive des rôles est contrôlée avant les ouvertures temporaires de maintenance, à l’installation et au rollback.

Le delta V7 est **exactement deux ACL sans délégation** : USAGE du nouveau schéma privé, EXECUTE de son unique fonction. Aucun ADMIN, membership, SET, BYPASSRLS, accès Auth ou droit sur objet existant n’est ajouté à V7. Aucun nouveau droit pour anon/authenticated/service_role. Les ACL effectives, grantors, defaults globaux/par schéma et toutes les fonctions V7 (OID, définition, owner, ACL) sont contrôlés. Les defaults inattendus font refuser le paquet ; aucun n’est réparé silencieusement.

Le contexte et les deux prévisualisations restent STABLE et ne prennent plus ce verrou. Les triggers ciblés V7 conservent les contrôles de mutation, UPDATE NOWAIT du quota avant INSERT et consommation atomique après INSERT. La contention devient `40001`. Les autres writers gardent leurs exigences ADMIN. Les migrations historiques, 27 contrôles de catalogue, 21 paires hébergées approuvées et 12 références Missions sont inchangés.

## Preuves observées

Code testé : **`7345b8887595238a627fa2faa9acf5eb210b2dc8`**.

- PostgreSQL 17.7 isolé : **23/23**, zéro échec/omission. Profil provisoire puis foyer, quota unique, replay et conflit de payload `22023`, révisions/CAS `40001`, séparation familiale, anciens RPC, suspension/session invalidée/anciens claims sont couverts.
- Deux prévisualisations, invitations fictives valides/invalides : READ ONLY avant et après rollback ; contexte actif et trois volatilités STABLE vérifiés.
- PostgREST 14.18 réel, image épinglée : **27 réponses HTTP vérifiées**. Vingt GET/POST de lecture avant/après, profil autorisé, quatre réponses de révocation avec le même JWT, garde privée inaccessible, écriture refusée après rollback. Aucun mock HTTP. Clé et JWT fictifs éphémères non exportés.
- Concurrence réelle : SHARE du replay retenu jusqu’à fin de transaction, suspension concurrente bloquée ; contention de montée de verrou quota refusée `40001`, sans mutation.
- [CI PR](https://github.com/PortenartCo/dobby-demo/actions/runs/44577407372) et [CI push](https://github.com/PortenartCo/dobby-demo/actions/runs/44577395219) : **70/70**, zéro échec/omission ; les deux générateurs passent `--check`. Les 47 contrôles existants sont conservés. Campagne UI automatique annulée, aucun PASS UI revendiqué.

Les journaux [locaux](preuves/v7-garde-directe/v7-direct-final-local.log), [CI](preuves/v7-garde-directe/ci-pr.log) et les étapes RED sont conservés. Le RED initial démontre réellement `25006` ; il ne compte pas comme validation fonctionnelle. La revue a révélé trois lacunes de rollback/isolation, reproduites puis corrigées ; détails dans REVUE.md. Aucun défaut fonctionnel attendu n’est compté comme PASS final.

## Retour arrière et limites

Le rollback retire **tous les objets de la nouvelle garde et les deux droits V7**, sans perte des lignes contrôlées. Il vérifie d’abord journal privé, définitions/ACL, relations/RLS et graphe de rôles ; toute dérive testée provoque un refus transactionnel. Il place les six policies à false avant retrait. **Les fences et les wrappers Lot 2A restent : les écritures V7 sont fermées, les prévisualisations restent fonctionnelles.** Ce n’est pas la désinstallation du socle Lot 2A ni une réouverture des anciennes écritures.

La fixture publique n’a pas les douze corps privés Missions. Le paquet complet livré refuse cette absence ; les tests fonctionnels retirent uniquement leur contrôle de métadonnées en mémoire, sans stub ni option d’activation livrée. Le graphe natif de 16 fonctions est réutilisé ; le trigger Missions publié retourne sur `family`. Les versions/définitions hébergées restent à vérifier. La fixture Auth/session et son installateur historique BYPASSRLS ne prouvent pas les permissions Auth gérées ; le propriétaire de garde et V7 sont NOBYPASSRLS. Aucun GoTrue, SMTP ou Storage HTTP n’est retesté ici.

**Aucun accès Supabase hébergé, compte Parent A/B, migration historique, déploiement, fusion ou gate enfant modifié.** Toute utilisation hébergée exige un paquet d’intégration coordonné, les preuves Auth/Storage/Missions manquantes, sauvegarde/restauration et validation humaine de la bascule. L’exception de deux privilèges reste exclusivement locale.
