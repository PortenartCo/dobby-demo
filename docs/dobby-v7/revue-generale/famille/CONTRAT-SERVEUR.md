# Famille V7 — F08/F09 : contrat manuel avant activation

**État : ATTENTE_UTILISATEUR.** Aucun accès Supabase distant, migration, vérification Auth/RLS/RPC ni recette réelle à deux comptes n’a été exécuté par Codex. Les tests navigateur utilisent des personnes fictives et bloquent les requêtes externes. Un contrôle d’interface ou un test local ne prouve aucune autorisation serveur.

Pour la levée des réserves techniques postérieure à la revue générale, le point d’entrée est désormais [FAMILLE-ACCES.md](../../reserves-techniques/FAMILLE-ACCES.md) et son **diagnostic groupé de catalogue**. Ne pas demander d’exécuter séparément l’ancien `VERIFIER-PROFIL-EXISTANT.sql` ni rejouer les installations historiques. Stitch et la recette B sont clos ; les nouveaux accès enfants restent fermés.

## F08 — Donner accès à DOBBY au même enfant

Le bouton est volontairement désactivé (`data-backend-gate="child-account-link"`). Il n’appelle ni inscription, ni invitation générique, ni création d’un deuxième profil. Aucun âge n’accorde un accès ou un rôle parent automatiquement.

Le pack précédent contient déjà la **candidate non vérifiée** `public.dobby_v7_bind_existing_member(uuid,text,uuid)` dans `../../stitch19-20/supabase/01-apply.sql`. Elle requiert notamment un compte cible déjà membre actif du même foyer. Ce n’est pas un parcours complet d’invitation ciblée. L’acceptation générique existante crée un nouveau profil : **ne pas l’utiliser pour faire grandir un enfant existant**.

À fournir et tester côté serveur avant de brancher le bouton :

1. Une invitation ciblée associe un jeton opaque, une expiration et une consommation unique à `household_id` + **member_id existant**. Le parent appelant et le foyer sont déduits de `auth.uid()` et de son lien canonique, jamais acceptés à partir du seul client. La cible est un enfant, non un animal, et ne possède pas déjà de compte lié.
2. L’acceptation par le compte authentifié prend un verrou sur l’invitation, le profil et les liens ; revalide parent, foyer, expiration, consommation et unicité. Elle rattache ce compte au `member_id` visé dans la même transaction. Elle ne crée aucun nouveau membre, ne remplace pas le profil et ne transforme pas `child` en `parent`.
3. Elle conserve intégralement avatar, surnom, naissance, Maison, Patronus, missions, crédits de Runes et extensions d’historique. Une réponse confirmée inclut le même `member_id`, le foyer et sa révision. Rejouer la même opération renvoie le même résultat ; une cible déjà rattachée à un autre compte est refusée.
4. Ne pas ajouter de `canLinkExistingChild=true` dans le client avant une recette réelle réussie et un writer Auth/RPC implémenté. Le bouton reste désactivé dans cette livraison.

Le script `VERIFIER-PROFIL-EXISTANT.sql` prépare les vérifications en lecture seule sur le schéma candidat. Il doit être adapté et exécuté manuellement dans le seul projet personnel DOBBY après comparaison du catalogue réel. Aucun identifiant réel n’y figure.

## F09 — Parent et enfant

Le registre présenté par l’interface ne contient que le foyer courant. La politique locale exige une identité canonique vérifiée pour les écritures réelles. Elle refuse à un enfant toute modification d’identité, d’avatar, de catégorie et de création de membre, même si des permissions clientes trop larges lui sont accidentellement transmises. Elle autorise uniquement sa propre magie ; la validation de mission dépend du writer Missions. Un animal ne reçoit jamais de magie, même accompagné par un parent.

En démonstration explicitement fictive, le parent peut modifier tous les membres du registre courant. En mode réel, les anciennes restrictions serveur concernant un autre parent restent fermées : l’interface ne transforme pas une absence de support serveur en succès local.

Les candidates SQL antérieures autorisent principalement le propriétaire et ses dépendants non liés. Cela ne certifie pas le nouveau contrat « parent : toutes les données de SON foyer ». Avant activation, une migration revue doit :

- déduire le rôle parent/enfant du lien canonique et de la catégorie du profil, sans se fier à un champ fourni par le client ; les parents du même foyer peuvent gérer ses données, ceux d’un autre foyer sont refusés ;
- refuser à l’enfant INSERT/UPDATE/DELETE directs, remplacement de snapshot et RPC sur recettes, menus **y compris desserts**, courses, événements, préparatifs/modèles, notes, contacts, contrats, comptes et invitations ;
- réserver sa magie aux deux résultats du **même** `member_id`, sans permettre des champs d’identité ou des mutations d’autrui dans la même requête ;
- autoriser seulement une validation de mission éligible par occurrence, avec participants autorisés, total unique, partage déterministe, verrou, CAS et idempotence ; aucun crédit ou montant arbitraire par un enfant ;
- exclure les animaux des assignations, participations et bénéficiaires de Runes ;
- appliquer ces règles aux RPC et RLS/triggers, pas seulement à l’interface. Les échanges privés avec Dobby n’accordent aucune capacité supplémentaire.

La préparation transversale de la revue générale rassemble les candidats d’installation, vérification et retour arrière F09. Leur présence ne signifie pas leur installation.

## Recette réelle obligatoire, manuelle, à deux comptes et deux foyers

Avec des comptes de test explicitement autorisés, enregistrer d’abord les identifiants et révisions fictifs et exporter les snapshots nécessaires au retour arrière. Ne supprimer/réinitialiser aucun compte historique automatiquement.

| Acteur / action | Résultat exigé |
|---|---|
| Parent A, données de son foyer | Toutes les mutations métier prévues sont acceptées, dont un autre parent selon la politique installée |
| Parent A, foyer B (requête directe avec ID deviné) | Refus serveur et aucun changement dans B |
| Enfant A, propre Maison / propre Patronus | Accepté seulement sur son member_id et sans autre champ modifié |
| Enfant A, magie d’un autre membre / identité propre | Refus serveur, état identique |
| Enfant A, tous les writers partagés et requêtes REST directes | Refus serveur, état identique |
| Enfant A, mission autorisée, puis replay et concurrence | Une validation et un seul total réparti ; aucun double crédit |
| Enfant A, mission non autorisée / gain arbitraire / animal | Refus serveur, aucun crédit |
| Invitation enfant ciblée, acceptation, replay concurrent | Même member_id, nombre de membres inchangé, données préservées |
| Invitation ciblée expirée / révoquée / autre foyer / déjà liée | Refus sans mutation et sans nouveau profil |

## Retour arrière

Avant toute opération manuelle, conserver les définitions SQL réelles et les snapshots. Une migration de permissions se retire avec le rollback correspondant au candidat effectivement installé ; ne pas appliquer aveuglément le rollback d’un pack antérieur à un schéma différent. Pour une liaison enfant erronée : suspendre d’abord l’accès du compte cible ; une intervention privilégiée retire uniquement le lien et l’invitation ciblés après examen, sans supprimer le profil, les missions, Runes ou historiques. Rejouer les tests de refus et vérifier que le bouton reste désactivé. La réparation de comptes historiques exige un examen manuel séparé.
