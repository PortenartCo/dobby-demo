# RELEASE-01 · Fermeture des écritures d’invitation

Le candidat retire à `dobby_socle_writer` les deux grants directs `INSERT` et `UPDATE` sur `dobby_v7_private.invitations`. La décision est indépendante des fonctions détenues par ce rôle. En lecture seule, le relevé hébergé confirme que `postgres` possède la table et a accordé `INSERT`, `UPDATE` et `SELECT` directement, sans option de délégation. Aucune invitation valide en attente au relevé. [Commentaire technique](https://github.com/PortenartCo/dobby-demo/pull/36#issuecomment-7023503907) · [Relevé ciblé](00-releve.sql)

**Verdict · fermeture des invitations validée localement, bascule NO-GO.** Le relevé compte un compte Auth confirmé, non banni, sans liaison canonique ni adhésion active et avec un profil provisoire. Dans le code en service, `dobby_v7_create_household` utilise le writer V7 historique et ne dépend pas de la table des invitations. Son équivalent fictif a pu créer un foyer indépendant pendant la fermeture. Désactiver les nouvelles inscriptions laisse ce compte préexistant en place. Le propriétaire doit vérifier sa destination et valider le traitement du parcours indépendant avant d’autoriser un pilote limité à A/B. Les contrôles de reprise et la recette réelle A/B restent requis. [Plan de reprise](../README.md#point-de-reprise-avant-le-pilote)

## Preuves vérifiées

- Sur PostgreSQL 17.7 et PostgREST 14.18, les quatre RPC réussissent avant la fermeture, puis leurs nouvelles mutations sont refusées avec HTTP `403` et SQLSTATE `42501` sur la table `invitations`. Les invitations, reçus, liaisons, adhésions, profils provisoires, comptes et révisions sont identiques après chaque refus.
- Les rejeux historiques et les deux prévisualisations restent lisibles. Une acceptation déjà consommée avec un nouvel identifiant de requête échoue. La révocation individuelle échoue aussi. Les deux contextes A/B via jetons fictifs et une écriture Missions V2 réelle fonctionnent pendant la fermeture.
- Le script refuse une invitation valide et un droit direct sur une colonne. Il annule intégralement la révocation si un droit hérité laisse une écriture effective. Après restauration, les ACL correspondent exactement à l’état initial et les quatre opérations réussissent à nouveau.
- Les 11 empreintes des corps testés correspondent au relevé hébergé, après retrait des seuls retours chariot `CR`. La comparaison inclut les quatre RPC, les fonctions de prévisualisation et de révocation, leurs trois helpers et `dobby_v7_create_household`. Les corps SQL hébergés sont restés dans le projet. [Relevé reproductible](00-releve.sql)

## Comportement et effets secondaires

| Parcours | Effet attendu de la fermeture |
| --- | --- |
| Nouvelle création adulte | Refus de l’`INSERT` dans `invitations`. |
| Nouvelle création enfant | Refus du nettoyage des invitations expirées ou de l’`INSERT`. |
| Acceptation, adulte et enfant | `SELECT … FOR UPDATE` exige aussi un droit `UPDATE` sur au moins une colonne. Les deux acceptations sont donc refusées dès le verrouillage de l’invitation. PostgreSQL annule les effets éventuels de la requête. |
| Rejeu à opération identique | Les deux créations peuvent renvoyer le jeton déjà émis, les deux acceptations peuvent renvoyer un rattachement déjà confirmé. Le reçu existant ne crée aucun nouveau lien. Un nouvel identifiant d’acceptation d’un jeton consommé doit repasser par le verrouillage. |
| Prévisualisation adulte et enfant | `SELECT` reste disponible. Un jeton valide peut encore afficher son aperçu, tandis que son acceptation est bloquée. La bascule exige zéro invitation valide en attente. |
| Révocation individuelle | `dobby_v7_revoke_invitation` perd son `UPDATE`. La perte temporaire de cette commande doit être acceptée avant bascule. |
| Entrée A/B et Missions | Les fonctions de contexte et les écritures Missions utilisent leurs droits existants. La fermeture des inscriptions Auth se valide séparément. |
| Création indépendante | Une identité Auth existante au stade profil provisoire conserve le parcours de création d’un autre foyer. Le contrôle de ce périmètre reste à résoudre avant le pilote. |

Les quatre fonctions publiques conservent leurs ACL `EXECUTE` et leurs définitions. Un ancien client peut encore afficher les commandes calculées à partir de `canInvite`. Le refus intervient alors dans PostgreSQL. Les durées de validité et les lignes d’invitation restent d’origine. [PostgreSQL 17 · REVOKE](https://www.postgresql.org/docs/17/sql-revoke.html) · [PostgreSQL 17 · SELECT](https://www.postgresql.org/docs/17/sql-select.html)

## Procédure de bascule à faire valider

1. Faire vérifier le point de reprise réel et sa restauration isolée. Confirmer le périmètre des comptes Auth existants, traiter la décision sur le compte non lié, faire accepter la suspension de la révocation individuelle et choisir la fenêtre de recette. Les références d’identité restent privées.
2. Figer le SHA du candidat. Dans le projet DOBBY attendu, exécuter le [relevé ciblé](00-releve.sql) sous un accès autorisé. Comparer propriétaires, grants directs, droits effectifs table/colonnes, empreintes des fonctions et nombre d’invitations valides. Conserver les ACL avant opération. Tout écart dans les droits ou la présence d’une invitation valide bloque la bascule.
3. Après autorisation distincte, désactiver « Allow new users to sign up » dans Auth et contrôler `disable_signup=true` via `/auth/v1/settings`. Conserver le réglage avant intervention dans le journal privé. [Configuration Supabase Auth](https://supabase.com/docs/guides/auth/general-configuration)
4. Sous `postgres` propriétaire, jouer [01-fermer.sql](01-fermer.sql) avec arrêt sur erreur. Le verrou exclusif empêche une écriture concurrente de se glisser entre le contrôle des liens valides et le commit. Un timeout ou un échec de vérification annule la transaction. Maintenir la fenêtre fermée et requalifier le blocage avant tout nouvel essai.
5. Relire les métadonnées après commit. Les droits effectifs d’écriture, y compris sur les colonnes, doivent être faux, `SELECT` vrai, les ACL des quatre RPC et les empreintes identiques. Comparer les agrégats d’invitations, de liaisons, d’adhésions et de reçus avant/après. Lancer ensuite la seule recette A/B prévue après autorisation. Les canaris d’invitation restent fictifs et locaux. La publication exige toujours une décision humaine.

## Retour arrière

Le retour arrière de la transaction en cours est `ROLLBACK`. Après commit, [02-restaurer.sql](02-restaurer.sql) rétablit seulement les deux grants directs sans délégation. Exécuter ce retour après décision du propriétaire et comparaison de l’ACL courante à la preuve de fermeture. Contrôler l’égalité avec l’ACL d’origine et le maintien des liaisons et révisions. Le retour des grants réouvre création, acceptation et révocation individuelle. Les jetons encore valides redeviennent acceptables. La configuration Auth se décide séparément et ne suit pas le retour des ACL.

## Reproduction locale

Le test lance un PostgreSQL jetable et un PostgREST réel dans le même espace réseau sans interface externe ni port publié. La version PostgreSQL est épinglée à 17.7 et PostgREST à 14.18. Les images référencées par digest doivent être présentes dans Docker local. Le montage réutilise le socle suivi avec un modèle public du catalogue et du helper Auth. Les préflights d’empreintes historiques sont exclus du montage fictif. Les corps des RPC d’invitation testés sont ceux de la source suivie.

Le writer Missions V2 historique est lu dans Git au SHA `0a8e1ed674bc4abdbfaca29435fa495b19b32df4`. Récupérer ce commit depuis le dépôt DOBBY si l’objet manque dans le clone.

```sh
python3 docs/dobby-v7/release-01/invitations/test-local.py
```

La fixture vérifie d’abord que le verrou refuse une invitation valide en attente. Après une fermeture réelle avec zéro invitation valide, elle prolonge délibérément deux liens fictifs sous le propriétaire pour éprouver les refus sur des jetons valides. Cette exception de montage permet aussi de constater que le rollback réouvre leur acceptation. Les résultats ne certifient ni Auth hébergé ni un compte réel.
