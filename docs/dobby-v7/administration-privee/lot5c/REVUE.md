# Revue de la livraison Lot 5C bloquée

Périmètre : assemblage unique depuis `afb09873b39e533d433c72a436ab3cbcfc043bbc`, préflight READ ONLY, scripts écrivants gelés avant mutation, tests fonctionnels et procédure NO-GO. La garde V7 et les sources historiques restent intactes.

Revue indépendante statique effectuée, sans modification, runtime ou appel externe du reviewer. Aucun avis favorable ne peut transformer le test fonctionnel 25006 en PASS, ni valider l’hébergé ou la restauration non éprouvée.

Décisions de réalisation : reprendre le worktree propre existant de la branche autorisée ; aucune autre branche/projet/prototype créé. Un seul assemblage, sans choix d’architectures. Le search_path de la phase de wrapping reprend le contexte historique `public` pour ses comparaisons de noms regprocedure ; les fonctions runtime gardent leur search_path fermé. Les échecs de montage initiaux et de gel des scripts sont conservés, distincts du défaut Lot 3 reproduit.

Arrêt de développement sur le chemin valide READ ONLY démontré. Les brouillons de tests HTTP/Storage/rollback/restauration non exercés sur un assemblage valable ont été retirés de la suite finale, sans revendication de PASS ; le plan de recette les conserve comme conditions futures. Aucun test de sécurité métier n’est affaibli pour passer le défaut. Les artefacts écrivants restent sans option de déblocage.

## Constats et correction de la livraison gelée

- **Critical :** un RAISE suivi du SQL mutable ne suffit pas face à un client récupérant l’erreur par savepoint. Le nouveau contre-test atteint réellement la fermeture dans le premier fichier 90 : l’état passe à quatre flags false malgré la garde. RED : 9 tests, 7 succès et 2 échecs (ce défaut de gel et le défaut métier). Correction de livraison : quatre sentinelles seules, aucun SQL mutable après erreur ; l’assemblage est seulement dans la source de revue utilisée par le test local, sans option CLI d’installation. Le contre-test est conservé ; le défaut métier reste volontairement un échec fonctionnel non corrigé.
- **Important :** le manifeste omettait le contrôle fermé avant activation. Manifeste, test et procédure imposent désormais **00 → 10 → 30 → 20 → 30**. Cette correction d’ordre ne change aucun fonctionnement métier.

La suite finale et la CI donnent leurs résultats exacts dans RESULTATS.json. Le reviewer n’a pas réexécuté ces tests ; les exécutions sont attribuées au coordinateur. Les corrections de livraison ont été vérifiées par les contre-tests et la suite, sans seconde revue revendiquée. L’avis initial du reviewer était défavorable aux quatre entrées contenant encore du SQL après le RAISE ; il ne doit pas être présenté comme un avis favorable indépendant à la version corrigée.

Réserves de la source pour une future version autorisable : la présence/cardinalité de l’entrée et les attestations sont contrôlées avant DDL, mais les champs du manifeste et l’opération ne le sont pas tous avant le bootstrap (transaction annulée si refus). Le journal compare ses fonctions sans exiger explicitement son package_id attendu. Ces points sont consignés, sans reprise du développement métier dans cette mission arrêtée. Les sentinelles distribuées n’exécutent aucun de ces chemins.

## Correction ciblée des lectures — revue indépendante

Nouvelle revue statique du diff depuis `69c69c7`, des tests et du journal local 14/14, sans test runtime, mutation ou appel externe du reviewer. Avis favorable à la correction locale ; aucun Critical/Important trouvé. Pas de cycle de verrous supplémentaire évident entre anciennes RPC et commande d’admission : verrous de cible/demandeur conservés, admission stabilisée puis revalidation dans un nouveau PERFORM après attente.

Le helper STABLE conserve les prédicats, son propriétaire SECURITY DEFINER existant et son search_path vide ; ACL limitée au propriétaire et au rôle SOCLE existant, sans droit V7/Auth ou rôle ajouté. Les neuf tests initiaux restent présents ; les cinq ajouts exercent lectures, refus, acceptations/replay et attentes concurrentes. Les quatre fichiers écrivants restent des sentinelles sans continuation mutable. Le reviewer distingue cet avis local des validations hébergées, Missions et restauration, toujours NO-GO.

Les deux ordres de suspension, la révocation d’admission pendant attente, la déconfirmation d’identité et l’invalidation de session sont exécutés par le coordinateur. La CI et les empreintes finales sont consignées dans RESULTATS-LECTURES.json. L’avis statique ne constitue ni une exécution indépendante de ces tests ni une autorisation de bascule.
