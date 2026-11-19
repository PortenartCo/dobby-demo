# Lot 5C — lectures d’invitations corrigées localement

19 novembre 2026 · PR #34 en brouillon · reprise de `69c69c7ff38466d5964383153956ce781b8025be`.

**Correction locale validée : les 9 tests initiaux passent, ainsi que 5 contrôles supplémentaires, soit 14/14 sans omission.** Les deux invitations valides renvoient `valid` en READ ONLY. **La mise en service reste NO-GO** : scripts neutralisés, Missions intégral, restauration et compatibilité hébergée non validés par cette correction.

[Résultats/SHA](RESULTATS-LECTURES.json) · [Confidentialité](CONFIDENTIALITE-LECTURES.json) · [Revue](REVUE.md#correction-ciblée-des-lectures--revue-indépendante) · [Précontrôle initial](RAPPORT.md) · [Procédure future](PROCEDURE.md).

## Correctif limité à la variante

Le générateur Lot 5C dérive `dobby_access_private.assert_invitation_admission_read(text,text)` du corps historique figé. Ce helper privé STABLE conserve session courante, identité confirmée, destinataire, liaison nominative, état/expiration d’admission, générations, statut actuel du demandeur et gates enfants. Son contrôle du demandeur lit le même prédicat que `assert_requester`, sans verrou de ligne. Le preview privé appelle cette seule validation de lecture ; les RPC publiques, leurs corps, owners, ACL et contrats STABLE sont conservés.

Le propriétaire reste `dobby_access_writer`, existant et NOBYPASSRLS ; SECURITY DEFINER permet la lecture du registre via ses droits déjà présents. `search_path=''`, noms qualifiés, EXECUTE réservé au propriétaire et au seul `dobby_socle_writer`, selon la même séparation que la garde d’écriture existante. Cet appel interne n’ajoute aucun rôle, accès direct aux données/Auth, droit V7 ou mécanisme d’autorisation alternatif. Aucun paramètre ne permet de désactiver un contrôle sur le chemin d’acceptation.

L’acceptation conserve `assert_requester` et son FOR SHARE **inchangés**, prend ensuite SHARE sur l’admission et refait la validation complète après les éventuelles attentes. La suspension du demandeur et la révocation de l’admission restent bloquées pendant la mutation. Les verrous d’acteurs, sérialisation du compte, verrouillage canonique familial et revalidation native de l’acceptation sont conservés. La CI RED avait aussi reproduit une ancienne RPC acceptant une admission révoquée pendant son attente : le nouveau contrôle après verrou refuse ce cas.

Toutes ces adaptations sont dans `supabase/integration/lot5c/build.mjs`. La substitution utilise une fonction de remplacement littéral pour préserver les délimiteurs SQL `$$`. Les migrations historiques, les sources et tests Lot 5B, la garde directe V7, le harnais partagé et le raccordement Auth restent byte-identiques au SHA de reprise.

## Preuves observées

- Avant correction : test demandé exécuté en premier, **8/9**, deux traces 25006 sur les invitations valides. Nouveau checkpoint de contre-tests : **10/14 en CI**, avec les défauts de lecture et de revalidation démontrés avant modification du SQL.
- Après correction, PostgreSQL local 17.7 isolé : **14/14**, zéro échec/omission, dont les neuf tests d’origine. Les erreurs intermédiaires de montage/génération et un démarrage Docker expiré avant tout test sont consignés séparément.
- Matrice de **27 lectures READ ONLY** : valides, invalides, expirées, révoquées, autre destinataire, demandeur suspendu/génération périmée, génération du destinataire, session expirée, identité incorrecte/non confirmée, gates fermées. Aucun 25006.
- **48 refus d’acceptation** : 25 via RPC historique et 23 via commande d’admission, avec les bonnes préconditions de profil ; aucune acceptation non autorisée masquée par un simple profil manquant.
- Adultes/enfants autorisés : commande d’admission et anciennes RPC, replay/idempotence, révision d’admission consommée une fois, révision familiale parent +1/enfant inchangée, même résultat au replay, empreintes Missions et autre foyer inchangées.
- Concurrence physique à deux sessions : suspension bloquée après acceptation démarrée ; acceptation en attente puis refusée si suspension commise d’abord. Ancienne RPC refusée après révocation d’admission, déconfirmation d’identité ou invalidation de session commise pendant l’attente du verrou.
- ACL du helper privé, corps exact d’`assert_requester`, fonctions possédées par V7 et quatre sentinelles vérifiés. Aucun changement du fonctionnement de la garde directe V7.

La [CI d’intégration PR](https://github.com/PortenartCo/dobby-demo/actions/runs/44610682254) et la [CI push](https://github.com/PortenartCo/dobby-demo/actions/runs/44610661804) passent au code **`15499f4885ecbe728ac290f3d8c72f38b805eec9`** : **14/14, zéro omission**. Aucun composant partagé n’a été modifié ; aucune campagne supplémentaire n’a été lancée manuellement. Les workflows historiques automatiques ont fait l’objet de demandes d’annulation : la compatibilité du passage final était déjà terminée, son succès est consigné séparément des preuves ciblées. Le workflow d’intégration conserve un `node --test` normal, sans tolérance d’échec ou test omis. Les états exacts et les journaux sont dans RESULTATS-LECTURES.json.

## Réserves conservées

Les contrôles complets des douze dépendances privées Missions restent dans le paquet livré. La fixture fonctionnelle retire uniquement ce bloc de métadonnées en mémoire, sans stub ni option d’installation. Les empreintes du payload fictif Missions prouvent sa conservation lors des acceptations familiales ; elles ne prouvent pas le graphe Missions privé intégral.

La session/Auth est celle de la fixture PostgreSQL fictive ; aucun GoTrue, JWT cryptographique, HTTP Storage ou accès projet hébergé n’a été retesté. Les comptes/gates ouverts pour les essais sont exclusivement fictifs. Le défaut local est corrigé ; le précontrôle, la restauration coordonnée, les réserves de journal/package_id et les décisions Storage/sessions restent les conditions de la future bascule.

Les entrées 10/20/80/90 restent **des sentinelles seules, sans SQL mutable après l’erreur**. Leur message rappelle désormais les validations restantes. Aucun GO, migration, déploiement, fusion, SMTP externe ou compte réel Parent A/B modifié.
