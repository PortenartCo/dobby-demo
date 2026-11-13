# Missions / Runes V3 — contrat manuel, non installé

État : **ATTENTE_UTILISATEUR** pour le partage de l’attribution multiple et la
distribution entre participants. Aucun accès Supabase ni exécution distante n’a
été effectué par Codex. Les calculs JavaScript et leurs fixtures locales ne
certifient ni RPC, ni RLS, ni comptes réels. Le gate de distribution partagée reste
fermé ; le writer V2 existant n’est ni remplacé ni déclaré compatible V3.

## État connu et limite de préparation

Le catalogue local de référence contient `public.dobby_v2_modules` (payload JSON
par foyer/module), `public.dobby_v2_memberships`,
`public.dobby_missions_v2_write(uuid,bigint,uuid,jsonb)`, les capacités V2,
`dobby_runes_private.operations` et le trigger `dobby_missions_v2_guard`. Le writer
V2 est propriétaire `dobby_missions_v2_writer`, rôle technique fermé. Le diagnostic
historique ne contenait **pas** les corps privés réels de `guard_missions`,
`assert_payload`, `assert_ledger` et de leurs dépendances. La fixture utilise un
guard annoncé comme stub. Les nouvelles protections parent/enfant doivent être
traitées avec le lot de permissions de la revue, avant toute activation V3.

Par conséquent, aucun faux `CREATE FUNCTION` V3 ni remplacement aveugle de ces
helpers n’est livré. Les trois SQL joints sont des **contrôles en lecture seule**.
Ils ne constituent pas une migration V3. Une implémentation SQL V3 complète et
testée sur une copie locale du catalogue réel demeure nécessaire ; son absence
est un travail explicite restant, pas une installation à exécuter telle quelle.

## Contrat métier à imposer au serveur

1. Résoudre l’acteur par l’identité Auth canonique et sa liaison native existante,
   avec appartenance active au même foyer. Ne jamais déduire un parent d’un nom,
   de l’ordre des profils, d’un identifiant envoyé par le client ou du seul rôle
   historique `owner/member`. Lire la catégorie parent/enfant depuis le profil
   canonique protégé ; un animal ne reçoit jamais de compte ni de Rune.
2. Le parent gère les missions de **son** foyer. Un enfant peut uniquement
   compléter une mission qui lui est attribuée, ou attribuée à toute la famille.
   Il ne crée, réattribue, supprime, rouvre ou édite aucune mission ; il ne choisit
   pas le barème, la date, un montant ou un crédit. Sa complétion transmet seulement
   l’ID d’occurrence, les participants et un UUID d’opération. Le serveur refuse
   toute mutation annexe et toute action hors foyer, y compris un appel direct.
3. Les champs natifs sont `assigneeIds` (IDs texte distincts triés), `allFamily`
   (booléen), avec lecture de l’ancien `assigneeId`. `participantVersion:1`
   identifie le parcours de confirmation. Une mission/occurrence reste unique :
   aucune copie par personne. Les participants sélectionnés sont non vides,
   distincts, humains, existants dans le foyer et autorisés par l’attribution.
   Tous les bénéficiaires sont explicitement sélectionnés ; pas de bénéficiaire
   implicite, pas d’animal, pas d’ID arbitraire ou retiré. Pour une mission
   réellement sans attribution, un parent choisit les participants parmi les
   membres humains actuels. Une attribution devenue introuvable ne déclenche
   jamais ce repli. Sans aucun humain dans un foyer local et sans attribution,
   terminer sans crédit reste possible ; aucune allocation fictive n’est créée.
   Cela n’autorise pas un enfant à compléter une mission non attribuée.
4. Le total est lu dans la **mission enregistrée et verrouillée** :
   `light=10`, `regular=25`, `major=50`, ou `customRunes`, entier JSON exact entre
   0 et `9007199254740991`. Une mission historique sans `rewardVersion:1` ne gagne
   pas rétroactivement. L’enfant n’envoie jamais un total effectif. Vérifier aussi
   les sommes par membre sans dépassement de la capacité numérique JavaScript.
5. Trier les IDs texte selon l’ordre lexical déterministe du cœur JavaScript
   (`<`/`>` sur les identifiants ; pour les identifiants ASCII natifs, SQL
   `COLLATE "C"`). Pour `N` participants, chacun reçoit `floor(total/N)` ; les
   `total % N` premiers IDs reçoivent une Rune supplémentaire. Exemple : 25 et
   `[a,b]` donnent `[13,12]`. Solo reçoit 25 ; zéro donne zéro à chaque participant.
   Le serveur recalcule toutes les parts, leur total exact et leur équité ; il
   n’accepte pas une liste de montants calculée par le client.
6. Un événement **atomique** contient le total et
   `allocations:[{memberId,amount},…]`. `memberId` à la racine est le premier ID
   trié, conservé pour le format natif ; son `amount` est le **total**, pas sa part.
   La présentation par membre utilise sa part. `ledgerVersion=3` est obligatoire.
   Ne jamais envoyer ces événements au writer V2 ou à un fallback de snapshot.
7. Verrouiller la ligne Missions du foyer, son appartenance active et les données
   canoniques nécessaires pour empêcher une révocation/réattribution pendant la
   transaction. Appliquer CAS sur la révision affichée. Conserver une convention
   de verrouillage compatible avec le writer V2 et les writers de profil.
   En cas de `40001`, relire sans écraser une intention pendante.
8. Identité du gain : `missionId~cycle~grant` ; annulation :
   `missionId~cycle~reversal`, avec `reverses` égal à l’événement exact. Une
   occurrence récurrente a son propre `missionId` natif
   (`seriesId-rYYYYMMDD`) et son propre historique. Un seul gain actif par
   occurrence ; pas de second crédit lors d’un double clic, d’une concurrence ou
   d’un rejeu. Une réouverture autorisée ajoute l’annulation de **toute** l’ancienne
   répartition sans modifier ses bénéficiaires, ses parts ou l’ancien événement.
   La nouvelle complétion suit le cycle suivant seulement après cette annulation.
9. Le reçu idempotent est lié au foyer, acteur, UUID d’opération, digest de la
   requête et révision attendue. Une réponse perdue réutilise exactement l’UUID et
   le corps ; un même UUID avec un autre acteur/contenu est refusé. Mission,
   événement entier, révision et reçu sont enregistrés dans **une transaction**.
   Le reçu rejoué renvoie le module courant sans réappliquer un état périmé.
10. Préserver intégralement les crédits V1/V2 confirmés, champs JSON inconnus,
    missions, séries/règles et occurrences historiques. Refuser toute réécriture
    ou suppression de crédit confirmé. Une compensation reste append-only.
    Aucun reset ni migration globale des foyers existants.
11. Les RPC de mutation sont `SECURITY DEFINER`, rôle fermé `NOLOGIN`,
    `NOBYPASSRLS`, `search_path=''`, références qualifiées, droits EXECUTE
    explicites. Les tables privées restent sous RLS forcée et inaccessibles à
    `anon/authenticated`. Les écritures directes de payload et l’ancien writer
    ne doivent jamais permettre aux enfants de contourner ces règles.
12. Une réponse de capacités V3 doit attester la version et les contraintes
    réellement installées ; sa présence seule ne suffit pas. Activer le gate
    frontend uniquement après la recette de sécurité réelle ci-dessous.

## Ordre des actions manuelles, ultérieurement

1. Dans le seul projet personnel `dobby-family-sync`, conserver une sauvegarde et
   exécuter uniquement [le diagnostic regroupé de la reprise](../../reserves-techniques/serveur/00-diagnostic-regroupe.sql), qui remplace la collecte fragmentée `missions-01-preflight.sql`. Examiner les définitions privées réelles
   sur place ; ne transmettre aucun contenu de profil, token ou secret. Conserver
   les empreintes du writer/stamp/guard V2 avant intervention.
2. Achever et tester en PostgreSQL local la migration SQL V3 à partir de ce
   catalogue exact, en coordination avec les protections parent/enfant. Elle doit
   livrer son propre apply transactionnel, sa vérification structurelle et son
   rollback conservateur. **Cette migration n’est pas encore fournie.**
3. Faire examiner puis appliquer manuellement cette migration complète. Ne pas
   réexécuter les anciens scripts Stitch 19/20 d’installation ni remplacer le
   writer historique pour essayer de rendre le client V3 compatible.
4. Exécuter `missions-02-verify.sql` puis la vérification propre à la migration.
   Ce contrôle présent ne peut jamais déclarer V3 opérationnel : il indique
   toujours que la recette familiale reste à faire.
5. Avec deux sessions réelles, tester parent et enfant canonique, puis un extérieur
   au foyer : refus de création/édition/crédit arbitraire par l’enfant ; refus
   hors foyer, profil non lié et animal ; complétion assignée autorisée ; refus
   de complétion non assignée ; 25→13+12, solo→25, total 0 ; double clic/deux
   sessions/réponse perdue→un gain ; récurrence→un gain par occurrence ; CAS
   périmé sans écrasement ; rollback complet d’une erreur en milieu de transaction.
   Tester aussi les appels directs RPC et les écritures de table, pas seulement
   les boutons. Ne conserver que des preuves anonymisées et données de test.
6. Après résultat satisfaisant et documenté seulement, publier le gate V3 activé.
   Le lot UI local reste utilisable tant que ce gate est fermé.

## Retour arrière conservateur

À ce stade, aucune installation V3 n’existe dans ce lot : le rollback est le
maintien du gate fermé et le contrôle `missions-03-rollback-check.sql`. Il ne faut
retirer aucun objet V2 ni effacer aucune donnée pour « revenir en arrière ».

Après une future installation réelle, désactiver d’abord le gate frontend. Employer
uniquement le rollback versionné et testé livré avec cette migration : retirer
l’accès aux nouveaux RPC, conserver les crédits V3 déjà confirmés et les reçus,
et ne jamais réactiver un writer V2 incapable de lire ce foyer. Si un foyer contient
du V3, conserver la lecture seule jusqu’à une migration compatible ; ne convertir
ni redistribuer aveuglément ces crédits. Comparer ensuite les empreintes V2 aux
valeurs du preflight et effectuer une recette de lecture/connexion.

## Preuves locales du cœur de calcul

`node --test essai-stitch-v5-famille/tests/mission-participants-runes.test.mjs`
vérifie répartition, zéro, solo, vrais candidats, animaux, concurrence simulée,
rejeu, compensation, historique V1 intact, occurrence récurrente et dépassement
numérique. Ces tests ne sont pas une recette Supabase et ne valident aucune RLS.
