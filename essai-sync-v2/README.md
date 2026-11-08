# Dobby Sync V1 - pilote isole

## Objectif
Valider la synchronisation automatique bidirectionnelle d'une liste de courses entre deux iPhone, avec stockage local hors ligne, reprise et controle des conflits.

## Isolation
- Branche de developpement : `feature/dobby-sync-v1`.
- Aucun changement de la production `main/index.html`.
- Aucun changement des essais graphiques Stitch, notamment `essai-stitch-v5/`.
- Base Supabase Dobby dans une organisation Free PERSONNELLE distincte de Portenart ; aucune reutilisation de secret ni de base professionnelle.
- Aucun donnees reelles avant validation des permissions et de la restauration.

## Conception minimale retenue
1. Stockage local des articles et de la file de mutations en IndexedDB (IDs stables, versions, indicateurs de suppression).
2. Ecriture locale immediate puis synchronisation a l'ouverture, a la reprise et au retour du reseau, et lorsqu'une mutation existe.
3. Synchronisation enregistrements individuels ; detection des conflits (pas d'ecrasement silencieux).
4. Un foyer, deux utilisateurs distincts via Supabase Auth ; RLS restrictive sur toutes les tables exposees.
5. Cle publipubliable uniquement cote client ; aucune cle secrete / service_role dans le depot.
6. Tests d'isolation, de reprise offline, d'idempotence et de restauration avant toute migration.

## Gate de validation
- Ajouter/modifier/cocher/supprimer un article sur iPhone A et verifier la repercussion sur B.
- Creer des mutations hors ligne sur A et B ; verifier leur conservation et la reconciliation sans ecrasement.
- Verifier que le client non autorise ne lit ni ne modifie aucun article.
- Tester la fermeture puis reouverture, la perte/reprise de reseau et les erreurs serveur.
- Ne basculer aucun module supplementaire avant un pilote reel PASS.

## Etapes ulterieures
Apres PASS de Courses : Missions, Calendrier, Repas et dependances recette minimales ; sauvegarde et migration controles.

## Etat
Organisation Free Dobby Personnel : creee et verifiee dans le tableau de bord.
Projet dobby-family-sync : cree, Healthy, region eu-central-1.
Code de pilote autonome : cree sur la branche, tests unitaires du coeur 8/8 PASS en environnement local; pas encore publie ni teste sur iPhone.
Deux comptes de test rattaches : retour SQL utilisateur 2 / 2 ; configuration RLS lue conforme. Authentification reelle, requetes REST et tests iPhone encore a verifier.
Production : inchangee.

## Pilotage et limites de validation
- L'interface de test (index.html) ne modifie **pas** la liste de courses de Dobby V5.
- Le projet Supabase conserve uniquement les articles de courses du laboratoire (aucune photo ou document).
- Chaque iPhone doit saisir une fois la cle publique `sb_publishable_...` via les parametres du pilote, jamais une cle secrete.
- L'URL Supabase est fixe ; compte et mot de passe sont saisis sur chaque iPhone sans etre inscrits dans GitHub.
- Tests unitaires locaux du coeur executes : 8/8 PASS ; cette preuve **n'est pas** un test de production ou une recette de synchronisation iOS.
- Pour tester, publier **uniquement** le repertoire `essai-sync-v1/` sur une URL isolee, sans modifier `/index.html` ni `essai-stitch-v5/`.
- Avant l'utilisation reelle, controler requetes REST de deux comptes, acces refuse d'un tiers, fonctionnement hors ligne, conflits et rechargement iOS.
- Supabase Auth : deux comptes creees ; envisager de desactiver les inscriptions publiques pour ce pilote ferme.
