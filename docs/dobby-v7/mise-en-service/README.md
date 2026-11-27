# DOBBY V7 · Préparation de la mise en service

Travail repris dans `/workspace/dobby-v7-candidate` sur la candidate validée `0f51fb76ffe95f54c5e2b5e4493b2fc149ad39f6`. La branche de préparation conserve ce commit comme parent. Les preuves de réconciliation et de la campagne globale se rapportent à ce SHA. Les preuves des nouveaux raccordements figurent dans ce dossier. [Candidate #54](https://github.com/PortenartCo/dobby-demo/pull/54) · [Décision de lancement #35](https://github.com/PortenartCo/dobby-demo/issues/35)

## Périmètre actualisé

| Élément | Décision |
| --- | --- |
| Deux parents | Deux nouveaux comptes lors de la recette familiale et rattachement au même foyer par invitation. Les comptes historiques sont conservés. Inscription, confirmation, récupération et invitations suivent le flux natif. |
| Enfants, Missions et Runes | Obligatoires. Rattachement au profil existant, révocation de l’accès, permissions différenciées et récompenses. Le drapeau Enfants reste fermé jusqu’aux contrôles serveur et à l’autorisation de bascule. |
| Santé | En veille par décision ultérieure du propriétaire. Porte publique fermée, sources et preuves conservées. Activation et reprise Santé relèvent d’une opération ultérieure. |
| Cuisine | Cuisine tactile, « Avec mes ingrédients » et médias à la demande. Cuisine vocale hors périmètre. |
| PWA, sons et démo | PWA et démo rejouable requises. Les rapports exacts de #54 attestent le fonctionnement de laboratoire. La vérification GSM réelle, l’appréciation visuelle et l’écoute propriétaire entrent dans la recette familiale. |
| Catalogue | Production éditoriale terminée. Livraison récupérée et vérifiée à 400 fiches et 2 105 WebP avec état `CATALOGUE_LOCAL_COMPLET`. La vérification technique et l’intégration suivent le dossier Catalogue. Les durées cibles restent indicatives. |

## Démarrage familial et ouverture à des tiers

Le démarrage familial utilise l’administration du foyer de #50/#51. L’admission de foyers tiers requiert les autorisations propriétaires de #19. Le raccordement local de la console suit le protocole Edge déjà développé. Il dépend d’un feu vert serveur à chaque commande et d’un drapeau public distinct qui reste fermé dans la candidate. Le lot historique réutilisable est matérialisé hors de la chaîne automatique de migrations. Les anciennes commandes de fermeture des parcours familiaux doivent faire l’objet d’une adaptation avant toute admission privée de tiers. [Administration et critères tiers](administration-privee.md) · [Issue #19](https://github.com/PortenartCo/dobby-demo/issues/19)

## État des vérifications hébergées

La lecture de management a confirmé le projet configuré et renvoyé une liste Edge vide. La liste des migrations a expiré, ainsi que l’inventaire PostgreSQL. Un `SELECT` minimal a également été rejeté par le connecteur comme base inaccessible. Un contrôle HTTP direct a été bloqué par le tunnel sortant. Cela laisse schémas, politiques, versions, inscriptions, e-mails, usages réels et capacité de restauration hébergée à vérifier. Ces observations ne démontrent pas la cause de l’indisponibilité. [Supabase et retour arrière](supabase.md)

## Opérations humaines requises

1. **Rétablir la vérification autorisée du projet.** L’opérateur Supabase confirme l’accessibilité, les rôles, les capacités Auth et les réglages e-mail, quotas et URL. Il fournit l’inventaire de catalogue SQL et Storage selon le protocole, avec le point de reprise attesté.
2. **Autoriser le point de reprise et la bascule.** Sauvegarder et tester la restauration de la base et des octets Storage, valider le différentiel de migrations et leurs fenêtres, puis approuver l’ouverture contrôlée pour les deux nouveaux comptes et l’activation Enfants. Pour une ouverture à des tiers, décider séparément du régime d’admission #19 et réaliser les contrôles correspondants.
3. **Viser le paquet de diffusion.** Confirmer la configuration d’hébergement dans les limites du plan, la préparation du paquet éditorial dérivé et la séparation des sources privées. Les étapes, tests et identifiants de l’import sont dans le dossier Catalogue.
4. **Réaliser la recette familiale unique.** Le propriétaire et le second parent utilisent chacun leur propre messagerie et leurs nouveaux comptes sur appareils réels. Valider les enfants, les flux d’accès, les permissions, Missions et Runes, Cuisine, ingrédients, démo, restauration et installation GSM. Les validations physiques en Cuisine et TM5 ainsi que les cumuls diététiques du planning ont leur propre statut.
5. **Donner le GO.** Après la recette et la revue visuelle et sonore du propriétaire, autoriser explicitement le changement de publication.

[Procédure Supabase](supabase.md) · [Console propriétaire](administration-privee.md) · [Installation GSM](pwa.md) · [Vérification et intégration du catalogue](catalogue.md)

## Preuves de préparation

- Contrôles ciblés sur les fichiers modifiés. Les 35 assertions de provenance, transport Auth de la console et service worker passent. La recette Chromium de la console utilise l’iframe V5 réelle et une fixture HTTP d’Edge. Elle couvre les cinq vues, la navigation, la confirmation unique, les réponses invalides, la bascule de compte et les refus. La recette Auth familiale existante passe à 390 px.
- L’assemblage éditorial de recette privée a été reproduit octet pour octet. La vérification de chargement utilise les 400 fiches complètes sur loopback. Le rejeu de la livraison SQL se fait dans PostgreSQL jetable. Ces résultats documentent un laboratoire.
- Les résultats PWA, démonstration, Auth local et non-régression de #54 sont repris pour les comportements inchangés. La campagne globale de #54 sert de référence. [CI #54](https://github.com/PortenartCo/dobby-demo/pull/54/checks)
