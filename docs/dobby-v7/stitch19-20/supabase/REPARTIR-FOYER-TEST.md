# Nouveau foyer avec les deux comptes Auth d'essai

Le diagnostic réel confirme deux comptes Auth, un seul foyer d'essai **se terminant par `0e32`**, deux appartenances V2 actives de rôle `owner`, six modules et aucun membre canonique. Les comptes privés V7 sont exactement nuls : aucune liaison, invitation ou fiche provisoire. Les deux anciennes appartenances V1 restent indépendantes et actives.

Les deux comptes Auth sont conservés. Le nouveau parcours créera un nouveau profil pour chaque compte, un **nouveau foyer propre**, puis une invitation pour le second compte. Aucun ancien module ne sera copié dans ce nouveau foyer.

**Ne pas exécuter `04-link-existing-owner.sql`.** Ne pas rejouer `01-apply.sql`, déjà installé et vérifié. Aucun compte Auth, foyer, module, ligne V1 ou table ne doit être supprimé.

## Action ciblée préparée

[06-disable-test-memberships.sql](06-disable-test-memberships.sql) désactive uniquement les deux appartenances V2 `owner` du foyer d'essai confirmé. Il exige l'état exact du diagnostic, verrouille les comptes et tables concernés pendant sa courte transaction, puis vérifie que deux lignes exactement ont changé. Seul le booléen `active` est modifié; rôles, dates `joined_at`, identifiants, six modules et comptes Auth sont comparés avant/après et conservés. Aucun schéma, droit, helper ou réglage RLS de table n'est modifié.

Les clés étrangères vers le foyer et les appartenances restent satisfaites : aucune clé ni ligne n'est supprimée. Les modules, articles V2 et reçus privés qui référencent l'ancien foyer restent à leur place. Les policies V2 fondées sur une appartenance active ne donneront plus accès à l'ancien foyer aux deux comptes désactivés. Les droits V1, fondés sur l'ancienne table d'appartenance, sont hors de cette action et restent inchangés.

Le script refuse toute situation différente : autre foyer apparu, nombre de comptes ou d'appartenances différent, rôle changé, module/révision modifié, liaison/brouillon/invitation V7 présent, ou trigger métier sur les appartenances. Un refus annule la transaction; ne pas contourner ses contrôles.

Les fichiers du dépôt gardent volontairement `NULL::uuid` comme foyer à renseigner. Les copies prêtes à exécuter fournies séparément dans la conversation contiennent uniquement l'UUID du foyer confirmé, sans identifiant Auth ni donnée personnelle.

## Ordre d'exécution manuel

1. Fermer ou déconnecter les deux sessions familiales pour éviter une synchronisation d'essai pendant l'opération. Dans SQL Editor du seul projet personnel **dobby-family-sync**, référence **pqcdkrwljgvgagzwrcmg**, conserver le rôle qui a installé V7.
2. Exécuter la copie préparée de `06-disable-test-memberships.sql` une fois. Le JSON doit indiquer `affectedMembershipRows: 2`, `oldHouseholdActiveRows: 0`, `authUsersPreserved: 2`, `moduleRowsPreserved: 6` et les contrôles de conservation à `true`.
3. Exécuter immédiatement la copie préparée de [07-verify-fresh-start.sql](07-verify-fresh-start.sql), **lecture seule**, avant de saisir un nouveau profil. Renvoyer son JSON `fresh_start_verification`. Il doit confirmer deux anciennes appartenances inactives, zéro appartenance V2 active, deux comptes Auth, six anciens modules inchangés en révision, les trois comptes privés à zéro et les deux appartenances V1 toujours actives.
4. Après cette vérification, reconnecter le premier compte : le contexte serveur doit ouvrir l'étape **profil personnel**, puis proposer la création d'un **nouveau foyer**. Reconnecter le second compte dans une session distincte : créer son nouveau profil et accepter l'invitation émise dans le nouveau foyer. Aucun rattachement historique n'est nécessaire.

Les anciennes données locales du navigateur restent protégées par les garde-fous natifs. Un appareil encore associé à l'ancien foyer ou contenant des modifications locales peut refuser l'adoption du nouveau foyer. Dans ce cas, transmettre le message précis pour traiter la seule association locale concernée; ne pas vider indistinctement les données du navigateur et ne pas téléverser les anciens modules dans le nouveau foyer. La désactivation SQL ne réinitialise pas les caches locaux.

## Retour arrière limité

[08-rollback-test-memberships.sql](08-rollback-test-memberships.sql) réactive exactement les deux anciennes appartenances, uniquement **avant tout nouveau profil, foyer, lien ou invitation V7**. Il exige encore le seul foyer ancien, les mêmes six modules et deux lignes anciennes inactives. Il compare lui aussi tous les champs hors `active` avant/après.

Dès que le nouveau parcours a commencé, ne pas exécuter `08` : le script refuse les nouveaux brouillons/liaisons/invitations ou l'apparition d'un autre foyer. Ne pas modifier ses gardes pour forcer un retour. Il ne supprime jamais le nouveau foyer et ne réaffecte aucun profil.

Toutes les mutations Supabase distantes sont exécutées manuellement par l'utilisateur. Aucune modification distante n'a été effectuée par Codex. Les preuves locales utilisent uniquement des comptes et données fictifs dans le PostgreSQL Docker dédié, sans réseau; elles ne remplacent pas le JSON de vérification distant et la recette des deux comptes réels.
