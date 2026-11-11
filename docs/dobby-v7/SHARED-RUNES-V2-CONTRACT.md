# Missions partagées — contrat serveur V2

Proposition de développement, non appliquée au Supabase familial. Le registre unique reste `public.dobby_v2_modules.payload.runeCredits` ; aucune table de soldes, aucun second historique ni nouvelle infrastructure. Le moteur canonique reste `family-runes-core.mjs`.

## Accès existants et cible

Le schéma `dobby-v2-modules.sql` autorise aux membres actifs les lectures, `INSERT` et `UPDATE` des modules, par RLS. Son trigger incrémente les révisions mais ne protège pas le contenu du registre. Un `PATCH` ancien de `missions` pourrait donc écraser des événements V2.

La proposition `sql-proposals/dobby-shared-runes-v2.sql` ajoute un trigger **SECURITY INVOKER** pour `INSERT`, `UPDATE` et `DELETE`. Lorsqu'une ancienne ou nouvelle identité de ligne concerne `missions`, seul `current_user = dobby_missions_v2_writer` passe. Un ancien `PATCH`, un insert/upsert, une suppression autorisée par un changement futur de privilèges, un déplacement d'identité et les branches d'écriture d'un `MERGE` passent par ce contrôle. Les politiques et écritures des autres modules restent en place. Un client autorisé qui atteint la ligne reçoit `42501` et un message demandant la mise à jour ; les opérations déjà interdites par les privilèges/RLS peuvent être refusées avant le trigger.

Un RPC **SECURITY INVOKER** s'exécuterait sous `authenticated` : il serait refusé par le même contrôle ou obligerait à rendre ce contrôle contournable par ce rôle. Les deux RPC publics utilisent donc **SECURITY DEFINER**, possédés par un rôle dédié `NOLOGIN`, sans bypass RLS, sans privilège de gestion de rôles, non accessible par `SET ROLE` aux rôles clients. Aucun GUC ou contenu JWT personnalisable ne prouve l'autorisation d'écriture.

Toutes les fonctions fixent `search_path = ''` et qualifient leurs objets. Les RPC vérifient `auth.uid()` et la vraie ligne d'appartenance active en base ; aucune identité de profil familial n'est confondue avec l'UUID d'authentification. Le rôle écrivain possède uniquement les lectures nécessaires, les écritures Missions encadrées par RLS et l'insertion des reçus. Les fonctions privées et les reçus sont inaccessibles à `PUBLIC`, `anon` et `authenticated`. Seuls les deux RPC publics reçoivent `EXECUTE` pour `authenticated`.

PostgreSQL exige un privilège `UPDATE` pour prendre un verrou `FOR SHARE`. Un helper privé détenu par l'opérateur de migration verrouille uniquement l'appartenance active de `auth.uid()` au foyer demandé. Il ne modifie aucune appartenance et seul le rôle écrivain peut l'exécuter. Ainsi, le rôle écrivain ne reçoit aucun droit de modification des membres. Le rôle reçoit temporairement `CREATE` sur `public` pour le transfert de propriété des deux fonctions, puis ce droit est révoqué dans la transaction de migration.

## API

Détection en lecture, compatible avec un appel REST `GET` :

```sql
public.dobby_missions_v2_capabilities(p_household_id uuid) returns jsonb
```

Réponse d'un membre actif :

```json
{"protocol":2,"maxPayloadBytes":262144,"directWritesBlocked":true,"ledgerVersions":[1,2]}
```

Une absence, un refus ou un résultat non conforme conserve les protections clientes existantes. Une réponse simulée dans des tests ne prouve aucune activation réelle.

Écriture atomique :

```sql
public.dobby_missions_v2_write(
  p_household_id uuid,
  p_expected_revision bigint,
  p_operation_id uuid,
  p_payload jsonb
) returns jsonb
```

Le client crée et conserve durablement l'UUID, la révision attendue et le payload **avant** l'appel. Une reprise réutilise exactement ces valeurs tant que l'issue n'est pas connue.

```json
{
  "protocol": 2,
  "replayed": false,
  "operation": {"id":"UUID","revision":2,"digest":"SHA256 hex"},
  "module": {
    "module":"missions",
    "payload":{},
    "revision":2,
    "updated_at":"horodatage serveur"
  }
}
```

Les cinq clés de payload reconnues sont `autoTasks`, `manualMissions`, `runeCredits`, `runeRequests` et `runeLedgerVersion`. Les séries et occurrences sont les objets natifs inclus dans `manualMissions`, sans second registre de séries. Les extensions internes aux missions/règles sont conservées ; les champs d'événement de runes restent strictement ceux du moteur natif. Les limites d'intitulé et de bénéficiaire comptent les unités UTF-16 comme JavaScript, et les valeurs composées uniquement de blancs JavaScript sont refusées.

## Transaction, CAS et rejeu

Le serveur authentifie puis garde un verrou partagé sur l'appartenance active jusqu'au commit. Un verrou consultatif transactionnel propre au foyer/module sérialise aussi la première création, qui n'a encore aucune ligne à verrouiller. La ligne Missions existante est verrouillée `FOR UPDATE`. Les autres modules ne prennent pas ce verrou.

Le serveur recherche ensuite le reçu `(household_id, operation_id)`. Un reçu existant exige le même acteur, la même révision attendue et le même condensat du JSONB demandé. Il renvoie la confirmation originelle **et le module courant**, sans écriture ni nouvelle révision. Si un autre appareil a rouvert la mission entre confirmation et reprise, le rejeu renvoie cette réouverture courante : il ne remet pas l'ancien état terminé.

Sans reçu, `p_expected_revision` doit être la révision courante ; `0` désigne exclusivement une ligne absente. Une nouvelle opération valide écrit le snapshot, ses événements et son reçu dans la même transaction, avec la révision `expected + 1`. Le trigger natif de révision demeure utilisé. Une exception à n'importe quelle étape annule tout.

`dobby_runes_private.operations` contient uniquement l'UUID de foyer et d'opération, l'acteur, les révisions attendue/appliquée, le condensat et la date serveur. Aucun solde, événement ou snapshot n'y est copié. Les reçus restent conservés pour assurer l'idempotence ; toute future politique de rétention nécessite un contrat de reprise explicite.

| SQLSTATE | Signification | Réaction attendue |
|---|---|---|
| `40001` | Révision dépassée | Relire l'état courant ; conserver la file locale et réconcilier explicitement |
| `42501` | Identité/appartenance absente ou écriture directe incompatible | Conserver les opérations ; ne pas contourner le RPC |
| `22023` | UUID réutilisé avec un autre acteur, payload ou CAS | Refuser la réutilisation ; conserver la preuve et l'opération |
| `23514` | Modèle, historique, transition ou capacité invalide | Aucun commit ; afficher le refus et garder la file |

Une panne réseau après le commit ne prouve pas un échec serveur : le client rejoue le même UUID avant de construire une autre opération.

## Invariants du registre

- Les dates d'événement acceptent la forme ISO `YYYY-MM-DDTHH:mm:ss` (année sur quatre chiffres), avec fraction optionnelle de une à trois décimales et zone explicite `Z` ou décalage `±HH:mm` valide pour JavaScript. Les historiques V1 sans millisecondes, par exemple `2026-11-11T12:00:00Z`, sont conservés strictement à l'identique. La validation vérifie séparément les champs calendaires et la syntaxe du décalage, sans normaliser la valeur stockée. Les mots PostgreSQL tels que `now`, les secondes intercalaires et les heures `24:00` sont refusés. Un historique incompatible est signalé par le précontrôle, sans réécriture. Les crédits déjà présents sur le serveur sont confirmés par leur provenance, même s'ils portent historiquement `revision: 0`. Ils doivent tous être retransmis strictement identiques, y compris date, intitulé et révision. Aucun ajout direct dans `runeCredits` n'est accepté après création.
- Les nouveaux événements arrivent dans `runeRequests`. Le serveur leur attribue la révision de la transaction puis renvoie une file vide. Un événement déjà confirmé et rejoué avec le même gain est dédupliqué ; une date ou un titre différents dans la demande ne réécrivent jamais le confirmé. Un gain contradictoire est refusé.
- Un crédit V1 conserve son identité native `missionId` et représente le gain implicite du cycle zéro. Les événements V2 utilisent `missionId~cycle~grant` ou `missionId~cycle~reversal`. Un gain V1 et un gain explicite du même cycle ne peuvent coexister.
- Les cycles commencent à zéro et sont continus. Un cycle suivant exige l'annulation du précédent. Une annulation référence un gain existant et copie exactement bénéficiaire, effort, montant et présence/valeur du montant personnalisé. La date n'ordonne pas les cycles.
- Un seul gain reste actif par mission ou occurrence. Un gain personnalisé de zéro est bien actif et exige son annulation avant le cycle suivant.
- Les montants, cycles, confirmations et révisions restent des entiers natifs représentables ; montants et totaux actifs par membre ne dépassent pas `Number.MAX_SAFE_INTEGER`. Une longue histoire de gains annulés n'est pas sommée comme un solde.
- Le statut final et les événements sont cohérents : une mission ouverte ne conserve pas de gain actif ; une nouvelle complétion éligible exige un gain. Une suite hors ligne gain → annulation → gain reste possible dans un seul appel, même si le statut initial et final sont identiques.
- Une modification de récompense ou de bénéficiaire **après confirmation** ne modifie jamais l'ancien crédit. L'annulation reprend ce crédit ; la nouvelle complétion utilise les paramètres actuels.
- Le marqueur `rewardVersion` existant ne peut pas être retiré ; les anciennes missions sans ce marqueur ne deviennent pas rétroactivement éligibles. Les règles historiques de récurrence restent un préfixe inchangé ; les identités, échéances des racines et anciennes occurrences sont préservées. Chaque occurrence possède son propre historique. Une nouvelle occurrence doit référencer une vraie racine de série présente dans le snapshot ; les anciennes occurrences orphelines restent conservées. Le serveur ne recalcule ni la projection ni les jours correspondants aux règles, et n'impose pas la fenêtre glissante de trente jours : une occurrence légitime peut revenir après une longue déconnexion.
- La suppression native d'une mission ordinaire garde ses crédits existants ; elle n'invente pas d'annulation. Une nouvelle demande pour une mission absente est refusée. Les racines/occurrences récurrentes historiques ne sont pas supprimées par un snapshot.
- Le payload confirmé est annoncé V2 après une écriture V2, même s'il ne contient encore qu'un historique V1 ou aucun événement. Une réponse client demandant V1 ne fait jamais rétrograder le résultat.

## Adoption et limites explicites

La création `expected_revision = 0` autorise une adoption contrôlée de l'historique natif local fourni dans `runeCredits`, après validation de sa forme, de ses cycles et limites numériques. Les identifiants, dates, titres et révisions historiques sont conservés ; aucun événement n'est recalculé. Cette exception s'applique uniquement lorsqu'il n'existe encore aucune ligne Missions. Une réactivation d'un foyer ayant déjà cette ligne doit reprendre son registre confirmé ; un cache vide n'est pas une preuve permettant de l'écraser. Le serveur ne peut pas prouver rétrospectivement la provenance d'un historique purement local : l'adoption initiale est une frontière de confiance documentée.

Le contrat reste un snapshot natif avec demandes de récompenses, sans journal parallèle de tous les changements de paramètres. Par conséquent, chaque **nouveau gain en attente** doit correspondre à la mission actuelle (bénéficiaire, effort, montant personnalisé). Une complétion hors ligne suivie d'un changement de ces paramètres avant confirmation est refusée atomiquement, même si un tel historique a pu être légitime localement. Le client conserve la file et empêche les changements de paramètres pendant un gain partagé en attente ; il empêche la suppression tant qu'un gain ou une annulation reste en attente. Il ne faut pas présenter ce cas composé comme pris en charge. Une demande locale orpheline, pour une mission disparue avant synchronisation, est également refusée sans perte. Le serveur valide le bénéficiaire par la mission, sans consulter un second référentiel de profils. Si un profil a disparu alors qu'une mission reste assignée, le moteur local peut produire une complétion sans demande ; le serveur la refuse sans perte. Réassigner ou désassigner la mission avant de la terminer résout cet état. Le comportement purement local reste natif.

La limite existante demeure **262144 octets de représentation JSONB**. Elle est vérifiée sur l'entrée et le résultat avec confirmations serveur. Un dépassement refuse intégralement l'opération ; aucune troncature, compression destructive ou suppression de crédits n'est effectuée. La croissance future du registre ou des reçus nécessitera une évolution distincte, avec sauvegarde et compatibilité explicites.

## Migration et retour arrière

La proposition s'exécute dans une seule transaction, recrée ses fonctions/politiques/triggers de façon rejouable et valide les payloads Missions existants sans les réécrire. Une incompatibilité préexistante fait échouer la transaction complète et exige une revue, jamais une réparation silencieuse. Les rôles clients ne doivent pas hériter du rôle écrivain ; la migration refuse cet état. Seul l'opérateur privilégié de migration reçoit ce rôle pour la maintenance contrôlée.

Sauvegarder schéma, politiques, privilèges et données Missions/reçus avant activation réelle. Le retour arrière sûr conserve les payloads et reçus V2, arrête les écritures Missions et remet le client en mode de protection ; il ne réactive pas les anciens `PATCH` sur un registre déjà V2 et ne réécrit aucun crédit. Le runbook de livraison détaille la procédure d'activation et les validations humaines. Aucune commande de cette proposition n'a été exécutée sur le Supabase familial réel.
