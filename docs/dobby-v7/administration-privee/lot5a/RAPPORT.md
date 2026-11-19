# Lot 5A — Précontrôle avant intégration

19 novembre 2026, Europe/Paris. **Intégration Git préparable ; mise en service NON VALIDÉE.** Ce dossier prépare une décision, sans migration, activation, fusion ni déploiement.

Base imposée : PR #32, `25d28a677b47fba225094736c64b61ce741bdb4f`. Plan Lot 5 lu au [commit documentaire demandé](https://github.com/PortenartCo/dobby-demo/blob/440cc2394c2dd5e9865a9b71fcd17b43e351f034/docs/dobby-v7/administration-privee/PLAN-2026-11-17.md), sans intégrer la PR #27. Projet autorisé déclaré : **dobby-family-sync — `pqcdkrwljgvgagzwrcmg`** ; identité effective non confirmée.

[Preuves, empreintes et simulations](PREUVES.json) · [Plan de bascule et retour arrière](PLAN-BASCULE.md) · [Lectures encore nécessaires](CONTROLES-LECTURE.md) · [Contrôle de confidentialité](CONFIDENTIALITE.json).

## 1. Vérifié et compatible

| Élément | Résultat observé et portée |
| --- | --- |
| Chaîne Git | #28 → #29 → #30 → #31 → #32 : les cinq liens d’ascendance sont vérifiés. PR ouvertes, en brouillon ; aucun changement de leurs branches. |
| `main` actuel | `424ae01815b7392dff1b3e5da9c51f4a734b4140`, trois commits après l’ancêtre commun `a637b8f9208a44479ccd87b82ba9d09d66cec75e`. Il ajoute 1062 fichiers dans trois copies saisonnières, sans recouvrement avec les fichiers de la pile. |
| Compatibilité Git | Cinq simulations `git merge-tree --write-tree --name-only <main> <head>` : code 0, aucun conflit. Ce calcul produit des objets d’arbre, sans commit de fusion, modification du checkout ou déplacement de branche. Il ne constitue pas une recette du résultat intégré. |
| Paquet candidat | Quatre migrations ordonnées, trois rollbacks, sources Edge et console présentes ; SHA-256 consignés. Aucun de ces fichiers n’est modifié. Les anciens installateurs ne sont pas à rejouer. |
| Faisabilité locale antérieure | Lot 1 : 28 DB ; Lot 2A : 26 SQL ; Lot 2B : 10 HTTP Storage ; Lot 3 : 16 HTTP Auth, 14 SQL, 18 Edge ; Lot 4 : 14 groupes navigateur et 23 UI. La finition responsive ajoute 28 comparatifs. Ce sont des **preuves historiques locales**, avec les limites de leurs rapports, pas de nouveaux essais Lot 5A. |

Les rapports [Lot 1](../lot-1/RAPPORT.md), [Lot 2A](../lot2a/RAPPORT.md), [Lot 2B](../lot2b/RAPPORT.md), [Lot 3](../lot3/RAPPORT.md), [Lot 4](../lot4/RAPPORT.md) et [finition responsive](../lot4/FINITION-RESPONSIVE-2026-11-19.md) ont été consultés. Les CI vertes du SHA de base restent historiques : [V7 branche](https://github.com/PortenartCo/dobby-demo/actions/runs/44501604282), [V7 PR](https://github.com/PortenartCo/dobby-demo/actions/runs/44501616498), [Sync](https://github.com/PortenartCo/dobby-demo/actions/runs/44501616473). Aucun test métier, service local ou campagne CI n’est relancé pour ce dossier documentaire.

## 2. Non vérifié faute d’accès

Un seul appel au projet : `supabase_get_project({id:"pqcdkrwljgvgagzwrcmg"})`. Réponse : **`MCP error -32600: You do not have permission to perform this action`**, avec `isError:true` et code structuré `INVALID_ARGUMENT`. Aucun autre appel au projet, requête SQL, lecture d’utilisateur ou recherche de credential n’a suivi. La consultation de documentation publique ne donne aucun accès au projet.

| Contrôle hébergé | État |
| --- | --- |
| Identité, état du projet ; versions PostgreSQL/Auth/Storage/PostgREST | **NON VÉRIFIÉ** |
| Historique des migrations et présence réelle des quatre candidates | **NON VÉRIFIÉ** ; un historique vide ne suffirait pas à exclure des installations anciennes par SQL Editor. |
| ACL effectives et visibilité RLS de `auth.sessions` ; identité Auth Lot 3 | **NON VÉRIFIÉ** |
| Capacités préexistantes de l’installateur, ADMIN des writers, maintenance DDL Storage | **NON VÉRIFIÉ** |
| Bucket privé, huit policies natives, helpers, autres buckets, protocoles S3/TUS/transformation | **NON VÉRIFIÉ** |
| Schémas exposés, fonctions/surcharges, catalogue privé Missions et écarts aux empreintes | **NON VÉRIFIÉ** ; aucun delta hébergé ne peut être présenté comme mesuré. |
| Clés URL Storage, anciennes capacités, TTL effectifs et caches CDN | **NON VÉRIFIÉ** |
| Signup, OTP, redirections, templates, SMTP, sauvegardes et restauration | **NON VÉRIFIÉ** |
| UUID et liaisons canoniques réels du propriétaire et de Parent A/B | **NON VÉRIFIÉ** ; aucune information nominative extraite. |

La permission manquante observée est l’autorisation du connecteur à lire les métadonnées de **ce projet précis**. Le refus ne révèle ni le scope OAuth exact ni le rôle Supabase responsable. La suite nécessite un accès déjà autorisé aux métadonnées/catalogues et à une projection expurgée des réglages ; ni clé serveur ni accès aux lignes utilisateurs ne sont requis pour ce diagnostic. Aucun autre connecteur, compte, credential ou projet n’est utilisé pour contourner le refus.

## 3. Incompatibilités et obstacles précis

| ID | Obstacle, preuve et statut |
| --- | --- |
| B01 | **Accès hébergé bloqué**, réponse ci-dessus. Impossible de valider une installation réelle à partir des PASS locaux. |
| B02 | **Candidates incompatibles avec PostgreSQL ≤15 en l’état.** `WITH INHERIT …, SET …` et `pg_auth_members.inherit_option/set_option` imposent PostgreSQL ≥16 : [Lot 1, ligne 29](https://github.com/PortenartCo/dobby-demo/blob/25d28a677b47fba225094736c64b61ce741bdb4f/supabase/migrations/20261117203208_dobby_private_access_foundation.sql#L29), [Lot 2A, ligne 109](https://github.com/PortenartCo/dobby-demo/blob/25d28a677b47fba225094736c64b61ce741bdb4f/supabase/migrations/20261117215619_dobby_private_access_tables_rpc.sql#L109), [PostgreSQL 16](https://www.postgresql.org/docs/16/release-16.html). Tests historiques sur 17.7 ; version du projet **inconnue**, aucune incompatibilité effective du projet n’est affirmée. |
| B03 | Les candidates ne fournissent pas les droits sur Auth géré. Le reader sessions exige `USAGE(auth)` et seulement `SELECT(id,user_id,created_at,not_after)` ; celui d’identité exige séparément `SELECT(id,email,email_confirmed_at)`. **Les ACL ne prouvent pas la visibilité sous RLS.** Le Lot 2B démontre déjà le refus avec les seuls grants. Aucune promotion, prise de rôle Auth géré, modification d’owner ou ajout BYPASSRLS ne convient comme réparation. |
| B04 | Lot 2A exige un catalogue fermé de 27 signatures, corps/définitions/owners exacts et ADMIN fermé sur les writers. Lot 2B vérifie notamment les huit policies et helpers Storage de référence v1.89.12, puis doit pouvoir verrouiller les tables et créer une policy sur `storage.objects`. Le nom `postgres` ne démontre pas ce droit DDL. **Compatibilité hébergée non vérifiée.** |
| B05 | **Douze définitions privées Missions restent absentes des sources de preuve.** L’appel autorisé V2 atteint `request_user_id()` absent et donne `42883` dans la fixture existante ; ce test prouve un manque, pas le succès du graphe complet. Liste exacte dans PREUVES.json et le [catalogue Lot 2A](../lot2a/preuves/catalogue-local.json). |
| B06 | **Une suspension ne révoque pas les anciennes capacités signées.** Le [test physique existant](https://github.com/PortenartCo/dobby-demo/blob/25d28a677b47fba225094736c64b61ce741bdb4f/tests/private-access/lot2b/storage.test.mjs#L206) observe encore le téléchargement et l’écriture d’un upload signé préémis. T09 reste partiel. |
| B07 | Edge hébergée/gateway, SMTP, réglages Auth, sauvegarde restaurable et conservation réelle A/B restent sans preuve. Les gates enfants et Missions V3 restent fermées ; leur ouverture est une validation distincte, pas une condition à contourner pour livrer l’administration adulte. |
| B08 | L’[issue #19](https://github.com/PortenartCo/dobby-demo/issues/19) distingue accès aux API et protection du code/interface. Le choix de publication reste à valider : pages/code publics avec API privées et démo distincte, ou hébergement protégé/dépôt privé. Les guards ne rendent pas les fichiers statiques confidentiels. |

## 4. Correctif minimal ou décision nécessaire

**Auth/SQL :** obtenir le seul accès de diagnostic autorisé, puis comparer les prérequis sans modifier les lots. Si le projet est en PG15, une décision séparée doit choisir une plateforme compatible ou une adaptation revue et testée ; pas d’upgrade engagé ici. Si RLS, ADMIN, DDL Storage ou empreintes divergent, préparer un delta minimal soumis à validation. Les migrations ne doivent pas être essayées comme sondes de permissions.

**Signatures :** le [transport natif](https://github.com/PortenartCo/dobby-demo/blob/25d28a677b47fba225094736c64b61ce741bdb4f/essai-stitch-v5-famille/family-v2.js#L279) utilise des GET authentifiés et n’émet pas de lien signé. La recherche Git trouve les émetteurs explicites dans le harnais Lot 2B : téléchargements **3600 s**, uploads sans TTL fourni. Ce sont des paramètres fictifs, pas la durée des anciens liens réels. Aucun producteur externe/dashboard/intégration non suivie n’est exclu par cette recherche.

La documentation actuelle [URL Signing Keys](https://supabase.com/docs/guides/storage/security/signing-keys) décrit une clé **Storage distincte d’Auth, à portée projet** : rotation seule insuffisante ; l’ancienne clé doit aussi être révoquée. Cette opération touche les anciennes signatures des autres buckets et utilisateurs, sans être une rotation des sessions Auth. Les consommateurs légitimes devront obtenir de nouvelles capacités. Le système réellement disponible sur ce projet reste non vérifié.

| Solution future | Conditions et conséquences |
| --- | --- |
| Expiration naturelle vérifiable | Geler **tous** les émetteurs, y compris signatures directes et producteurs privilégiés ; prouver la dernière émission, les TTL maximum et les échéances de caches. Les uploads sont documentés à [2 h](https://supabase.com/docs/reference/javascript/file-buckets-createsigneduploadurl), mais aucune borne globale des téléchargements réels n’est connue. Pas de délai « 1 h/2 h » suffisant par défaut. |
| Invalidation des objets concernés | [Supprimer/déplacer/renommer](https://supabase.com/docs/guides/storage/serving/downloads) peut invalider les URL de téléchargement correspondantes, avec sauvegarde des octets et mise à jour des références. Effet sur **tous** les lecteurs de ces objets ; propagation CDN et caches navigateur distincts. Cela ne révoque pas généralement un upload signé visant un chemin absent, qui peut encore créer un fichier. Aucune suppression proposée à exécuter ici. |
| Rotation puis révocation de la clé URL | Couvre les capacités signées par l’ancienne clé à l’origine, avec impact sur tous les buckets concernés. Purge CDN séparée nécessaire ; opération globale et retour arrière à valider humainement. Réactiver l’ancienne clé peut rendre ses anciennes signatures acceptables à nouveau. Ne pas utiliser la rotation des clés Auth comme substitut. |

Le [Smart CDN](https://supabase.com/docs/guides/storage/cdn/smart-cdn) sépare expiration du jeton et TTL de réponse : un cache peut servir après expiration/révocation. L’invalidation après changement/suppression peut prendre jusqu’à 60 s ; une copie navigateur déjà téléchargée ne disparaît pas. Aucun cache effectif ni droit de purge n’est certifié ici. **Aucune absence d’ancien lien n’est affirmée.** Le choix reste bloqué tant que gel des émissions, portée, cache et contrôle de fin ne sont pas démontrables.

## 5. Ordre recommandé des opérations futures

1. Rétablir un accès de lecture autorisé au seul projet ; compléter les contrôles NON VÉRIFIÉS, le catalogue Missions et le choix Storage. Arrêt sur tout écart inexpliqué.
2. Valider humainement le paquet exact : SQL/empreintes, propriétaire et manifeste privé A/B, sauvegarde DB **et octets Storage**, restauration exercée sur copie fictive, maintenance et traitement des capacités anciennes.
3. Après autorisation d’intégration distincte : #28 → #29 → #30 → #31 → #32, avec retarget/recontrôle de chaque PR et CI au **SHA final intégré**. Ne pas confondre les copies saisonnières figées avec la console candidate ; ne pas les modifier pour ce lot.
4. Après autorisation de migration distincte, sous entrées effectivement fermées : Lot 1 → amorçage A/B → droits/visibilité sessions et activation explicite → Lot 2A → Lot 2B → Lot 3 → droits/visibilité identité et activation explicite. Configuration Edge/Auth/client et ouvertures sont détaillées dans le plan ; aucune exposition intermédiaire permise.
5. Recette fictive ciblant l’intégration réelle, contrôle du rollback conservateur, conservation A/B attestée ; puis seulement validations séparées de fermeture signup, publication et ouverture de service. Aucun e-mail externe ou gate enfant sans accord distinct.

**Arrêt du Lot 5A :** préparation livrée ; aucune autorisation de migration ou d’ouverture n’est donnée par ce rapport.
