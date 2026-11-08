# Étape 19 — Préparation du raccordement V5 / panier partagé

Date : 2026-11-08

## Confirmation de l'étape 18
L'utilisateur confirme avoir désactivé « Allow new users to sign up » dans Supabase Auth. Cette configuration a été **déclarée par l'utilisateur**, pas relue par une API d'administration. Garder Email Auth actif.

## Environnement isolé
Branche : `feature/dobby-v5-family-basket-integration`
Source : `feature/dobby-v5-sync-bridge`.

Les fichiers suivants sont **gelés**, à ne pas écraser :
- `/index.html` (production) ;
- `/essai-stitch-v5/index.html`, `stitch-v5.js` et `stitch-v5.css` (référence visuelle) ;
- `/essai-sync-v1/` (prototype validé sur PC).

Créer une nouvelle prévisualisation `essai-v5-panier-partage/` uniquement, sans modifier les emplacements gelés.

## Architecture

**Cible du premier palier** : panier canonique Supabase, avec reprise locale IndexedDB, en réutilisant le moteur `essai-sync-v1/app.js` et `core.mjs` sans copier deux fois le moteur métier. La vue Courses doit permettre connexion, ajout, édition, coche, suppression logique, synchronisation, état hors ligne, reprise et arbitrage de conflit.

**Cible du second palier** : import explicite de la liste validée par les menus de V5 vers le panier familial, sans synchroniser ni effacer `st.planned`, `st.shopHistory` ou `st.extras`.

### Dangers et préconditions de l'import

- `st.shopFinal.items` contient `name/detail/category/done`, sans identifiant durable ni quantité structurée. Interdire la supposition « quantité = 1 » pour un détail ambigu.
- `dobby_sync_grocery_items` impose actuellement une quantité numérique. Pour quantité inconnue : **bloquer l'export de cette ligne et demander une quantité explicite**, ou proposer ultérieurement une évolution SQL distincte avec accord préalable. Pas de migration implicite.
- Générer et enregistrer un identifiant durable d'export dans la donnée locale **avant** toute écriture réseau. Un second clic / retry utilise le même identifiant.
- Le protocole serveur actuel doit être audité pour garantir une déduplication durable des imports : l'IndexedDB seule ne suffit pas après suppression de stockage ou depuis un autre appareil. Ne pas déclarer « import exactement une fois » avant preuve d'une contrainte unique ou RPC idempotente serveur.
- Garder les validations de sécurité RLS et comptes autorisés. L'interdiction d'inscription publique ne constitue pas une preuve d'impossibilité d'accès d'un ancien compte non membre.

## Séquence de livraison

1. Cartographier les fonctions d'affichage et les événements Courses dans le gros fichier HTML de V5 ; définir un point de raccordement non destructif.
2. Extraire ou réutiliser le cœur Sync V1 par un adaptateur unique, sans duplication de logique d'édition ni création d'un deuxième panier.
3. Publier une prévisualisation réellement isolée sous `essai-v5-panier-partage/`, testable sur PC.
4. Ajouter ensuite le bouton « Ajouter au panier familial », prévisualisation des lignes, confirmation, gestion des quantités inconnues et preuve d'idempotence côté serveur.
5. Tests Edge/Chrome avec comptes distincts : synchro, offline, reconnexion, deux conflits, absence de doublons, persistance de l'historique local et refus d'un compte non membre.
6. Tests Safari sur les deux iPhone, sans modifier la production, puis décision explicite de bascule.

## Critères de preuve

Ne pas annoncer « intégré » avant qu'une URL d'essai présente l'interface V5 et la liste familiale **dans la même vue Courses**, avec des modifications échangées effectivement entre deux comptes. Une simple iframe juxtaposant les deux prototypes n'est pas une intégration. Les tests unitaires ne remplacent pas une recette multi-appareils.

## État courant

- Étape 18 : confirmation utilisateur reçue.
- Branche d'intégration : créée.
- Étape 19 : préparation documentée, **code de raccordement non encore livré**.
- Production et prototype V5 : aucune modification.
