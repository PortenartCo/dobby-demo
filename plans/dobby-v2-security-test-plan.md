# Dobby V2 - plan de tests RLS / multi-foyers
Document préparatoire. Aucun test serveur exécuté.

## Environnement et comptes
Créer un projet personnel Supabase de test distinct des projets professionnels et du Dobby actif.
Créer comptes fictifs A1, A2 (foyer A) et B1 (foyer B), plus un utilisateur non membre.
Les appartenances sont créées par un administrateur, jamais depuis le navigateur.
Tester avec des JWT utilisateurs réels : une requête sous SQL Editor administrateur ne prouve pas RLS.

## Scénarios obligatoires
1. A1 et A2 voient le panier A, B1 voit uniquement B.
2. B1 ne peut ni lire ni modifier ni insérer dans le foyer A.
3. Un utilisateur authentifié non membre et une requête anon ne voient aucune donnée.
4. Un membre ne peut pas créer un foyer ou ajouter un autre membre via la Data API.
5. Un membre désactivé perd immédiatement la lecture et l'écriture après rafraîchissement.
6. Un utilisateur appartenant aux deux foyers ne peut pas changer l'identité du foyer d'une ligne existante.
7. Un import répété du même import_source_id dans un foyer donne au plus une ligne, y compris après reconnexion.
8. Deux foyers peuvent utiliser un même import_source_id sans partager les articles.
9. Un conflit de revision ne réécrit pas silencieusement la modification d'un autre client.
10. La suppression logique, le mode hors ligne et la reprise IndexedDB fonctionnent sous Edge, Chrome et Safari.
11. Les deux iPhone voient la même liste dans leur foyer, sans perte de données préexistantes.
12. Supabase advisors ne signale pas de faille RLS / grants nouvelle.

## Gates de bascule
- Inventaire SQL réel du projet personnel Dobby et sauvegarde restaurable.
- Recette du nouveau schéma et procédure de copie V1 -> V2 en environnement de test.
- Vérification explicite des deux identités de membres actuels; aucune identité en clair dans le dépôt.
- Comparaison des comptes d'articles, révisions, suppressions avant/après.
- Test négatif inter-foyers obligatoire avant invitation d'amis.
- Feu vert explicite seulement après vérification de la récupération des mutations locales.
- Le connecteur Supabase courant ne voit pas le projet personnel Dobby; aucun SQL Dobby exécuté.
