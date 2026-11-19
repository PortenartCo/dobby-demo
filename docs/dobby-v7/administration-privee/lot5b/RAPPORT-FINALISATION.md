# Lot 5B — Catalogue qualifié, mise en service toujours bloquée

Finalisation du 19 novembre 2026 · PR #34, empilée sur #33.
Base de cette finalisation : `8b7fd82d1bcad199535cdf1813ea6ee89b364952`.

**Les 21 divergences textuelles sont qualifiées par les nouvelles preuves rapportées de ChatGPT ; les adaptations locales restent candidates.** Aucune lecture ou écriture Supabase distante n’a été effectuée pendant cette finalisation. Les corps privés n’ont pas été obtenus par CODEX. Le refus du connecteur lors de la première phase reste une preuve historique, sans nouvelle tentative ici.

[Matrice des 27 signatures et 12 dépendances](MATRICE-FONCTIONS.md) · [Réconciliation structurée](RECONCILIATION.json) · [Tests et SHA](RESULTATS-FINALISATION.json) · [Réserves et action V7](LECTURES-FINALISATION.md) · [Revue](REVUE.md) · [Confidentialité](CONFIDENTIALITE-FINALISATION.json).

## Catalogue et ACL

ChatGPT rapporte : 27 signatures présentes ; les 21 corps différents sont équivalents lexicalement aux sources publiées en préservant les littéraux ; owners, SECURITY DEFINER, langages, volatilités, configurations et arguments correspondent. Pour `dobby_v2_modules_stamp`, la comparaison inclut précisément la correction explicite du harnais `lot2a/catalog.mjs`. CODEX ne présente aucune de ces comparaisons comme une exécution personnelle.

Les 21 paires exactes corps/définition reçues sont reconnues **en plus** des 27 paires de référence, sans mélanger deux paires. Pour les six autres fonctions, aucune nouvelle empreinte serveur de définition n’a été fournie : seule la paire publiée est reconnue. Aucun normaliseur lexical n’est utilisé lors du précontrôle. Un corps, owner, attribut, ACL ou droit hérité supplémentaire non approuvé fait refuser la variante.

Les 12 empreintes `pg_get_functiondef` Missions du manifeste public sont réutilisées ; leur correspondance hébergée est rapportée par ChatGPT. Les corps restent absents de la fixture locale et aucun stub ne les remplace.

L’unique écart d’ACL rapporté concerne le stamper : SECURITY INVOKER, retour `trigger`, déclencheur attaché, EXECUTE anon/authenticated. Deux ACL exactes sont reconnues, sans PUBLIC, grant option ou autre rôle. L’attache active est exigée. La preuve PostgreSQL locale sur la définition publiée montre que l’appel direct est refusé et qu’une révocation directe optionnelle ne casse pas le trigger déjà attaché. **Aucun changement d’ACL n’est imposé.** Une révocation ciblée est un durcissement facultatif à valider après inspection des grants réels et usages de création de triggers ; la variante conserve l’état métier existant. Voir aussi [CREATE TRIGGER PG17](https://www.postgresql.org/docs/17/sql-createtrigger.html).

## Adaptations locales livrées

La [liste fermée](../../../../supabase/compatibility/lot5b/approved-catalogue.json) génère quatre [artefacts SQL séparés](../../../../supabase/compatibility/lot5b/README.md) : précontrôle des 27 fonctions, précontrôle des 12 Missions, variante candidate Lot 2A et rollback compatible. `build-variants.mjs --check` refuse un artefact périmé et épingle les deux sources historiques par SHA256.

La candidate remplace seulement la condition des anciennes empreintes par la reconnaissance de paires explicites et ajoute les contrôles d’attributs/ACL, Missions et rôles avant les écritures. Le reste du wrapping, les gardes applicatives, verrous, RLS, sauvegardes et fermeture des grants restent ceux du Lot 2A. Le rollback borne les 27 définitions restaurables à leurs empreintes approuvées et vérifie les propriétaires sauvegardés et courants ainsi que les permissions avant tout grant temporaire. Il ne réinstalle pas les sources natives et n’ajoute pas de CASCADE.

Les quatre migrations historiques et leurs rollbacks sont inchangés. Les candidats Auth et le préflight de rôles de la première phase sont réutilisés sans modification ni activation. Le bridge Auth reste non raccordé aux helpers/activateurs ; la variante de catalogue ne résout pas cette intégration ni le manifeste Storage qui épingle le helper historique.

## Preuves réellement exécutées

Les tests ciblés sont dans `tests/private-access/lot5b/catalogue.test.mjs`, sur PostgreSQL réel 17.7 isolé : paires acceptées/refusées sur un canari fictif, littéral modifié, owner/attribut/ACL non conforme, attache du stamper, effet optionnel d’une révocation, refus du paquet complet sans les 12 dépendances et refus de sauvegarde falsifiée au rollback.

**Le contrôle du wrapping et du rollback est partiel** : après vérification du refus du paquet complet, le test retire en mémoire la seule garde Missions pour exercer les fonctions publiées disponibles. Ce retrait n’existe dans aucun artefact livré. Il vérifie les copies exactes des corps, la conservation des lignes fictives et le retour à l’état initial. Il ne prouve ni les écritures Missions complètes ni l’intégration hébergée. Le harnais historique réutilisé suppose BYPASSRLS pour son installateur fictif ; ce n’est aucunement une preuve des droits Auth réels.

Les résultats exacts, journaux RED/GREEN, limites et CI sont dans [RESULTATS-FINALISATION.json](RESULTATS-FINALISATION.json). Les preuves initiales et leurs échecs expliqués sont conservés. Aucune campagne HTTP Storage, GoTrue/SMTP ou recette de comptes réels n’est relancée. GitHub a déclenché automatiquement la campagne UI historique sur l’événement PR : elle a été annulée, puisqu’aucun changement UI ne justifie ce rejeu. Son état final est consigné séparément et n’est pas présenté comme une validation ciblée.

Résultat local ciblé : **13/13** après correction. La [CI de compatibilité](https://github.com/PortenartCo/dobby-demo/actions/runs/44546380939) du code `e59b0a7ea67cdbadb93a76bcf5a1f210d70cd0c0` observe **47/47**, zéro omission : 13 nouveaux contrôles et les 34 du workflow Lot 5B existant. Les artefacts générés passent aussi `--check`. Le commit documentaire final porte `[skip ci]` ; les huit fichiers code/test/workflow sont identiques à ce code testé, sans revendiquer de nouvelle CI sur le SHA documentaire.

## Blocages persistants et prochaine action

1. **ADMIN V7** : l’attribution fermée manque selon la preuve reçue. Transmettre au propriétaire du projet/support Supabase la demande bornée de [LECTURES-FINALISATION.md](LECTURES-FINALISATION.md) : identifier le délégant légitime, puis faire valider la seule attribution ADMIN fermée si une voie supportée existe. `postgres` ne peut pas se donner ce droit ; aucun rôle géré n’est usurpé.
2. **Auth et Storage hébergés** : prouver la visibilité Auth effective de l’installateur, les capacités gérées, la délégation `supautils.policy_grants`, locks/TEMP/helpers. L’absence de CREATE Storage n’est pas seule un blocage de CREATE POLICY. Aucune preuve d’exécution hébergée ajoutée ici.
3. **Fixture privée et raccordement** : disposer légalement de la fixture privée complète pour la recette intégrale ; coordonner les helpers/activateurs et empreintes Storage avec le candidat Auth, puis valider le paquet exact.
4. **Capacités signées et restauration** : conserver la réserve sur anciens liens/jetons et caches ; décider extinction vérifiable ou révocation contrôlée de la clé URL Storage avec impacts. Sauvegarde privée DB **et octets Storage**, manifeste du foyer et Parent A/B, restauration testée et ingress fermé avant rollback selon le [plan Lot 5A](../lot5a/PLAN-BASCULE.md).

Le retour Lot 2A restaure les API natives : il exige une maintenance à ingress fermé et une revue de tout changement postérieur pour éviter d’écraser un correctif récent. RESTRICT ne détecte que les dépendances cataloguées ; les consommateurs textuels doivent être coordonnés. Sérialiser les changements de rôles/DDL et vérifier les postconditions lors d’une future maintenance approuvée.

**Aucune migration, activation, fusion, modification de compte/policy distante, rotation, suppression de fichier, e-mail réel, déploiement ou ouverture de gate enfant.** L’ordre futur reste : autorité V7 et droits gérés → fixture complète et paquet cohérent → sauvegarde/restauration et capacités signées → validation humaine du paquet exact → éventuelle phase de migration distincte.
