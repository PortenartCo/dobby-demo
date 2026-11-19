# Éléments manquants — accès au seul projet DOBBY

> État de la première phase conservé. Les 21 différences sont désormais qualifiées par preuve rapportée ; les seules réserves actuelles et l’action V7 sont dans [LECTURES-FINALISATION.md](LECTURES-FINALISATION.md).

Le connecteur dédié disponible dans ChatGPT n’est pas exposé à CODEX. Son connecteur général refuse `get_project`. Aucun autre appel hébergé n’est effectué. Les opérations ci-dessous sont des **demandes préparées, non exécutées** ; aucun credential ou autre projet ne doit être recherché pour les réaliser.

## 1. Métadonnées nécessaires

[LECTURE-CATALOGUE.sql](LECTURE-CATALOGUE.sql) compare les 27 signatures à leurs références publiques sans retourner de corps : présence, owner, SECURITY DEFINER, retour, attributs, search_path, empreintes des defaults/configuration/définitions, ACL décomposées et EXECUTE effectifs. Il permettra d’identifier les 21 et les 6 ; le seul compte agrégé ne le permet pas.

[LECTURES-COMPLEMENTAIRES.sql](LECTURES-COMPLEMENTAIRES.sql) borne les autres lectures aux éléments manquants :

- Les 12 signatures Missions et leurs empreintes/attributs, sans contenu de fonction.
- ADMIN/INHERIT/SET **avec grantor** et chemins transitifs des writers ; les lecteurs absents ne doivent pas être traités comme déjà activables.
- Types/permissions minimales Auth et rôle effectif de l’installateur, sans valeur d’utilisateur/session ; distinguer USAGE, grant option et visibilité sous RLS.
- Autorité de policy Storage, capacité de lock et TEMP ; présence/version active de supautils et configuration gérée pertinente. Un nom de GUC/configuration seul ne prouve pas le fonctionnement de la délégation.
- Retour et attaches du stamper, avec empreintes de triggers, sans arguments ou définitions bruts.

Ces SELECT se terminent par ROLLBACK. Ils n’ajoutent ni policy, ni rôle, ni objet, et ne lisent aucune ligne d’`auth.users`, `auth.sessions`, `storage.objects` ou payload familial. Leur syntaxe a été vérifiée sur la fixture locale dépourvue de catalogue métier, pas sur DOBBY. Si un droit de catalogue/configuration manque, conserver le refus et l’élément NON VÉRIFIÉ.

## 2. Définitions à consulter en privé

Après identification des 21, la comparaison sémantique nécessite `pg_get_functiondef` pour ces seules routines, les 12 dépendances Missions et les dépendances supplémentaires réellement atteintes. L’autorisation de lecture de la mission couvre les définitions nécessaires si la connexion correcte devient disponible ; aucune permission d’écriture n’en découle.

Conserver cet extrait dans un espace de revue privé hors Git/CI. Il peut contenir des identifiants, constantes ou logiques non approuvés pour publication. Comparer notamment : identité issue des claims, traitement Auth/RLS, contrôles de foyer/rôle, verrouillage, CAS, reçus/replays, champs autorisés, paramètres/defaults, search_path et appels indirects. Ne pas déclarer une simple normalisation avant lecture réelle des deux définitions.

Une publication éventuelle de code privé exige une revue de confidentialité spécifique et une autorisation adaptée ; elle n’est pas remplacée par le contrôle des artefacts publics de ce lot. Aucune définition privée hébergée n’a été obtenue ou publiée ici.

## 3. Deltas pouvant être soumis ultérieurement

| Delta | État / preuve requise avant validation humaine |
| --- | --- |
| Manifeste natif Lot 2A | BLOQUÉ : qualification individuelle des 21 et graphe Missions. Aucun MD5 modifié pour accepter une cible inconnue. |
| Autorité de maintenance V7 | BLOQUÉ : identifier un délégant légitime et une procédure supportée. CREATEROLE ne suffit pas pour se donner ADMIN ; aucun script de grant correctif aveugle fourni. |
| Grants Missions | Conditionnel : l’attribution temporaire propre peut être refermée, celle d’un autre grantor ne se révoque pas de la même façon. Préflight indépendant testé, pas de REVOKE global. |
| Lecture Auth | Trois sélecteurs privés candidats testés localement ; visibilité réelle et raccordement aux helpers/activateurs/fingerprints BLOQUÉS. Ne pas ajouter BYPASSRLS, USAGE général, policy Auth fictive ou membership de rôle géré en remplacement. |
| Policy Storage | Conditionnel à l’autorité existante ou délégation gérée active. Le paquet pourra conserver la policy restrictive exacte et les huit natives ; aucune modification d’owner, CREATE Storage ou rôle géré n’est une réparation proposée. |
| Anciennes capacités/cache | Réserve distincte : décision validée de gel/extinction/invalidation/clé URL et purge, avec impacts documentés. Aucun geste effectué. |

La recette de ces deltas doit rester fictive, sur copie isolée des définitions légitimement disponibles, puis dans le seul projet personnel après autorisation distincte. Aucun compte Parent A/B réel ne doit servir de sujet de suspension/révocation. Les contrôles de conservation et sauvegardes restent ceux du plan Lot 5A.
