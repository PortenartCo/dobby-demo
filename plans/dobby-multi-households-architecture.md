# Dobby — décision d'architecture multi-foyers (2026-11-08)

## Décision
Adopter **Supabase personnel Dobby** comme source canonique pour les données synchronisables, et **IndexedDB** comme copie locale + file de mutations hors ligne. Conserver l'app V5 actuelle et la synchronisation V1 testée en état tant que l'évolution n'a pas passé les recettes iPhone. Ne jamais raccorder les projets Supabase Portenart.

## Constats vérifiés dans le dépôt
- Pilote: `public.dobby_sync_members(user_id PK, active)` ; `public.dobby_sync_grocery_items` sans `household_id`.
- Les politiques courses actuelles donnent accès aux **mêmes lignes à tous les membres actifs**. **Ajouter un troisième membre à cette table serait une fuite de données.**
- L'écriture a une révision de ligne et une suppression logique ; le client repose sur IndexedDB et un compare-and-swap.
- Les données V5 menus/recettes/historique restent dans localStorage. L'import de liste n'est pas idempotent serveur de manière prouvée.
- La désactivation de l'inscription publique a été confirmée par l'utilisateur, non vérifiée via administration.
- Le connecteur Supabase présent dans cette session n'expose que les projets professionnels, pas le projet personnel Dobby. Aucun SQL n'a été exécuté.

## Modèle cible minimal

- `households(id uuid PK, name, created_by, created_at)`
- `household_members(household_id FK, user_id FK auth.users, role [owner|member], active, joined_at, PK(household_id,user_id))`
- `grocery_items(id, household_id NOT NULL FK, title, quantity, unit, checked, revision, deleted_at, ...)`
- `recipes(id, owner_user_id, household_id nullable, visibility [private|household], source, title, ingredients, instructions, thermomix_variant, conversion_status, ...)`
- `meal_plans(id, household_id, date, slot, recipe_id, portions, revision, ...)`
- autres domaines ajoutés par lots: missions, événements, maison, documents; ne pas créer les tables médicales pendant cette migration.
- `recipe_shares` explicite à terme pour les échanges entre foyers ; pas de visibilité globale par défaut.
- Les comptes Auth sont distincts des foyers : un utilisateur peut rejoindre plusieurs foyers **plus tard** si le besoin est validé; commencer avec un foyer par utilisateur dans l'interface.

## Sécurité non négociable

- RLS sur toute table exposée : `USING` et `WITH CHECK` vérifient l'appartenance **active au household_id de la ligne**; le simple rôle `authenticated` ne suffit pas.
- Le client ne peut pas changer `household_id` pour prendre la propriété d'une ligne tierce. Pour toute mise à jour, vérifier ancien et nouveau foyer; envisager colonne immutable ou RPC sûre.
- `household_members` ne peut pas être modifiée par un membre ordinaire. Invitations et changements de rôle via administration sécurisée, sans secret dans le navigateur.
- Accès individuel aux données médicales ou privées, distinct des données du foyer. Aucune information de santé envoyée automatiquement à l'IA.
- Storage privé et politiques par chemin/foyer avant dépôt de contrats ou documents.
- La clé `service_role` est exclusivement côté serveur, jamais dans GitHub ni dans l'application.
- Test en tant que comptes distincts: foyer A n'a ni SELECT, INSERT, UPDATE, DELETE, ni accès Storage au foyer B; utilisateur non membre refusé.
- Supabase ChatGPT : aucune écriture directe sans mécanisme d'autorisation; développer un adaptateur/outil métier unique (requête typée, validation, identité de l'utilisateur, traçabilité) réutilisé par ChatGPT et Dobby. Ne pas présumer qu'un connecteur ChatGPT en lecture/écriture est disponible à tous les utilisateurs.

## Migration progressive et rollback

0. Obtenir accès **lecture seule** au vrai projet Dobby et contrôler DDL/RLS, Auth settings, nombre de lignes et sauvegarde/export; pas de test des données personnelles dans les projets Portenart.
1. Écrire une migration versionnée et testable en environnement distinct; pas de DDL direct sur la base Dobby active avant validation du plan de retour arrière.
2. Créer foyer initial et rattacher exactement les deux comptes existants, sans exposer leurs identifiants dans GitHub.
3. Faire migrer le panier avec `household_id`, par une opération transactionnelle contrôlée. Revoir les policies et grants **dans la même fenêtre**, éviter tout intervalle où un nouveau compte voit des articles sans filtre.
4. Faire adopter au client le foyer explicite, les identifiants stables et une file de mutations compatible; protéger les mutations locales créées avant migration.
5. Test complet Edge/Chrome + test négatif par troisième compte, puis Safari iPhone A/B, offline/conflits/reconnexion. Aucune ouverture à des amis avant PASS.
6. Version de recette existante préservée; migration repas/recettes sur un lot séparé, avec sauvegarde et déduplication.
7. Activer invitations contrôlées pour un foyer ami de test; vérifier l'isolation avant extension.

Rollback : restaurer app V5/pilote sans changement de code en production; restauration SQL/backups prévue avant migration, ne pas supprimer les anciennes structures tant que les deux clients n'ont pas passé la recette.

## IA et conversion Thermomix

- Entrées photo, PDF, URL ou texte; extraction structurée puis **proposition** de conversion (température, vitesse, sens inverse, durée, accessoires).
- Prévisualisation + validation utilisateur; statut `draft` / `reviewed` / `tested`, jamais `tested` par défaut.
- Vérification sécurité et compatibilité du modèle Thermomix; conserver source/provenance et historique de versions.
- Enregistrer via endpoint sécurisé avec droits sur `household_id`, et non une clé administrative embarquée dans le prompt.
- Contrôles coûts : limite de taille, tarif/unité, budget, consentement avant traitements volumineux.

## Gates de phase

G1 : structure et RLS multi-foyers testées sur **environnement isolé**; aucune fuite inter-foyers.
G2 : reprise de la synchronisation courses existante, y compris les conflits et le hors ligne.
G3 : import recette et variante Thermomix avec validation, déduplication et provenance.
G4 : deux iPhone + amis pilotes isolés; sauvegarde et restauration vérifiées.

**État : document de décision préparatoire uniquement. Aucune migration Supabase appliquée et aucune inscription réouverte.**
