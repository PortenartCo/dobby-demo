# Réserves techniques — accès Parent/Enfant et profil enfant évolutif

> Checkpoint de ce sous-lot : les dépendances serveur décrites ci-dessous sont depuis reprises par le chantier du socle. Voir la [passation actualisée](PASSATION-SOCLE-CONCURRENT.md). Aucun diagnostic, ancien installateur ou candidat SQL supplémentaire n’est à exécuter maintenant.

## Périmètre et baseline

Socle `b77cb9de100a864c8aace8fb9e07053220ccd23a`, branche `feat/dobby-v7-reserves-techniques-20261113`. Stitch 19/20 et la recette B sont clos et préservés. Ce lot ne change aucun parcours Auth, cérémonie, inscription ou invitation générique. Aucun accès Supabase distant, ni en lecture ni en écriture, et aucun rejeu des scripts historiques 01/04/06/11. Les deux comptes Auth et les profils existants ne sont ni supprimés, ni fusionnés, ni réinitialisés. Toutes les éventuelles interventions serveur appartiennent à l’utilisateur.

Baseline persistée avant le correctif :

- `family-access.mjs::profile()` ne conservait pas le `memberCategory` déjà présent dans la définition historique versionnée de `dobby_v7_context`. `assertNativeSharedWrite` utilisait alors en priorité la catégorie du snapshot mutable `st.familyMembers`.
- `family.js::sharedReadOnly()` dépendait de la présence et de la catégorie de ce snapshot. Un enfant canonique absent ou localement reclassé n’était plus reconnu en lecture seule ; l’inverse pouvait refuser un parent canonique.
- `family-core.mjs::assertSharedWrite()` laissait passer une écriture quand la catégorie manquait. L’exception magie enfant contrôlait seulement `p_member_id`, sans borner les valeurs RPC ni vérifier toute la liaison.
- Le bouton F08 était désactivé. Il le reste : le serveur d’invitation ciblée n’est pas implémenté dans ce lot et le catalogue réel n’a pas été consulté par Codex.

## Résultat local

| Réserve | Résultat de ce lot | Limite conservée |
|---|---|---|
| Rôle canonique Parent/Enfant | Correction testée localement : conservation et validation de la catégorie renvoyée par le serveur et de son identifiant de profil ; priorité à cette catégorie dans l’interface, la politique native de membre et le transport | Une catégorie locale, un rôle technique owner/member, un nom ou un âge n’accordent aucun droit parental |
| Enfant et identité incomplète | Contrôles d’écriture partagée fermés, même si le membre manque dans le registre ou qu’une catégorie locale/grant trop permissif annonce parent ; absence de catégorie canonique = écriture refusée, session conservée | Aucun nouveau droit serveur enfant activé, aucune certification RLS/RPC réelle |
| Parent déjà lié | Ses droits existants restent conditionnés à la liaison canonique vérifiée et aux grants actuels ; une catégorie enfant locale périmée ne le rétrograde plus | La gestion de tous les autres profils liés/parentaux reste bornée par l’ancien writer serveur, sans faux succès local |
| Propre magie de l’enfant | Seul le RPC existant ciblant son `member_id` et des champs magiques chaîne est admis par le guard ; identité/notes/catégorie mêlées au payload refusées | Le moteur E06 et ses cérémonies ne sont pas modifiés ; le serveur doit encore garantir son propre périmètre |
| Changement de droits pendant une attente | Recontrôle de la liaison et du rôle après attente du bearer, avant l’envoi REST/Storage et lors de la reprise après 401 ; compte/foyer/epoch et chemin fichier revalidés | La garde locale ne remplace pas les verrous, contrôles d’identité et policies serveur |
| F08 : Donner accès à DOBBY | Bouton visible désactivé et contrat de rattachement au même profil conservé ; aucune invocation de l’invitation générique | API/client ciblés repris par le socle, installation serveur rapportée ; recette réelle et activation encore en attente |

La définition locale historique inspectée est `docs/dobby-v7/stitch19-20/supabase/01-apply.sql`, fonction `public.dobby_v7_context` : elle sélectionne le membre complet `p`, lit `p->>'memberCategory'`, puis renvoie `'profile',p`. Le correctif lit donc un champ du DTO existant, sans inventer une capacité ou une migration. Cela ne constitue pas une lecture ni une vérification du serveur actuel.

L’amendement du source natif `essai-stitch-v5-famille/index.html` est limité à **un champ dans le retour de `v23MemberContext`** : `memberCategory:verified&&bound.profile?.id===context.memberId?bound.profile.memberCategory:null`. Les vérifications user/foyer/member et les révisions sont conservées ; les questionnaires et writers de cérémonie restent identiques.

## Preuves locales

TDD : les cas parser/transport/UI ont échoué avant le correctif ; le cas de promotion locale du membre dans la politique native et les révocations pendant une attente REST/Storage et le changement d’epoch/compte entre demande et envoi ont chacun été reproduits avant correction. Les fixtures utilisent uniquement des personnes `TEST` et ne contactent aucun serveur Supabase.

- **83/83** : suites `family-access-native.test.mjs`, `family-access.test.mjs`, `family-member-policy.test.mjs`, `v7-family-policy.test.mjs`, `family-write-policy.test.mjs`, `reserves-family-role.test.mjs`, `e06-ceremonies.test.mjs`. Couverture des droits propres, rôles incohérents/absents, rollback local, identité/révision, reprise Auth existante et refus avant transport.
- **12/12** : `family-core.test.mjs` et `family-access-adoption.test.mjs`, adoption canonique sans upload, extensions et brouillons locaux préservés, contexte croisé et protocoles périmés refusés.
- **PASS navigateur local** : `reserves-family-access.cjs`, vrais composants membres/agenda, parent/enfant canonique contre snapshot local opposé, propre magie encore accessible, catégorie manquante/vérification perdue en lecture seule, bouton d’accès enfant toujours désactivé. Toutes les requêtes hors serveur HTTP local sont bloquées ; aucune tentative Supabase observée.
- Les régressions natives Famille sont rapportées après leur exécution dans le complément de validation ci-dessous.

Exécution ciblée reproductible (serveur HTTP local du dépôt en port 8863) :

```bash
node --test essai-stitch-v5-famille/tests/family-access-native.test.mjs essai-stitch-v5-famille/tests/family-access.test.mjs essai-stitch-v5-famille/tests/family-member-policy.test.mjs essai-stitch-v5-famille/tests/v7-family-policy.test.mjs essai-stitch-v5-famille/tests/family-write-policy.test.mjs essai-stitch-v7/tests/reserves-family-role.test.mjs essai-stitch-v7/tests/e06-ceremonies.test.mjs
DOBBY_TEST_ORIGIN=http://127.0.0.1:8863 node essai-stitch-v7/tests/reserves-family-access.cjs
```

## F08 — invariants repris par le chantier du socle

Le [contrat détaillé Famille](../revue-generale/famille/CONTRAT-SERVEUR.md) fournit les invariants repris par le socle. Le catalogue a été reçu, l’API ciblée développée et l’installation rapportée dans ce chantier. Leur présence ne constitue pas encore une recette fonctionnelle réelle.

Le futur parcours doit respecter ensemble les invariants suivants :

1. Le parent est résolu par son compte authentifié et sa liaison canonique au foyer, jamais par un libellé owner/member, un nom ou un âge. Le profil enfant visé est une référence explicite `member_id` du même foyer, non un profil nouvellement créé ou recherché par ressemblance.
2. L’invitation porte une finalité ciblée explicite, le foyer et le profil existant. Un client qui ne comprend pas cette finalité refuse le parcours plutôt que de revenir à une invitation générique. La prévisualisation publique ne dévoile pas de fiche enfant, naissance, notes ni historique ; aucune donnée familiale n’est embarquée dans le jeton.
3. Le jeton opaque a une durée limitée et une révocation ; ni logs, URL de preuve, export métier ni stockage local durable ne doivent en conserver une copie. Les métadonnées de diagnostic ne lisent pas les invitations réelles.
4. L’acceptation dérive le compte cible de `auth.uid()`. Elle verrouille invitation, membre et liens ; revalide autorisation du créateur, foyer, expiration/révocation/consommation, catégorie enfant actuelle et absence de lien concurrent. Un compte déjà lié ailleurs ou un profil déjà lié à un autre compte ne sont jamais fusionnés silencieusement.
5. La transaction crée uniquement les liens/appartenance nécessaires, sans nouvel élément de `familyMembers`, sans mise à jour du contenu du profil et sans promotion parentale. Le nombre de membres et le `member_id` restent identiques ; avatar, Maison, Patronus, missions, Runes, historique et extensions sont conservés intégralement.
6. Idempotence par acteur, identifiant d’opération et requête ciblée : même requête rejouée = même résultat confirmé ; identifiant réutilisé pour une autre cible = refus. Deux acceptations concurrentes ne produisent qu’un lien ; l’autre n’écrase rien. Une confirmation périmée ou un changement de compte/foyer annule l’action sans nouveau profil.
7. L’activation frontend vient seulement après implémentation, installation manuelle et recette réelle satisfaisante. La simple présence d’une fonction dans le catalogue, une réponse de capacités ou un test simulé ne suffit pas.

La fonction historique `dobby_v7_bind_existing_member` n’est pas ce parcours complet : elle suppose un compte déjà membre actif et ne fournit pas la création/acceptation d’une invitation enfant ciblée. Ne pas contourner cette limite par l’ancienne invitation générique ni exposer un lien manuel arbitraire.

## F09 — dépendances reprises par le socle

Les policies proposées dans l’autre lot ne couvrent pas à elles seules les fonctions privilégiées. L’ancienne définition de `dobby_v7_update_member` n’autorise que son propre profil ou un dépendant non lié : la gestion complète d’un autre parent ou d’un enfant déjà lié exige encore une évolution serveur ciblée. Les validations de mission enfant dépendent du protocole de participants/Rune unique du lot Missions, toujours fermé tant qu’il n’est pas vérifié.

Le futur serveur doit borner les parents à leur foyer et refuser à l’enfant tous les writers partagés, sauf propre magie et validation d’une occurrence autorisée. Aucun remplacement de snapshot, RPC privilégié, crédit arbitraire ou échange privé avec Dobby ne doit contourner ces limites. Ce lot n’installe et n’assouplit aucune policy.

## Actions manuelles strictement minimales

Aucune action SQL supplémentaire : ne pas relancer le diagnostic, les paquets du socle ou les anciens scripts Stitch. Les développements serveur sont repris par l’autre chantier et ne sont pas comptés une seconde fois ici.

La recette future porte sur les nouveaux droits Parent/Enfant/autre foyer et le rattachement au même profil, après intégration du client correspondant et selon ses gates. Elle ne transforme pas B en enfant et ne répète pas sa recette validée. La [séance physique micro/iPhone](CONTROLES-MATERIELS.md) reste indépendante.

Les retours arrière doivent conserver profils, liens et historique ; aucun reset Auth ou snapshot aveugle. Un retrait de garde cliente ne peut activer un parcours enfant sans preuve serveur. Employer le retour conservateur du paquet exact du socle si nécessaire, pas un script ancien par analogie.

## Complément de validation finale du lot

Au checkpoint du sous-lot, avant intégration : corrections **testées localement, non encore déployées à ce stade**. Rejeu final : 83/83 ciblés, 12/12 core/adoption et navigateur `reserves-family-access.cjs` verts. Les régressions `v7-family-review.cjs` (six largeurs) et les deux tests navigateur natifs `family-member-policy.test.cjs` passent également. Aucun compte ni projet distant n’est utilisé dans ces preuves.

Contrôle de conservation : l’intégralité de `essai-stitch-v5-famille/index.html` correspond octet par octet au socle b77cb9d après **la seule insertion du champ canonique explicitement décrit plus haut** ; aucun autre amendement Auth/cérémonie historique n’est supprimé. Syntaxe, liens relatifs de cette fiche et `git diff --check` passent.

## Complément du gel de la reprise

La relecture indépendante a aussi reproduit la transition où une session Auth native existe déjà alors que son contrôleur V7 renvoie encore un état vide ou discordant. Le transport (`3945ee4`) et l’interface (`a3e5ac6`) distinguent désormais cette transition d’un véritable usage local sans session : aucune mutation n’emprunte le repli local. Les lectures de contexte/capacités et le setup Auth existant restent utilisables.

Les refus explicites du serveur restent autoritaires (`b988ec2`) : `canEdit` doit être vrai pour les mutations générales du parent, `canMagic` pour la magie, et `canManageDependents` pour la magie d’autrui. Le rôle ne remplace pas un flag absent ou faux ; `canCreate=false` ne bloque pas Courses/événements si leur droit d’édition est bien fourni. La magie propre reste distincte de l’édition de l’identité. Les cas supplémentaires ont été reproduits rouges puis verts ; le sous-lot rapporte 91 tests ciblés réussis. La validation combinée finale de la reprise est consignée dans son [manifeste](evidence/validation-locale.json).

## Intégration de l’ancienne connexion Courses et reprise de cache

La campagne CI a détecté que l’ancienne entrée native pouvait établir une session/appartenance sans confirmer le rôle V7. Le correctif `70ba482` réutilise la lecture/adoption du contexte existant dans le verrou de Sync, après vérification du foyer et seulement sans liaison valide. Le formulaire, les credentials et les flux Auth modernes restent inchangés. Un contexte V7 absent ou refusé conserve la session et la lecture, jamais les écritures.

La reprise du cache a aussi reproduit deux vérifications de contexte concurrentes (bootstrap et Sync), qui laissaient une intention en attente malgré un parent finalement vérifié. Les lectures publiques et le drain Sync du même propriétaire sont sérialisés ; une lecture publique après attente effectue un GET neuf, sans réutiliser un ancien résultat pour confirmer une mutation. Les changements d’epoch/utilisateur/foyer refusent les anciennes attentes ; les refus 404/403 restent fermés. Les tests natifs finaux de ce correctif sont **70/70 verts**.

La preuve navigateur indépendante couvre le vrai formulaire legacy et les vraies commandes Sync, sans helper d’identité ou refresh caché : Courses Famille, reprise offline/reload, CAS, **11 cas partagés complets**, dont V7 absent en lecture seule sans PATCH. Tous les acteurs sont fictifs ; ce n’est pas une nouvelle recette B. La relecture indépendante des slots et de la preuve native ne trouve plus d’écart démontré.
