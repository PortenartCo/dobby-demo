# Dobby V5 - raccordement prudent au panier familial

## État du pilote (08/11/2026)

L'utilisateur a validé manuellement sur PC :
- deux comptes authentifiés et autorisés ;
- les articles et modifications dans les deux sens Edge / Chrome ;
- saisie hors ligne sous Edge, conservation après F5, reconnexion puis récupération sous Chrome ;
- détection d'un conflit d'édition et résolution « version familiale » ;
- détection du second conflit et résolution « garder ma version », propagée à l'autre navigateur.

**Non validé :** Safari/iOS, usage prolongé, réinstallation/restauration, absence de pertes après nettoyage du stockage, test négatif avec un compte non autorisé.

## Sources inspectées

- `essai-stitch-v5/index.html` (SHA blob `d27737f12d310b000ffa1d7a7b3f7373b1bd58b4`)
  - `st.planned` : repas et portions localement conservés ;
  - `shoppingDraft()` : agrégation des ingrédients des recettes ;
  - `st.shopChoice` : « à acheter / pas nécessaire » ;
  - `st.extras` : achats complémentaires, simples chaînes de caractères ;
  - `validateshop` : fabrique `st.shopFinal.items` et `st.shopHistory` ;
  - `st.shopFinal.items[*]` : `{name, detail, category, done}` sans identifiant pérenne ni quantité structurée ;
  - `data-finalcheck` : coche seulement la liste locale ;
  - `save()` : localStorage `dobby-stitch-preview-20261105`.
- `essai-stitch-v5/stitch-v5.js` (SHA blob `2eb878664e4b7fdb72568f88f35f863686bcebda`) :
  surcouche de présentation V5 ; modifie `drawHome`, `drawFamily` et `render`, mais pas `drawShop`.
- `essai-sync-v1/` : prototype validé sur PC ; Supabase `dobby-family-sync`, table `public.dobby_sync_grocery_items`, authentification et RLS.

## Décision d'architecture

**Ne pas remplacer aveuglément le stockage V5 par Supabase.** Les structures actuelles ne sont pas équivalentes. La liste des ingrédients est dérivée du planning des repas et figée à la validation ; les repas et le statut « couverts par les courses » sont encore propres à chaque navigateur.

Choisir un raccordement en deux paliers :

1. **Panier familial canonique.** Garder `dobby_sync_grocery_items` comme source de vérité des articles partagés, états cochés, suppressions logiques et révisions. Un membre peut créer/modifier/cocher depuis le même écran intégré à V5. Réutiliser le moteur et les garanties d'idempotence de Sync V1.
2. **Import explicite depuis les menus.** Lorsque la préparation locale est validée, offrir un bouton « Ajouter au panier familial » avec prévisualisation, détails et confirmation. Ne pas synchroniser automatiquement `st.planned` ni `st.shopHistory` tant que le domaine « Repas partagé » n'est pas construit.

## Contraintes à satisfaire avant codage du pont

- Conserver `st.shopHistory` et `st.planned` intacts, sans nettoyage lors du premier login.
- Ne pas marquer localement les repas comme « achetés » si l'envoi au panier familial n'a pas été confirmé.
- Donner un identifiant stable à chaque élément de liste validée ; les valeurs `name/detail/category` seules sont insuffisantes pour empêcher les doublons après retry ou double validation.
- Préserver la quantité structurée **ou** signaler « quantité non précisée » ; ne jamais convertir silencieusement un détail « Quantité non précisée » en 1 unité.
- Éviter les imports implicites de listes historiques : seules les listes explicitement sélectionnées pourront être exportées vers Supabase.
- Les cases cochées du panier partagé proviennent de la base et du moteur IndexedDB, pas de `st.shopFinal.items[*].done`.
- La synchronisation ne doit pas exiger que la page reste ouverte en arrière-plan sur iPhone : l'envoi se fait à la reprise / ouverture.
- L'interface de prototype est publiquement consultable sur GitHub Pages ; seuls les comptes autorisés peuvent lire/écrire les données ; pas de service key ni secret dans le client.
- Utiliser le même compte de chaque iPhone pour les quatre modules à terme ; refuser les inscriptions spontanées si les deux comptes sont déjà créés.

## Définition « intégré » - critères DONE

1. Branche distincte, prévisualisation isolée ; SHA des fichiers de `/index.html` production et `essai-stitch-v5/index.html` inchangés tant que la recette n'est pas terminée.
2. Dans la vue Courses de V5 intégrée, les deux utilisateurs voient la **même** liste familiale.
3. Les modifications, y compris offline, sont identiques et récupérées après redémarrage.
4. La liste de courses construite depuis le planning est exportable **une fois**, sans doublons après retry.
5. Tous les statuts ambigus (quantité inconnue, conflit, session expirée, quota) sont visibles, sans succès annoncé à tort.
6. Test de refus pour compte non membre ; contrôle RLS et grants ; fermeture des inscriptions publiques.
7. Test Safari iPhone A/B sur vraie connexion et hors ligne avant de toucher à la production.
8. Retrait progressif du panier prototype seulement après reprise validée ; archivage de l'historique local.

## Ordre d'exécution

A. Sécuriser les inscriptions publiques (Authentication > Sign In / Providers > « Allow new users to sign up » = off, en vérifiant d'abord les deux comptes).

B. Préparer sur une branche **distincte** une vue V5 intégrée, sans modifier la prévisualisation déjà validée.

C. Ajouter un import explicite idempotent de la liste validée, et modéliser les quantités imprécises.

D. Recette Edge / Chrome puis Safari iPhone ; seulement ensuite envisager le remplacement progressif.

**Aucune migration SQL additionnelle ni modification de V5 n'a été exécutée par la création de ce document.**
