# Réglages Dashboard nécessaires au parcours natif

Projet exclusivement : **dobby-family-sync**, référence `pqcdkrwljgvgagzwrcmg`.
Ces opérations sont manuelles. Aucun agent n’a modifié le projet distant.

**Pour les deux comptes de synchronisation de l’utilisateur : ne pas exécuter
`04-link-existing-owner.sql`. Le parcours retenu est un nouveau foyer propre,
avec conservation des comptes Auth. Le diagnostic, puis la désactivation
strictement ciblée des deux anciennes appartenances V2, ont été réalisés et
vérifiés manuellement par l’utilisateur. Ne pas réexécuter 06.**

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

Valeurs définitives, confirmées par la capture Dashboard de l’utilisateur du
12 novembre 2026 :

Dans **Authentication → URL Configuration** :

- **Site URL** : `https://portenartco.github.io/dobby-demo/`
- **Redirect URLs** : une entrée exacte `https://portenartco.github.io/dobby-demo/`

Pour DOBBY V7, retirer l’ancienne suggestion
`https://portenartco.github.io/dobby-demo/essai-stitch-v7/famille.html*` si elle
avait été ajoutée. Aucun caractère générique, paramètre ou fragment n’est requis.
Ne pas supprimer d’autres URL appartenant à un usage distinct sans les identifier.

Les demandes de confirmation d’e-mail et de réinitialisation utilisent toutes
cette racine exacte. Supabase ajoute lui-même son code de retour. La racine relaie
ce code au routeur natif puis il est effacé de l’URL visible avant le chargement
des illustrations. Le vérificateur PKCE reste dans le stockage natif du navigateur ;
il n’est ni ajouté à l’URL ni exporté.

Après le retour : un compte lié retrouve la Cheminette puis le Chemin de Traverse ;
un nouveau compte reprend le profil puis la création ou l’acceptation du foyer ;
une récupération valide affiche d’abord le changement de mot de passe. Les
cérémonies déjà terminées ne sont pas rejouées.

Dans **Authentication → Sign In / Providers → User Signups**, activer
**Allow new users to sign up** (modification signalée par l’utilisateur le
12 novembre 2026). Conserver la confirmation d’e-mail.

Dans **Authentication → Sign In / Providers → Email**, conserver les règles de
confirmation actuelles. Ne pas désactiver la vérification d’e-mail pour contourner
une erreur de recette. Les modèles de confirmation/récupération doivent conserver
le lien Auth normal (`ConfirmationURL`), incluant les paramètres de retour.

Le lien PKCE doit être ouvert dans le navigateur qui a lancé le parcours. Utiliser
le dernier e-mail demandé : une nouvelle demande remplace le parcours précédent.
Depuis un autre navigateur, confirmer l’adresse puis revenir à une connexion
ordinaire ; une récupération demande un nouveau lien dans le navigateur utilisé.

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

- Vérification structurelle SQL déjà reçue et contrôlée : ne pas réexécuter
  `01-apply.sql` pour ce changement d’URL.
- Confirmation de la configuration des URL de retour.
- Clé Publishable publique déjà reçue et intégrée au client familial.
- Si nécessaire, confirmation que le propriétaire historique a été relié à son
  véritable profil par `04-link-existing-owner.sql`.

Ces éléments autorisent le raccordement réel ; ils ne prouvent pas encore les
parcours complets avec deux comptes. La recette e-mail, invitation, isolement,
persistance et cérémonies restera distincte des tests locaux.

Références Supabase consultées pour le retour et PKCE :
[Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls),
[PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow),
[Password authentication](https://supabase.com/docs/guides/auth/passwords).
