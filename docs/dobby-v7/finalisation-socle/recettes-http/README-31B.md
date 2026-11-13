# Diagnostic 31b — Parent A, état d'accès « unavailable »

Le premier résultat 31 s'arrête avant toute requête HTTP. Le diagnostic natif reçu indique que le contrôleur d'accès est chargé, mais son état reste `unavailable`. Cela ne démontre ni un refus Supabase, ni une erreur de mot de passe, ni un problème précis de données locales.

Dans **la même fenêtre Parent A, sur le même écran Famille**, copier le fichier complet [31b-auth-context-readonly.js](31b-auth-context-readonly.js) dans la Console, puis Entrée. Ne pas se déconnecter, ne pas appeler `ready` ou `refresh`, ne pas vider de stockage, ne rejouer aucun SQL. Renvoyer uniquement le JSON produit, sous l'étiquette « Parent A ».

Le script accepte seulement l'état natif exact déjà constaté. Il lit la session et la clé publique en mémoire, exige une marge d'expiration d'au moins deux minutes, puis fait **GET Auth `/user`**. Il compare son sujet à ceux de la session stockée et de la connexion native avant de faire le second et dernier **GET du contexte PostgREST**. Aucun refresh, retry, écriture locale ou mutation n'est demandé. Un refus Auth arrête le contrôle avant le GET du contexte.

Le résultat contient uniquement des booléens, statuts HTTP et codes de phase/diagnostic fixes. Il ne contient aucun UUID, nom, e-mail, jeton, URL ou message brut. Les trois messages locaux connus sont convertis en codes fixes uniquement s'ils sont réellement exposés par l'état d'accès ; le code actuel peut avoir perdu cette erreur en interceptant l'échec initial.

Si le contexte serveur est actif, le script lit également la seule clé locale `deviceHouseholdId`, utilisée par le guard natif. Seuls `deviceHouseholdMarkerPresent` et `markerMatchesServer` sont retournés, en booléen ou `null` : la valeur locale n'est jamais affichée, changée ou supprimée. Aucun contenu familial ni file d'opérations locale n'est parcouru.

`DIAGNOSTIC_COMPLETE` ne vaut **pas** réussite du contrôle 31. Si Auth et contexte répondent correctement tandis que l'état local reste indisponible, le rapport localise cette différence sans affirmer quel guard ou quelle ancienne requête a échoué. Aucune capacité n'est ouverte et le paquet 32 reste suspendu.

Validation locale : **30 tests ont réussi**, y compris un échec réel de `bind()` avec le contrôleur natif importé, qui publie `unavailable` sans conserver l'erreur initiale. Le test se lance depuis la racine du worktree DOBBY, avec `node --test /workspace/scratch/dobby-socle/auth-http-readonly/31b-auth-context-readonly.test.cjs`. Aucun appel réel à Supabase n'est effectué par l'agent.
