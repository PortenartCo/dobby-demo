# Réglages Dashboard nécessaires au parcours natif

Projet exclusivement : **dobby-family-sync**, référence `pqcdkrwljgvgagzwrcmg`.
Ces opérations sont manuelles. Aucun agent n’a modifié le projet distant.

## 1. SQL

1. Exécuter `01-apply.sql` intégralement dans SQL Editor. Il s’agit d’une transaction.
2. Exécuter `02-verify.sql`, en lecture seule, et transmettre son JSON `verification`.
3. Ne pas lancer le rollback en fonctionnement normal. `03-rollback.sql` documente
   le retrait conservateur des nouvelles API si nécessaire.
4. `04-link-existing-owner.sql` concerne uniquement un propriétaire historique
   dont le compte et le profil natif exact sont déjà connus. Remplacer ses trois
   `NULL` par les identifiants réellement vérifiés avant exécution. Ce script ne
   crée pas de profil et n’en déduit aucun à partir d’un nom. Ne pas transmettre
   à Codex les données personnelles servant à cette identification.

Si une exécution échoue, transmettre le message d’erreur plutôt que supprimer des
objets pour forcer le passage. La modification distante reste non confirmée tant
que le résultat de vérification n’a pas été communiqué.

## 2. Retour Auth vers l’application

Dans **Authentication → URL Configuration** :

- Site URL : `https://portenartco.github.io/dobby-demo/`
- Ajouter aux Redirect URLs :
  `https://portenartco.github.io/dobby-demo/essai-stitch-v7/famille.html*`

Le chemin reste celui du fichier de retour natif ; le suffixe `*` couvre ses
paramètres PKCE, notamment l’identifiant du parcours. Aucun domaine tiers ni
wildcard de domaine n’est requis. Conserver les autres URL utiles déjà autorisées.

Dans **Authentication → Sign In / Providers → Email**, conserver les règles de
confirmation actuelles. Ne pas désactiver la vérification d’e-mail pour contourner
une erreur de recette. Les modèles de confirmation/récupération doivent conserver
le lien Auth normal (`ConfirmationURL`), incluant les paramètres de retour.

Le lien PKCE doit être ouvert dans le navigateur qui a lancé le parcours. Depuis
un autre navigateur, confirmer l’adresse puis revenir à une connexion ordinaire.

Les envois de confirmation et de récupération demandent une messagerie Auth
opérationnelle. Si le service limite ou refuse l’envoi, relever l’erreur ; la
configuration SMTP se trouve dans **Authentication → Email / SMTP Settings**.

## 3. Configuration publique du client

Dans **Project Settings → API Keys**, relever la clé **Publishable**, commençant
par `sb_publishable_`, du seul projet familial. Elle peut être fournie à Codex
pour renseigner `essai-stitch-v7/access-config.js` : cette clé publique est prévue
pour le navigateur et reste soumise aux droits serveur et à RLS.

Ne fournir ni clé Secret, ni service_role, ni mot de passe, ni jeton d’invitation.
Le code refuse les clés secrètes/JWT et fixe l’URL du projet familial.

## 4. Retour attendu pour poursuivre la recette réelle

- Résultat JSON de `02-verify.sql` ou erreur exacte.
- Confirmation de la configuration des URL de retour.
- Clé Publishable publique du projet familial.
- Si nécessaire, confirmation que le propriétaire historique a été relié à son
  véritable profil par `04-link-existing-owner.sql`.

Ces éléments autorisent le raccordement réel ; ils ne prouvent pas encore les
parcours complets avec deux comptes. La recette e-mail, invitation, isolement,
persistance et cérémonies restera distincte des tests locaux.

Références Supabase consultées pour le retour et PKCE :
[Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls),
[PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow),
[Password authentication](https://supabase.com/docs/guides/auth/passwords).
