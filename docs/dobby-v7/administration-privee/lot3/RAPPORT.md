# Lot 3 — administration, invitations et callbacks locaux

18 novembre 2026 · [PR #31 en brouillon](https://github.com/PortenartCo/dobby-demo/pull/31), empilée sur #30. Le circuit serveur et ses callbacks sont fonctionnels et éprouvés sur Auth local, sans déploiement.

Base exacte : `24ab5b7944c34c9f29ede5867f4715111b5c2f47`. Code testé : `4ce4890d1266aa5d21568d47729038054b2aa368`. Checkpoints : `725a306` préparation, `f1ada65` contrats/tests, `ec3c2fb` implémentation. Les documents #27 ont été lus au commit `440cc2394c2dd5e9865a9b71fcd17b43e351f034` sans fusion ; aucun AGENTS.md applicable trouvé.

## Résultats réellement exécutés

| Campagne | Résultat final | Niveau de preuve |
|---|---|---|
| Auth/API métier | **16/16 PASS** | [HTTP réel](preuves/auth-http.log), [runtime/scénarios](preuves/auth-local.json) : GoTrue 2.197.0, PostgREST 14.18, Mailpit 1.34.0, Node 24 et factory Deno HTTP |
| PostgreSQL du Lot 3 | **14/14 PASS** | [Journal SQL](preuves/admin-sql.log), vraie DB et claims SQL fictifs |
| Frontière Edge | **18/18 PASS** | [Tests unitaires à transport injecté](preuves/admin-edge.log), pas une preuve Auth physique |
| Clients/transports affectés | **191/191 PASS** | [Journal ciblé](preuves/callback-client.log), fixtures et VM du vrai driver |
| Chromium | **1 test / 3 scénarios PASS** | [Journal navigateur](preuves/callback-browser.log), [versions](preuves/browser-meta.json), vrais Auth/SQL/SMTP et contextes isolés |
| Composition catalogue existant | **6/6 PASS** | [Régression causale](preuves/catalogue-composition.log), aucune campagne Storage répétée |

Zéro échec/omission dans ces passages finaux. [Deno 2.9.6 check](preuves/deno-check.log) passe ; sa factory TypeScript a aussi servi de vraies requêtes locales propriétaire/non-propriétaire. Aucun worker Supabase Edge hébergé ni gateway Kong certifié. Les fichiers exacts, commandes et empreintes sont dans [RESULTATS.json](RESULTATS.json).

Le navigateur charge les modules livrés d'entrée, contrôleur et core dans un harnais HTML minimal. Il prouve le second navigateur, la confirmation explicite, le reload/retour par mot de passe et le refus sans consommation depuis un autre compte connecté. La page familiale complète et son provider ne sont pas recettés par ce harnais ; le vrai driver `family-v2` est vérifié séparément en VM.

## Comportement livré

L'Edge et chaque opération SQL revérifient l'UUID propriétaire et la session. Le rôle familial n'accorde pas l'administration ; le propriétaire global n'a pas de droit de lecture supplémentaire sur H2. Les listes sont projetées et paginées, sans contenu familial, métadonnées utilisateur arbitraires, JWT ou bearer V7. Le client élevé ne sert qu'aux routes Auth fermées ; les RPC gardent le JWT utilisateur.

Un Parent crée seulement une demande nominative dans son foyer canonique. Décision, CAS, opérations idempotentes et historique précèdent l'envoi. Nouveau compte par invitation Admin ; compte confirmé existant par connexion sans création ; reprise explicite d'un invité non confirmé par réinvitation du **même UUID**, comportement GoTrue réellement vérifié avec signup fermé. Aucun envoi automatique après une opération incertaine et aucun compte dupliqué.

La session d'admission ne peut lire que son contexte borné et consommer sa propre admission. `/verify` exige un clic explicite ; les secrets d'URL disparaissent avant les ressources. L'autorisation, le profil adulte et la liaison familiale sont confirmés dans une seule transaction, avant adoption native. Un enfant reprend son identifiant TEXT canonique et conserve exactement les modules, magie, crédits fictifs non vides et révisions. Les anciennes invitations libres sont fermées côté serveur.

Suspension/révocation invalident les admissions et liens ouverts sans suppression de données. La réactivation utilise les deux transactions du Lot 1 et exige une nouvelle session ; un refresh réel d'une ancienne session peut encore réussir chez Auth, mais le RPC métier reste **HTTP 403**. Aucun ancien droit de création ne revient ; seule une nouvelle décision explicite et bornée peut donner le premier quota à un compte sans aucun foyer, lien ou reçu antérieur.

Les pertes de résultat avant/après confirmation et la mort d'un worker ont été injectées autour de véritables actions Auth/SMTP/DB, sans simuler leurs réponses positives. L'approbation immuable ne peut traverser la réactivation d'un sujet encore non lié. Les liens enfants valides bloquent un nouvel envoi et les expirés sont révoqués en historique avant remplacement.

## Matrice PASS / FAIL / BLOCKED

| Référence | Local | Réserve |
|---|---|---|
| T03 nominatif, expiration, mauvais compte, concurrence/rejeu | PASS | Partager le bearer Auth peut faire endosser l'UUID invité ; pas une preuve d'identité physique. |
| T04 demandes Parent/adulte/enfant | PASS dans la fixture | Livraison enfant de production **BLOCKED** par les gates inchangées et la recette F08/F09 distincte. |
| T12 propriétaire exclusif/confidentialité | PASS | Aucun droit Auth hébergé ou console Lot 4 certifié. |
| T13 saga, incertitude, second navigateur, PKCE | PASS | Lease 180 s accélérée par horloge SQL fictive ; expiration OTP 2 s réellement écoulée. |
| T05/T10 connexion/refresh/récupération et réactivation | PASS | Comptes exclusivement fictifs ; aucun essai sur de vrais Parents A/B. |

L'expiration d'admission/lien familial est injectée dans l'horloge SQL de la fixture, distincte de l'OTP GoTrue 2 s réellement expiré. Le premier passage métier était **10/13** : deux reprises d'invité non confirmé et le REVOKE du rollback ont été corrigés. Les quatre constats de la [revue indépendante](REVUE.md) ont leurs contre-épreuves RED→GREEN conservées ; aucun échec intermédiaire n'est présenté comme un succès.

## Fichiers, rollback et reprise

Fichiers modifiés : nouvelle [migration](../../../../supabase/migrations/20261118120207_dobby_private_access_administration.sql) et [rollback](../../../../supabase/rollbacks/20261118120207_dobby_private_access_administration.sql), Edge et trois helpers partagés, callbacks/transport dans six modules existants plus relais racine, nouvelle fixture Auth et tests. Deux modules de test existants n'ont changé que pour composer le catalogue avec les vraies tables GoTrue. Liste exhaustive et empreintes dans RESULTATS.json.

Le rollback testé ferme la nouvelle administration/livraison, conserve décisions, suspensions, générations, comptes et liaisons consommées, et laisse les anciens membres actifs se connecter. Il ne rouvre ni invitations libres ni signup. Il n'accorde aucun rôle Auth géré. Procédure et arrêt/reprise de saga : [REPRISE.md](REPRISE.md).

Aucune ancienne migration modifiée, aucun effet saisonnier ou console Lot 4 développé. Les droits Auth minimaux et la visibilité sous RLS ont été fournis **par le propriétaire local fictif seulement** ; leur disponibilité hébergée reste bloquante. Les anciennes URLs et tokens Storage du Lot 2B restent non éteints et non retestés ici. Aucun accès/changement Supabase hébergé, e-mail réel, compte réel modifié, fusion ou publication applicative. Les ressources propres aux tests ont été retirées ; le worktree et la branche restent conservés.
