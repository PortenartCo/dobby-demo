# Lot 4 — checkpoint initial

18 novembre 2026. Développement et recette locale de la console Administration DOBBY, sans déploiement.

- Dépôt : `PortenartCo/dobby-demo`.
- Base obligatoire PR #31 vérifiée par Git et API GitHub : `3c850d5e2235aedbafbbdc0d1e4fb9e9f358956c`.
- Nouvelle branche isolée : `feat/dobby-private-access-lot4-20261118-5n_jy1ba`.
- Dépendances #30/#29/#28 ; issue #19 et contrat Lot 3 relus.
- Plan et conception lus au commit documentaire `440cc2394c2dd5e9865a9b71fcd17b43e351f034`, sans fusion de sa branche.
- Aucun `AGENTS.md` applicable trouvé dans le dépôt ou ses parents.

## Travail prévu

1. Raccorder cinq vues au routeur de la véritable V7, avec header et six rubriques du dock conservés. Une vérification propriétaire par le serveur Lot 3 précède l'entrée distincte du Menu.
2. Ajouter un transport natif borné vers les commandes existantes, les demandes familiales nominatives et les états propres au compte. Conserver les profils locaux, la récupération et les callbacks ; retirer l'inscription publique de l'interface de production.
3. Protéger les réponses en vol, les confirmations, révisions CAS et identifiants d'opération. Conserver les modifications locales lors d'un refus ; aucune reprise automatique des transmissions non autorisées.
4. Tester les scénarios causaux T03/T05/T10/T11/T12 dans la vraie page avec Auth/PostgREST/SMTP locaux fictifs et le serveur Lot 3. Contrôler quatre largeurs, erreurs, listes et changements de compte. Produire les captures et un aperçu interactif isolé.
5. Sauvegarder les étapes stables après contrôle de confidentialité, puis livrer une PR en brouillon empilée sur #31 avec les résultats et limites.

## État des preuves et limites

Aucun test Lot 4 n'est déclaré réussi à ce checkpoint. Les résultats des lots précédents restent historiques. Les tests locaux utiliseront uniquement des comptes et données fictifs ; leurs secrets temporaires ne seront pas publiés.

Aucun accès Supabase hébergé, aucune migration distante, aucun compte réel, aucun e-mail externe, aucune fusion ni publication applicative. Les gates enfants de production restent fermées. Aucun changement des effets saisonniers ou des migrations antérieures.

Les réserves restent explicites : les liens Storage et jetons d'upload déjà signés peuvent survivre à une suspension ; les droits effectifs sur `auth.sessions` sous RLS et les permissions Auth gérées doivent être vérifiés avant tout déploiement autorisé.
