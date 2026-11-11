# Revue indépendante — runes familiales V2

Revue statique effectuée le 11 novembre 2026 par l’agent `runes_contract_audit`, avec une seconde lecture ciblée de `recurrence_edges`. Aucun test, aucune commande PostgreSQL et aucun accès à un projet Supabase n’ont été exécutés par ces deux rôles. Les résultats d’exécution appartiennent aux preuves distinctes de la campagne pilotée par l’agent principal.

**Verdict : aucune contradiction bloquante restante trouvée dans le périmètre relu, sous les limites explicites ci-dessous.** Ce verdict porte sur le code et le contrat ; il ne constitue ni une preuve de déploiement ni une validation des comptes réels.

## Artefacts examinés

Base de comparaison : `9a3e5dbc1c856ce417e344f2b5aca6e0d9c0040a`.

| Artefact | SHA-256 à la clôture de la lecture |
|---|---|
| `sql-proposals/dobby-shared-runes-v2.sql` | `fb353eca8f2a533cca97d10b9757aab4ae58e56aea8ea3d5788d136629790e15` |
| `essai-stitch-v5-famille/family-modules.js` | `a97ab87d5ed6ec3311b262db30b23f25e4d1b94aff0c1e7db2d8817274a32572` |
| `essai-stitch-v5-famille/family-missions.js` | `33a48e99ab18f99ee9648f3594bf4fbf79c855401f4710911a16d5e931744349` |

Autres sources relues : `SHARED-RUNES-V2-SPEC.md`, `SHARED-RUNES-V2-CONTRACT.md`, `REVIEW-E03-E06-20261111-REWARDS.md`, le schéma de modules préexistant, `family-runes-core.mjs`, `family-missions-core.mjs`, les chemins de connexion de `family-v2.js` et les tests natifs servant de références de comportement. Le moteur pur des runes reste la référence métier.

## Invariants et frontières de sécurité vérifiés par lecture

- Le rôle écrivain est `NOLOGIN`, `NOINHERIT`, `NOBYPASSRLS`, sans gestion de rôles ni privilèges superutilisateur. La migration refuse un rôle préexistant incompatible et l’appartenance des rôles clients à ce rôle.
- Le trigger Missions est `SECURITY INVOKER` et contrôle le rôle d’exécution `current_user`, pour l’ancienne et la nouvelle identité de ligne. Il couvre insert, update et delete ; les autres modules conservent leurs politiques existantes. Aucun indicateur GUC personnalisable n’autorise une écriture.
- Les deux RPC publics sont `SECURITY DEFINER`, détenus par le rôle dédié. Les objets sont qualifiés, `search_path` est vide et les droits publics d’exécution sont révoqués dans la transaction avant attribution à `authenticated`.
- Le helper privé de verrouillage d’appartenance reste détenu par l’opérateur de migration. Il ne fait qu’un `FOR SHARE` sur la propre appartenance active de `auth.uid()` ; il n’accorde pas au rôle écrivain un droit de modification des membres. Les clients n’ont accès ni au schéma privé, ni aux helpers, ni aux reçus.
- Le verrou d’appartenance, le verrou consultatif transactionnel par foyer/Missions et le verrou de ligne précèdent la validation CAS. La création sans ligne est également sérialisée. Snapshot, événements, révision et reçu sont écrits dans une seule fonction transactionnelle ; une exception ne laisse pas de demi-opération.
- Un reçu lie foyer, UUID, acteur, révision attendue et condensat. Un rejeu identique renvoie le reçu originel avec le **module courant** ; il ne remet pas un ancien statut terminé après une réouverture plus récente. L’appartenance active est revérifiée avant un rejeu.
- Le registre confirmé reste uniquement dans le JSON Missions. La table privée contient des métadonnées de reçus, sans événements ni solde. Les crédits confirmés sont immuables, y compris date, titre et révision ; une demande déjà connue peut être dédupliquée sans réécrire ces champs.
- Les crédits V1 gardent leur clé `missionId` et le cycle zéro implicite. Les cycles V2 sont continus, avec annulation exacte du gain précédent, un seul gain actif et un traitement réel des récompenses de zéro. Les totaux contrôlés sont les totaux **actifs par bénéficiaire**, pas la somme brute de tout l’historique annulé.
- Les bornes numériques natives s’appliquent aux montants, cycles, confirmations, révisions et totaux. Les longueurs UTF-16 et les blancs JavaScript sont désormais pris en compte dans les champs du registre ; les dates sont des ISO canoniques, jamais des mots relatifs PostgreSQL.
- Les anciennes règles de récurrence restent un préfixe identique ; racines, occurrences et identités persistées survivent aux snapshots. Une nouvelle occurrence exige une vraie racine de série présente. Le serveur ne reproduit pas le générateur de dates.
- Une ancienne mission sans `rewardVersion` ne devient pas rétroactivement éligible ; une mission conservée ne perd pas ce marqueur. La suppression native d’une mission ordinaire n’efface pas ses gains confirmés.
- Le client persiste UUID, CAS, payload et contexte avant le premier envoi. Un résultat réseau inconnu garde l’opération initiale. Les confirmations réconcilient les demandes par identité et attribution, et les modifications arrivées pendant le réseau sont rebasées sur le module confirmé ou présentées en conflit.

## Défauts soulevés pendant la revue et corrections relues

| Point soulevé | Correction observée |
|---|---|
| Confusion entre crédit local de révision zéro et ancien crédit reçu du serveur | La provenance du snapshot serveur prévaut ; les anciennes révisions zéro y restent immuables. L’adoption locale initiale est une frontière distincte. |
| Rejeu d’un reçu ancien pouvant réappliquer son snapshot | Le serveur renvoie l’état courant ; le client applique cette réponse et vérifie les demandes confirmées. |
| Retour à la version 1 avec registre vide ou uniquement V1 | Le protocole adopté reste V2, côté writer et calcul de version client. |
| Conflit entre complétions de missions différentes | Fusion à trois versions par mission ; recouvrement incompatible traité explicitement. |
| Édition pendant un envoi conservant des statuts locaux périmés | Snapshot local attaché à l’opération ; seul le delta arrivé en vol est rebasé sur la réponse courante. |
| Opération refusée figée sans possibilité de correction | Les refus atomiques connus permettent un choix explicite de rebase avec archivage ; les issues inconnues gardent leur UUID. |
| Mauvaise hypothèse HTTP sur `40001` | Le client reconnaît le SQLSTATE indépendamment du statut HTTP ; PostgREST mappe la classe `40*` sur HTTP 500. |
| Classification trop large de toutes les erreurs SQL comme refus connus | Liste de codes contractuels ; `40003`, `08007` et les erreurs de transport ne constituent pas une confirmation d’échec. |
| Perte de demandes pendant un rollback de récupération groupée | Sauvegardes enrichies et restauration exacte des demandes et métadonnées. |
| Réutilisation d’une capacité après changement de session, et résultat `meta` ancien appliqué tardivement | Vérification d’époque/génération/contexte avant réutilisation et avant affectation de l’état restauré. |
| Suppression de règles historiques ou d’un arrêt de série | Préfixe historique des règles protégé côté serveur. |
| Retrait de `rewardVersion` pour contourner une complétion récompensable | Éligibilité d’une mission existante conservée immuable. |
| Réouverture puis suppression avant envoi de l’annulation | La suppression est bloquée tant qu’un gain **ou une annulation** est en attente. |
| Nouveau `done` éligible sans gain, dates relatives ou normalisées par PostgreSQL, JSON null obligatoire, texte astral trop long | Gardes serveur de transition, comparaison ISO canonique, `IS DISTINCT FROM` et longueurs UTF-16. |
| Nouvelle occurrence sans sa racine | Vérification limitée aux nouvelles occurrences, sans toucher les anciennes orphelines ni imposer une fenêtre serveur. |
| Profil du responsable supprimé mais mission encore assignée | Refus client explicite avant mutation ; réassignation ou désassignation demandée. Le contrôle serveur ne prétend pas être un annuaire de profils. |

## Limites et risques résiduels explicites

1. **Adoption initiale.** Le serveur valide la forme et la cohérence de l’historique local initial, mais ne peut pas prouver sa provenance rétrospective. Une ligne Missions existante ne peut pas recevoir directement un second historique local distinct. Celui-ci doit rester conservé et l’incompatibilité visible, sans import silencieux.
2. **Paramètres modifiés avant confirmation.** Le protocole transporte un snapshot et les demandes, sans chronologie de chaque modification de montant ou de responsable. Plusieurs cycles hors ligne avec les mêmes paramètres sont possibles ; des gains intermédiaires portant d’autres paramètres que la mission finale sont refusés. Le client empêche ces modifications pendant un gain partagé en attente. Cette composition ne doit pas être annoncée comme couverte.
3. **Demandes orphelines.** Une nouvelle demande exige une mission présente. Un ancien cache contenant déjà une demande orpheline reste un cas de refus explicite avec conservation, pas une résolution automatique. Les crédits historiques confirmés survivent à la disparition des missions et des membres.
4. **Récurrence.** Le serveur vérifie structure, historique, identité et racine des nouvelles occurrences. Il ne recalcule pas si une date correspond au jour de semaine ou à la règle de projection ; la projection reste native. Il n’impose pas les trente jours de reprise aux retours après une longue déconnexion.
5. **Capacité et croissance.** La limite JSONB de 262144 octets demeure. Un dépassement refuse l’opération entière ; aucun historique n’est tronqué. Les reçus restent conservés pour l’idempotence. Une croissance au-delà de ces capacités nécessitera une évolution distincte et sauvegardée.
6. **Compatibilité de dates.** La proposition exige des années ISO sur quatre chiffres. Un historique antérieur hors de ce format bloque le précontrôle sans être réécrit. Cette borne est plus étroite que toute la plage théorique de `Date` JavaScript.
7. **Périmètre de preuve.** L’inspection ne prouve ni la configuration réelle des rôles Supabase, ni la publication du schéma PostgREST, ni l’émission des JWT, ni les interactions sur les comptes réels. Ces opérations ne sont pas autorisées dans cette mission. Le mapping HTTP mentionné ici est celui de la documentation PostgREST publique.

## Documentation publique consultée

- PostgreSQL, [CREATE FUNCTION : SECURITY DEFINER, search_path et révocation d’EXECUTE public](https://www.postgresql.org/docs/current/sql-createfunction.html).
- PostgreSQL, [fonctions d’information : current_user et session_user](https://www.postgresql.org/docs/current/functions-info.html).
- PostgreSQL, [CREATE POLICY : visibilité USING et contrôles WITH CHECK](https://www.postgresql.org/docs/current/sql-createpolicy.html).
- PostgREST, [source officielle de la table SQLSTATE → HTTP](https://raw.githubusercontent.com/PostgREST/postgrest/main/docs/references/errors.rst), notamment `40*` → HTTP 500.

Ces consultations sont publiques. Aucun outil associé à un projet Supabase professionnel ou familial n’a été utilisé par les agents de revue.
