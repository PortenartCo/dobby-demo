# Maison — état initial et limites de preuve

Pack du 13 novembre 2026, toutes les empreintes MANIFEST_SHA256 vérifiées. L’archive est la spécification utilisateur approuvée, jamais une preuve de production.

- Dépôt personnel PortenartCo/dobby-demo, main initial `54d74b9448a1c518d8a3c483cd4deaea1e493748`.
- Worktree `/workspace/dobby-demo/.worktrees/maison-equipements-20261113`, branche `feat/dobby-v7-maison-equipements-20261113`, export complet du dernier main. Aucun AGENTS.md dans ce dépôt. La copie Portenart-Platform distincte n’est ni consultée pour le métier DOBBY ni modifiée.
- PR #11 ouverte en brouillon au contrôle initial, mergeable=false ; aucun changement sur sa branche/worktree. PR #12 fusionnée `43eef7a`, PR #13 fusionnée `70c56eb`, rapport #14 déjà sur main. Aucun changement des gates enfant/V3, de Missions/Runes ou de Contrats.
- Writer historique réellement trouvé dans `essai-stitch-v5-famille/index.html` (houseForm/houseLogForm/houseStore/houseRead). Il remplaçait entièrement les fiches et bloquait donc les champs opaques dans le formulaire V7.
- Le nouveau writer reste sur `st.houseItems`, `st.houseLogs`, `st.houseDocs`, `save()` et le magasin IndexedDB natif. Aucune deuxième base ; aucun accès au projet Supabase, aucune mutation ni migration distante.
- Contrats utilise les IDs `familyDocs[].contract.equipmentIds`. L’association ajoute l’ID sans effacer les autres ; la suppression de l’équipement est bloquée tant qu’un contrat le référence.
- Les documents de Maison restent locaux. L’import conserve leurs sources/URL, sans télécharger de lien externe et sans appeler une IA.
- Le schéma SQL versionné `sql-proposals/dobby-v2-modules.sql` accepte un objet JSON de 262144 octets maximum. Le marqueur additif `houseVersion:1` n’exige aucun nouveau DDL selon ce contrat. Le serveur réel n’a pas été interrogé ; un gros registre peut dépasser sa limite de synchronisation, avec données locales conservées et erreur native.

## Portée des preuves

Les campagnes navigateur utilisent des profils éphémères, un serveur HTTP local et des états fictifs nommés TEST. Les accès réseau externes sont bloqués. Elles exécutent le véritable DOM, le véritable writer et IndexedDB. Les tests de synchronisation et de droits sont des fixtures, pas une certification serveur à deux comptes. Les captures ne représentent aucune donnée familiale réelle.

Aucun rappel automatique ni transport partagé de PDF n’est activé. Les échéances visibles sont calculées à partir des dates enregistrées. Le moteur de Missions historique reste inchangé : cette livraison n’annonce pas l’intégration automatique des nouveaux programmes dans les Missions.

## Décisions techniques

- Dernière date déclarée distincte du journal ; dates dérivées à la lecture depuis le programme et ses seules interventions réalisées.
- Calendrier en mois civils, jour limité au dernier jour du mois cible ; 31 janvier + 1 mois => 28/29 février, 29 février + 12 mois => 28 février.
- Retrait d’un programme/intervention : confirmation, conservation des documents et du journal sous références antérieures.
- Les anciens snapshots non versionnés ne peuvent pas effacer silencieusement des fiches enrichies ou des interventions classées ; conflit conservateur à résoudre avec un client à jour.
- Annulation et lectures asynchrones : aucune écriture avant confirmation, contrôle de contexte/révision après les attentes ; import natif atomique avec nettoyage des binaires temporaires en cas d’échec.
