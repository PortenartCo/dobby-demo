# Sauvegarde, restauration et rollback coordonné

**Plan préparé, non validé en intégration Lot 5C.** Le défaut de lecture du [rapport](RAPPORT.md) a arrêté la recette. Aucun backup réel, restauration hébergée ou retrait de garde n’a été effectué. Les scripts 80/90 sont figés, sans autorisation d’exécution.

## Avant toute installation future

Préparer en privé un point cohérent après fermeture effective des écritures et des producteurs privilégiés. Inventaire minimal :

| Élément | Conservation et contrôle |
| --- | --- |
| Base complète | Point de restauration physique/PITR existant du projet, date/LSN, versions et rétention prouvées. Schémas privés, fonctions, OID, owners, ACL, RLS, rôles/memberships et données inclus. Vérifier le périmètre réel des rôles gérés et credentials avec l’outil de sauvegarde disponible. |
| Storage | **Octets séparés**, métadonnées et configuration des buckets ; inventaire privé des chemins/taille/SHA256 et rapprochement avec les références de la base. La sauvegarde DB Supabase n’inclut pas les octets Storage. Aucun simple comptage ne prouve leur restauration. |
| Administration | Registres, décisions, générations, bornes de session, admissions, livraisons/reçus et état incertain ; avant première installation, attester leur absence plutôt qu’inventer une sauvegarde. |
| Parent A/B | Manifeste privé des deux UUID Auth et du foyer commun, deux memberId TEXT, liaisons actives, révisions/données et droits. Contrôler présence/égalité avant et après ; aucune recréation, réinvitation ou déduction par e-mail. |
| Configuration externe | Versions et références privées Edge/client, origines, redirects, templates Auth/SMTP, signup/TTL, URL signing keys et CDN. Sauvegarder les références aux secrets gérés, sans les extraire dans Git/CI. Une restauration DB ne restaure pas ces services/configurations/caches. |

Vérifier en privé les empreintes des archives et octets, leur lisibilité, leur chiffrement et l’accès de l’opérateur de secours. Le test de restauration doit charger une **copie autorisée isolée**, comparer les mêmes identifiants/données/métadonnées et exercer les contrats, pas seulement lister l’archive. Aucune autre ressource Supabase/projet de remplacement n’est autorisée par ce dossier.

Le préflight SQL n’exporte aucun corps privé. Une sauvegarde complète autorisée peut en contenir dans son stockage privé chiffré ; elle ne doit jamais être jointe à la PR, aux preuves publiques ou à la CI.

## Trois états différents

| État | Action future contrôlée | Résultat à prouver |
| --- | --- | --- |
| Arrêt fonctionnel de l’administration | Arrêter Edge/envois, préserver les opérations incertaines ; `80-stop-admin.sql` après validation future. | Administration et livraison enfant fermées ; gardes Auth/V7/Storage maintenues, comptes actifs ordinaires utilisables, non-admis/suspendus refusés. **Non validé Lot 5C.** |
| Quarantaine fermée | Entrées fermées, puis `90-close.sql` après validation future. | Flags session/identité/administration/enfants false ; aucune garde supprimée, aucun compte/foyer/décision effacé. Cet état ne constitue pas un service fonctionnel restauré. **Non validé Lot 5C.** |
| Rétablissement fonctionnel complet | Restauration cohérente d’un point approuvé, octets/configurations coordonnés, réconciliation de l’état de sécurité et nouvelle recette. | Fonctions, rôle/ACL/RLS, journaux, contrats STABLE, invitations, sync/Missions/Storage et conservation A/B vérifiés avant réouverture. **Non réalisé.** |

Les rollbacks historiques Lot 2B et Lot 2A rouvrent respectivement la signature native et les anciennes API. Ils ne sont pas un retour normal au service sécurisé. Le rollback V7 validé au Lot 5B retire la nouvelle garde en conservant six fences false : il ferme les écritures V7, il ne restaure pas tout le système. Aucun de ces retraits ne doit être enchaîné automatiquement.

## Séquence d’une restauration complète autorisée

1. Fermer et attester les entrées, producteurs de liens et traitements Edge ; conserver en privé l’état courant, notamment les décisions de sécurité et livraisons incertaines postérieures au point cible. Choisir le point, le périmètre DB/octet/configuration et la perte de données admissible avec l’opérateur humain.
2. Vérifier l’archive/point de restauration et sa procédure sur copie isolée, avant d’autoriser le rétablissement du projet personnel. Si cette preuve manque, **NO-GO**. Aucune commande de restauration distante n’est exécutée ou automatisée ici.
3. Restaurer le point physique validé et les octets correspondants, avec les configurations externes appropriées, en maintenant l’ingress fermé. Les journaux V7 et Lot 5C comparent des OID : **un dump logique qui recrée les objets n’est pas une restauration directement interchangeable**. Il exige une procédure de réattestation revue, absente du présent lot ; ne pas réécrire les snapshots pour faire passer le contrôle.
4. Si le point précède l’installation initiale, les gardes n’y existent pas : les API natives ne peuvent pas être rouvertes comme un système d’administration restauré. Il faut réinstaller le paquet corrigé et autorisé, puis rejouer la recette. Si le point inclut les gardes, les mettre/maintenir fermées avant toute ouverture de l’ingress.
5. Comparer l’état courant sauvegardé et le point restauré : une ancienne sauvegarde ne doit pas réhabiliter un suspendu, diminuer une génération/borne de session, ressusciter une admission révoquée ou répéter une livraison. Toute lacune empêche l’ouverture ; la réconciliation doit être explicitement validée, sans rejouer aveuglément les reçus ni modifier les vrais A/B pour tester.
6. Vérifier les identifiants/liens/données A/B, les empreintes/ACL/RLS et journaux attendus, puis canari Auth positif/négatif et [recette complète](RECETTE.md). Les capabilities signées/cache restent un contrôle distinct : restaurer une ancienne URL signing key peut réhabiliter ses anciens liens.
7. Autorisation humaine séparée de réouverture au SHA/configuration exacts, avec preuve du point restaurable conservée. Aucun drapeau SQL ne remplace cette décision.

La documentation [Backups Supabase](https://supabase.com/docs/guides/platform/backups) confirme la séparation des octets Storage, la portée d’une restauration et les limites des mots de passe de rôles dans les sauvegardes téléchargeables. Les changements [PostgreSQL 17.11](https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes), notamment les opérateurs utilisant des estimateurs personnalisés, peuvent affecter un dump/restore ; vérifier leur présence dans le catalogue restauré, sans lancer de réparation ou réindexation dans ce lot.
