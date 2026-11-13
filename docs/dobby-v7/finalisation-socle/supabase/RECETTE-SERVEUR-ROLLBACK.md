# Recette serveur 30 — troisième Auth, puis annulation intégrale

**À exécuter uniquement sur instruction après la vérification du socle installé.** Le fichier [30-runtime-rollback.sql](30-runtime-rollback.sql) est une recette métier sur la base réelle, et non une nouvelle migration. Il ne configure aucun droit, n'active aucun flag et ne modifie aucun compte Auth. Les appels applicatifs sont faits sous le vrai rôle SQL `authenticated` sans BYPASSRLS, avec des claims JWT simulées par le SQL Editor.

## Préalable unique : compte Auth de recette

Conserver les deux comptes Parents et leur foyer actuels. Dans le seul projet **`dobby-family-sync`** :

1. **Authentication → Users → Add user → Create new user** (ou « Create user » selon le libellé affiché), **pas** « Send invitation ».
2. Choisir en privé une adresse de recette non utilisée et un mot de passe ; conserver ces informations pour la future connexion navigateur. **Ne les transmettre ni dans le chat, ni dans Git.** Activer **Auto Confirm User** pour que ce compte soit confirmé sans e-mail d'invitation.
3. Ne pas connecter ce compte à DOBBY, créer de profil ou lui attribuer un foyer avant le contrôle 30. Le script exige exactement un compte confirmé avec mot de passe, sans liaison canonique, appartenance active ou profil provisoire. Il le sélectionne en interne : aucun UUID ou e-mail à copier dans le SQL.

Ce compte Auth est créé manuellement hors du test SQL : il restera présent après la recette, sans lien ni foyer de test. Le script ne crée/supprime/réinitialise aucun utilisateur Auth et n'altère jamais les appartenances ou liaisons des deux Parents.

## Exécution

Fermer les onglets DOBBY pendant cette courte recette pour éviter des écritures concurrentes. Ouvrir le SQL Editor du **projet familial**, copier **tout** `30-runtime-rollback.sql`, puis **Run**. Aucune valeur à remplacer. Ne lancer aucun reset, les anciens scripts Stitch, ni les fichiers d'installation déjà réussis.

En cas de `RT-PREFLIGHT-THIRD-AUTH`, aucun fixture métier n'a été créée : vérifier le compte de recette préparé, sans modifier les Parents. Si une erreur interrompt le fichier, exécuter simplement `ROLLBACK;` et transmettre uniquement sa référence/message fixe ; ne pas continuer une transaction en erreur. Le script n'accorde jamais les droits qui lui manqueraient.

La transaction utilise `REPEATABLE READ`. Les verrous du compte/appartenance/foyer suivent l'ordre des RPC ; un conflit concurrent peut interrompre le contrôle sans rien écraser. Il n'y a aucun retry automatique. Les droits de lecture du SQL Editor sont vérifiés avant les fixtures. Le catalogue reçu comportait l'appartenance effective `postgres → pg_read_all_data` avec `INHERIT true`, en plus de BYPASSRLS ; BYPASSRLS seul n'aurait pas donné SELECT sur les reçus privés. Aucun GRANT correspondant n'est exécuté par le contrôle.

## Ce qui est testé et annulé

Le script ajoute temporairement un enfant fictif **TEXT `test-socle-child-v1`**, avec avatar, Maison/Patronus et extensions, au registre courant par une écriture Parent native. Il crée aussi une Course du foyer, un foyer étranger fictif et sa Course pour prouver l'isolation sur des lignes existantes. Aucun des deux JSON Parent n'est remplacé : Parent B cible l'autre Parent avec sa valeur de nom déjà présente, puis modifie réellement le seul enfant fictif après liaison.

Il exerce l'invitation ciblée, l'acceptation par le troisième Auth sans profil personnel préalable, la même identité/profil/révision relus dans la base, le replay, la magie propre et les refus enfant. Les Missions V3 vérifient le partage **25 = 13 + 12**, le replay, la deuxième validation, le CAS périmé, le changement d'acteur, la compensation et le cycle suivant, la conservation des anciens crédits et les refus d'écriture directe/V2/enfant non éligible/inter-foyers. Les cas sont séquentiels ; cette recette ne prétend pas mesurer une concurrence multi-session réelle.

Storage est testé uniquement par des **métadonnées temporaires** si le bucket familial existe : INSERT/UPDATE Parent, lecture enfant, refus INSERT/UPDATE enfant. Aucun contenu physique n'est envoyé et **aucun DELETE Storage** n'est exécuté. Le trigger géré `protect_delete` n'est ni désactivé ni contourné, aucun GUC de bypass n'est inventé. La suppression via le service Storage et le véritable upload restent à recetter dans l'application.

Toutes ces opérations sont exécutées dans une sous-transaction. Une exception sentinelle attendue l'annule ; le rapport est conservé dans une variable, pas dans une donnée familiale. **Après cette annulation**, le script compare les empreintes des douze tables métier/liaisons/reçus/flags/Storage observées avant test. Le JSON est alors produit, puis le `ROLLBACK` final supprime également les tables temporaires et libère les verrous. Il distingue cette observation après annulation métier de la fin de la transaction extérieure.

## Retour attendu

Transmettre seulement la cellule JSON **`runtime_verification`** complète dans cette conversation privée. Elle ne contient aucun UUID, e-mail, mot de passe, jeton d'invitation, nom de Parent ou contenu familial.

Pour le fichier exact testé localement, le parcours nominal produit **38 contrôles réussis**, zéro échec et zéro contrôle non exécuté si le bucket existe. Exiger aussi `innerRollbackCompleted=true`, `postRollbackStateObserved=true`, `historicalDataAfterRollbackPreserved=true` et `sqlEditorRoleRestored=true`. Un résultat booléen manquant est un échec ; le seul skip explicite concerne un bucket absent et ne permet pas de valider Storage.

Même avec tous ces résultats vrais : **`realAuthHttpVerified=false`**, `storagePhysicalUploadVerified=false` et `storageDeleteVerified=false` restent exacts. Cette recette ne vérifie ni la délivrance d'une session Auth, ni les e-mails, ni un parcours réel de navigateur. Les flags et constantes de release restent fermés ; les étapes d'activation et de recette réelle seront adaptées au retour reçu. Ne pas déclarer F08/F09/Missions opérationnels sur le seul résultat de cette simulation SQL.
