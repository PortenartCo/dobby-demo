# Dobby Sync V2 — essai isolé multi-foyers

## Statut au 08/11/2026
- Dossier créé par copie exacte du pilote V1 puis adaptation de `app.js` et de l'interface.
- Base visée : projet personnel `pqcdkrwljgvgagzwrcmg`, tables `dobby_v2_households`, `dobby_v2_memberships`, `dobby_v2_grocery`.
- Les deux comptes du foyer existant ont été rattachés par l'utilisateur. Les trois articles ont été copiés V1 -> V2 par SQL Editor.
- Les tests RLS sous rôle et identité simulés ont réussi : lecture membre 1 foyer / 1 appartenance / 3 articles, lecture non-membre 0 / 0 / 0, insertion non-membre refusée.
- **Le client V2 modifié n'a PAS été testé en navigateur.** Les résultats RLS ne certifient pas le comportement du frontend ou l'isolation de deux foyers réels.
- Production et pilote V1 inchangés. **Il ne s'agit pas encore de la vue intégrée Stitch V5.**

## Adaptation du pilote
- IndexedDB distinct `dobby-sync-pilot-v2` : aucune collision avec le cache V1.
- Après authentification, l'utilisateur doit avoir exactement **un** foyer actif : refus explicite sinon; sélection multi-foyers future.
- Toute lecture/écriture courses utilise `dobby_v2_grocery` **avec `household_id`**, et les INSERT l'incluent.
- Le protocole de révisions, suppression logique, résolution de conflits et reprise hors ligne est repris de V1.
- Vérification d'accès au foyer via `dobby_v2_households`, et cache effacé si le foyer change dans la même session.
- **Ne pas utiliser pour des données essentielles** tant que les tests n'ont pas passé.
- Attention : la table V2 contient une copie à un instant T. Une modification réalisée dans V1 ne se reporte pas automatiquement dans V2.

## Recette minimale avant intégration V5
1. Publier ce dossier sur une URL d'essai réellement isolée : ne pas changer la source de GitHub Pages utilisée en production.
2. Vérifier que la connexion avec chaque membre du foyer renvoie exactement trois articles V2.
3. Modification A -> B, B -> A, coche, suppression logique.
4. Modification hors ligne, fermeture/rechargement, reconnexion, reprise puis conflit des deux côtés.
5. Une identité extérieure, puis un vrai foyer B test, ne doivent ni lire ni modifier le foyer A.
6. Les auteurs/revisions/household_id et timestamps doivent être observés côté Supabase.
7. Vérifier le résultat sur les deux iPhone Safari avant bascule.

## Limitations connues
- L'app de démonstration V2 reprend un seul foyer actif par compte; un utilisateur multi-foyers doit être bloqué au lieu d'accéder à un foyer arbitraire.
- Pas encore d'import depuis le planning repas V5 ni de conversion IA.
- Aucune migration SQL exécutée par les commits GitHub.
- Les tests unitaires et e2e du client adapté restent à exécuter. Ne pas appeler ce prototype « intégré ».
