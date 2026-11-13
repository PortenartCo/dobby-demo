# Refus de connexion constaté pendant la recette réelle

Le bouton « Se connecter » a affiché un message commun aux réponses HTTP 401 et
403. Ce message ne permettait pas de distinguer un refus du service Auth d’un
refus du RPC familial après installation de la session. La cause réelle reste
à établir ; aucun compte, mot de passe, droit ou foyer n’est modifié par ce correctif.

Les erreurs de connexion comportent désormais une référence fixe :

| Référence | Étape ayant refusé la demande |
| --- | --- |
| `CONNEXION-401` ou `CONNEXION-403` | Service Auth, avant installation de la session |
| `CONNEXION-400-IDENTIFIANTS` | Auth a renvoyé `invalid_credentials` |
| `CONNEXION-400-EMAIL` | Auth demande la confirmation de l’adresse |
| `FOYER-403` | Vérification du contexte familial par RPC |

Le transport conserve les codes PostgREST et les raisons GoTrue, y compris
l’enveloppe `{code:400,error_code:"invalid_credentials"}`. Les messages serveur,
adresses, UUID, mots de passe et jetons ne sont jamais ajoutés au diagnostic affiché.
La saisie est conservée ; aucune tentative automatique supplémentaire n’est ajoutée.

Le fichier [09-diagnostic-login.sql](supabase/09-diagnostic-login.sql), à exécuter
manuellement dans le seul projet familial, examine les autorisations et simule
le contexte en base pour chaque compte. Il retourne uniquement des compteurs,
des phases et des SQLSTATE. La transaction est en lecture seule et annulée.
Ce contrôle ne valide ni le mot de passe, ni la clé API, ni le JWT, ni PostgREST.
Transmettre uniquement la cellule JSON `login_diagnostic`.

Ne relancer aucun reset, ni `01-apply.sql`, ni `04-link-existing-owner.sql`.
Les étapes création du foyer, invitation, acceptation et synchronisation réelle
restent à vérifier après résolution de la connexion.
