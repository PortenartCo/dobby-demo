# Paquet Lot 5C — FIGÉ / NO-GO

**Ne pas exécuter les scripts écrivants.** L’assemblage a reproduit un nouveau SQLSTATE 25006 dans le chemin de prévisualisation nominative Lot 3. La garde directe V7 validée reste intacte. [Rapport et preuve](../../../docs/dobby-v7/administration-privee/lot5c/RAPPORT.md).

Ce répertoire est l’unique assemblage ordonné soumis à examen. Il ne remplace pas les migrations historiques et ne livre aucun choix de prototype alternatif. Les scripts 10/20/80/90 contiennent **uniquement une sentinelle d’erreur et aucune instruction mutable**, même après récupération de l’erreur par savepoint. Aucun flag ne les déverrouille. Le contenu assemblé est conservé seulement dans la source hors ligne `build.mjs` pour revue et reproduction locale, sans installateur CLI ni validation fonctionnelle finale.

| Script | Rôle / état |
| --- | --- |
| `00-preflight.sql` | Transaction READ ONLY : catalogue 27, Missions 12, rôles, relations, Auth et Storage ; sortie de métadonnées/empreintes uniquement. Pas de corps SQL privé ou donnée familiale. Non exécuté sur l’hébergé. |
| `10-install.sql` | Assemblage atomique fermé ; **BLOQUÉ** avant DDL/DML. |
| `20-activate.sql` | Canari Auth privé puis activation humaine distincte ; **BLOQUÉ**. |
| `30-postflight.sql` | Lecture seule de l’état installé attendu ; nécessite une installation existante. |
| `80-stop-admin.sql` | Plan de fermeture de l’administration conservant les parcours ordinaires ; **BLOQUÉ, non validé**. |
| `90-close.sql` | Plan de quarantaine conservant toutes les gardes et données ; **BLOQUÉ, non validé**. |
| `manifest.json` | Ordre, statut NO-GO, sources/empreintes, fichiers générés. |

Génération hors ligne : `node supabase/integration/lot5c/build.mjs`. Vérification : même commande avec `--check`. La génération conserve le blocage ; elle ne se connecte à aucun service.

Les tests partiels utilisent la source d’assemblage de revue et retirent exclusivement **en mémoire** le bloc exact des douze métadonnées Missions absentes de la fixture. Ils ne reconstruisent aucun corps privé et n’ajoutent aucune option à l’installateur. Le test fonctionnel des deux invitations valides **échoue**, conformément au défaut observé ; un workflow vert n’est pas revendiqué. L’ordre futur inclut les deux contrôles d’état : **00 → 10 → 30 → 20 → 30**.

L’entrée privée future est décrite dans [PROCEDURE.md](../../../docs/dobby-v7/administration-privee/lot5c/PROCEDURE.md). Aucun manifeste réel, credential, JWT ou adresse personnelle ne doit être ajouté à Git/CI. Aucune commande de connexion ou migration automatique n’est fournie.
