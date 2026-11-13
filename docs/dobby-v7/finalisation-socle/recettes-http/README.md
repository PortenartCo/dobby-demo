# Prochain contrôle HTTP — lecture seule, sans activation

Le contrôle SQL `30` a déjà réussi sur le serveur familial : **38/38**, aucune table modifiée après annulation et flags fermés. **Ne pas le répéter.** Ce contrôle suivant utilise les endpoints HTTP réels depuis votre navigateur, avec votre session DOBBY existante. L'agent ne se connecte pas à Supabase.

Le même fichier [31-auth-http-readonly.js](31-auth-http-readonly.js) sert aux deux Parents puis au troisième compte de recette. Il ne demande aucune valeur à remplacer. Il appelle les RPC SQL **STABLE par GET direct** : `dobby_v7_context`, `dobby_v7_family_capabilities` et, pour un Parent lié, `dobby_missions_v3_capabilities`. Il fait ensuite un **GET Auth `/user`** sur le seul projet familial pour confirmer que la session HTTP correspond au contexte. Il n'appelle pas le transport `authorized`, qui pourrait renouveler une session : **aucun refresh, retry, POST de secours ou écriture de métadonnées** n'est effectué. Il n'enregistre ni profil, ni foyer, ni invitation et n'ouvre aucun flag.

## Manipulation minimale

1. Dans l'espace navigateur habituel du **Parent A**, se connecter normalement à [DOBBY](https://portenartco.github.io/dobby-demo/), puis ouvrir **Famille**. Attendre la fin du chargement.
2. Ouvrir les outils de développement du navigateur, onglet **Console**. Copier le fichier JavaScript **entier**, le coller, puis Entrée. Copier uniquement le JSON commençant par `"verification": "dobby-socle-auth-http-readonly-v1"`. Le résultat ne contient aucun nom, e-mail, UUID, clé ou jeton. Indiquer simplement « Parent A » à côté du résultat.
3. Faire la même chose dans l'espace indépendant du **Parent B**, et indiquer « Parent B ».
4. Dans un espace de navigateur distinct ou après déconnexion normale d'un espace de recette, choisir **Connexion** avec le **troisième compte Auth déjà créé**, sans le recréer. S'arrêter à l'écran **« Mon profil »**. **Ne rien remplir et ne pas cliquer « Enregistrer mon profil »**, ne pas créer de foyer, ne pas utiliser une invitation. Exécuter le même fichier dans la Console et indiquer « Compte de recette » à côté du JSON.

Ne copier ni captures réseau, ni en-têtes, ni stockage navigateur, ni coordonnées du compte. Le script utilise sa session uniquement à l'intérieur d'une fonction privée et n'en retourne aucune valeur. Ne pas fournir l'adresse du compte : aucune identité personnelle n'est nécessaire.

Si le résultat est `FAIL`, transmettre ce même JSON agrégé. Il fournit une étape et une référence fixe, sans reproduire une réponse brute du serveur. `SESSION_NON_PRETE` ou `SESSION_CHANGEANTE` peut nécessiter d'attendre la fin du chargement et de relancer le seul script de lecture ; aucun SQL à rejouer.

Pour `SESSION_NON_PRETE`, le rapport ajoute `nativeReadiness` : uniquement des booléens et un code de phase fixe. Ces valeurs distinguent l'initialisation native de l'état de la façade d'accès ; un écran Famille déjà affiché ne suffit pas à les déduire. Le script ne tente pas d'initialiser la façade, n'appelle ni `ready` ni `refresh`, et n'assouplit aucun contrôle. Renvoyer le JSON avant de modifier le compte ou de prescrire une reconnexion ; aucun SQL n'est nécessaire.

`SESSION_A_RECONNECTER` indique un jeton expiré, dont l'expiration est inconnue, avec moins de deux minutes de validité restante, ou un refus HTTP 401. Le script s'arrête sans renouvellement ni retry. Se déconnecter/reconnecter normalement dans l'interface, puis relancer le script. Les destinations et en-têtes sont fixes pour le seul projet familial ; une redirection HTTP est refusée.

## Résultats attendus

Pour les deux Parents : `result: "PASS"`, `actorClass: "parent-linked"`, contexte canonique cohérent, capacités Famille/Missions disponibles et **tous les flags de publication fermés**. Le GET Auth `/user` doit répondre 200 et correspondre en mémoire au compte connecté.

Pour le troisième compte : `result: "PASS"`, `actorClass: "confirmed-auth-without-profile-or-household"`. Les capacités Famille sont lues, avec `canonicalIdentity` cohérent avec l'absence de lien. Le contrôle Missions est indiqué `not-applicable-before-household-binding` : aucun foyer n'est fourni ou deviné pour ce compte.

Ce résultat prouve les routes HTTP authentifiées de lecture et la session Auth actuelle. Le login par mot de passe est une opération effectuée normalement par l'utilisateur ; le script n'intercepte pas le formulaire et ne certifie pas la requête password-grant elle-même. Il ne teste ni e-mails, ni invitation enfant persistante, ni upload/suppression physique Storage, ni concurrence. Les gates restent fermés.

## Suite à préparer séparément après ces résultats

Le backend familial confirme que les RPC enfant installés peuvent être exercés sans ouvrir les flags clients. La prochaine recette pourra créer explicitement un **profil enfant TEST** par le Parent propriétaire, puis inviter le troisième compte vers cet ID TEXT exact, sans profil provisoire ni invitation adulte. Ce rattachement sera persistant et sera préparé comme une opération distincte, avec contrôle du même ID et du contexte frais. Aucun lien ou jeton ne devra être transmis dans le chat.

Les véritables essais Storage seront également distincts : objet TEST sans contenu personnel, upload/lecture/suppression Parent et refus des écritures enfant. Les wrappers du client peuvent bloquer un enfant avant HTTP ; une preuve du refus du serveur doit donc utiliser un outil privé approprié, avec sa session gardée en mémoire et un rapport agrégé. Aucune activation préalable n'est nécessaire pour ces outils de recette.

## Validation locale du script

Les **42 tests ciblés ont réussi** : mocks de l'interface native et du réseau, exécution du fichier exact dans une Console simulée, puis véritables exports `family-v2.js` en VM dans trois états locaux : boot non prêt, contrôleur d'accès absent, contrôleur chargé encore vide. Les diagnostics échoués ne font aucun HTTP et ne retournent que des booléens/codes fixes. Les garanties GET exclusifs, expirations/401 sans refresh/retry, gardes et confidentialité restent vérifiées. **Aucun appel à Supabase réel ni login Auth réel n'a été effectué par l'agent.**

Commande locale, depuis la racine du worktree DOBBY (les tests VM lisent ses sources réelles) : `node --test /workspace/scratch/dobby-socle/auth-http-readonly/31-auth-http-readonly.test.cjs`. Une autre racine peut être indiquée par `DOBBY_SOURCE_ROOT`. La [preuve locale](local-validation.json) identifie le fichier testé.
