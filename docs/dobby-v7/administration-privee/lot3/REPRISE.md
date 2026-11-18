# Reprise locale — Lot 3

Base : PR #30 à `24ab5b7944c34c9f29ede5867f4715111b5c2f47`. Lire [CONTRAT.md](CONTRAT.md), [RAPPORT.md](RAPPORT.md) et [RESULTATS.json](RESULTATS.json). Ne pas fusionner la branche documentaire #27 pour récupérer la conception : la lire au commit `440cc2394c2dd5e9865a9b71fcd17b43e351f034`.

## Rejouer

Node.js 24.19.0, Docker sur `/var/run/docker.sock`, Chromium `/usr/bin/chromium`, Playwright disponible dans le runtime ; Deno CLI épinglé 2.9.6 via npx pour contrôle TypeScript et épreuve HTTP native. La fixture n'utilise ni `.env`, ni projet Supabase lié, ni credential hébergé.

Images exactes :

```sh
docker --host unix:///var/run/docker.sock pull postgres:17.7@sha256:2006493727bd5277eece187319af1ef82b4cf82cf4fc1ed00da0775b646ac2a4
docker --host unix:///var/run/docker.sock pull supabase/gotrue:v2.197.0@sha256:839f529492d116b4e8b7777c953a27c381d34c15a744b1bcefde5eefaa1f9f9f
docker --host unix:///var/run/docker.sock pull axllent/mailpit:v1.34.0@sha256:5040a9c533087d25dcb8f2ac748f45c9be5f7bc1d9fe5b860afb9597a2471d57
docker --host unix:///var/run/docker.sock pull postgrest/postgrest:v14.18@sha256:c847127074bd26e1b8d3f7c0e6e01e5346f4b85dd34f5d699fd230af960827c0
```

Conserver le daemon local explicite si des variables Docker désignent un autre hôte. Ne pas redémarrer le daemon partagé.

```sh
mkdir -p /tmp/dobby-lot3-evidence
node --test tests/private-access/lot3/admin-api.test.mjs
node --test tests/private-access/lot3/admin-sql.test.mjs
DOBBY_EVIDENCE_DIR=/tmp/dobby-lot3-evidence node --test tests/private-access/lot3/invite-delivery.test.mjs
node --test tests/private-access/lot3/callback-browser.test.mjs
node --test essai-stitch-v5-famille/tests/family-access*.test.mjs essai-stitch-v5-famille/tests/family-core.test.mjs essai-stitch-v7/tests/access-flow*.test.mjs tests/private-access/lot3/callback.test.mjs
npx --yes deno@2.9.6 check --no-remote supabase/functions/dobby-access-admin/index.ts
git diff --check
```

Exécuter les commandes séparément facilite le diagnostic et évite les changements de timing dus aux démarrages concurrents. Aucun nouveau rejeu Storage ni campagne SQL générale n'est requis pour une modification seulement documentaire. Le test catalogue Lot 2A a été rejoué au delta de composition (`catalog.test.mjs`), parce que l'initialisation doit pouvoir utiliser les vraies tables Auth ; aucune ancienne migration n'a changé.

## Ce qui est réel ou fictif

GoTrue crée ses vraies tables et sessions par ses migrations. PostgREST vérifie les JWT réellement signés ; Mailpit reçoit les véritables messages SMTP. Tous les noms, comptes, profils, foyers et fichiers de test sont fictifs. Les destinataires SMTP sont bornés au suffixe `.invalid`. Réseau Docker interne et données tmpfs, aucun bind mount et aucune publication de port de conteneur. Le relais HTTP sur loopback transmet aux vrais services ; il ne simule pas les réponses.

Le propriétaire Auth de la fixture fournit explicitement RLS et les seuls droits de lecture nécessaires aux readers fermés : sessions pour le Lot 1, identité `(id,email,email_confirmed_at)` pour le Lot 3. Le helper `auth.uid()` reprend le fallback déjà utilisé pour les claims JSON PostgREST. Ces capacités d'un propriétaire local fictif ne prouvent aucun droit Auth hébergé. La candidate n'accorde pas de privilège sur le schéma Auth géré.

Le serveur de templates se trouve dans le conteneur PostgreSQL local ; seules les exclusions proxy des hôtes internes possédés sont ajoutées aux exclusions héritées, sans modifier le proxy hôte ni ouvrir une destination externe. Les secrets serveur aléatoires existent dans les processus et l'environnement des conteneurs jusqu'au teardown ; jamais dans Git, le navigateur ou les preuves publiées. Le seul JWT côté navigateur est la session utilisateur normale ; avant consommation il reste en mémoire dans un transport d'admission borné.

## Installation candidate et configuration à préparer

Candidate locale : [migration](../../../../supabase/migrations/20261118120207_dobby_private_access_administration.sql). Avant une utilisation hébergée distinctement autorisée : comparer les définitions, propriétaires et ACL attendus, confirmer le bootstrap propriétaire et les capacités de maintenance existantes ; vérifier l'accès effectif aux sessions sous RLS ainsi que les trois colonnes d'identité. Si un droit Auth géré manque, arrêter ; ni promotion, ni héritage d'un rôle géré, ni BYPASSRLS ne constituent une réparation autorisée.

Après les grants minimaux fournis par le propriétaire Auth autorisé, l'installateur vérifié active explicitement `dobby_access_private.enable_identity_guard()`. Le rôle d'administration n'obtient aucun accès aux contenus familiaux. Les gates enfant et les constantes `FAMILY_FEATURE_RELEASE` restent fermées en production ; seules les fixtures de recette peuvent ouvrir leurs propres flags.

Configuration serveur future, sans enregistrer de valeurs réelles dans le dépôt : `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DOBBY_ADMIN_ALLOWED_ORIGINS` (origines exactes) et `DOBBY_ADMISSION_REDIRECT_TO` (retour applicatif de confiance). Aucune configuration client ne contient la clé élevée. Les gabarits e-mail invite/magiclink doivent transmettre `.TokenHash` avec le type fermé et le `admission_id` ajouté à `.RedirectTo` par l'Edge. Ne pas remplacer les parcours signup/recovery PKCE par un échange implicite.

Le runtime GoTrue 2.197.0 vérifié refuse `/otp` pour un compte invité non confirmé quand signup est fermé. La reprise explicite peut réémettre `/invite` seulement pour ce même UUID invité non confirmé et vérifie sa conservation. Un compte confirmé utilise la connexion avec `create_user:false`. Pas de re-création ni de suppression d'un ancien compte.

## Interruption et reprise de livraison

1. Lire l'admission, sa révision, son horodatage immuable d'approbation et la dernière tentative via le propriétaire. `attempting`/`uncertain` n'est jamais une preuve d'absence d'action Auth.
2. Réemployer le même `operationId` ne renvoie pas silencieusement un nouveau message. Une reprise demande une nouvelle opération, `confirmed:true` et le CAS courant. Une tentative orpheline attend sa lease de 180 secondes avant reprise.
3. Réconcilier l'UUID existant côté Auth et l'adresse canonique. Une ancienne tentative ne peut finaliser une nouvelle ; une ancienne approbation ne peut traverser la réactivation de sa cible. Révoquer l'ancienne admission et prendre une nouvelle décision lorsque sa génération ou sa borne est dépassée.
4. L'utilisateur ouvre le lien dans un profil déconnecté, confirme avant `/verify`, puis confirme son admission. Depuis un autre compte déjà connecté, aucun hash n'est consommé et le message explique comment rouvrir le lien d'origine. Après reload d'une session bornée, une connexion ordinaire peut explicitement reprendre la référence d'admission sans adopter de foyer avant acceptation.
5. Ne pas modifier une génération, un seuil de session, un reçu ou un flag de production pour faire passer un essai. Les injections d'horloge des tests expirent seulement des objets fictifs ; elles ne sont pas une procédure opérationnelle.

L'expiration OTP courte est testée par de vraies secondes écoulées. L'expiration d'admission/de lien familial et la lease orpheline sont en revanche accélérées par l'horloge de la fixture SQL, distinction explicite dans les preuves.

## Rollback conservateur

Le [rollback](../../../../supabase/rollbacks/20261118120207_dobby_private_access_administration.sql) ferme l'administration et la consommation/livraison nouvelles ; il conserve autorisations, suspensions, générations, décisions, comptes Auth et liaisons déjà consommées. Il ne restaure ni les inscriptions publiques, ni les créateurs libres, ni les anciennes ACL. Les utilisateurs actifs existants gardent leur contexte familial. Les seules capacités de maintenance temporairement héritées sont des rôles applicatifs déjà administrables par l'installateur ; elles sont refermées dans la transaction, sans rôle Auth géré.

Avant un rollback réel distinctement autorisé : arrêter les nouveaux appels d'administration et les workers d'envoi, sérialiser la maintenance, conserver l'historique et examiner toute tentative incertaine. Pour reprendre ensuite, vérifier les empreintes et l'état conservé avant de rétablir explicitement les seuls grants et flags du lot ; ne pas rejouer aveuglément la migration sur le schéma existant.

Le teardown ne retire que les ressources créées par le processus de fixture. Si une commande a été interrompue, identifier ces ressources exactes dans les métadonnées de la preuve avant toute action ; ne jamais nettoyer globalement Docker ou un ancien worktree.

## Réserves maintenues

Les anciens bearer Storage et la visibilité Auth sous RLS hébergée du Lot 2B ne sont pas résolus. Ni SMTP réel, ni comptes réels, ni Edge hébergée, ni passerelle Kong, ni console Lot 4, ni ouverture des gates enfant ne sont certifiés par cette mission. Un lien Auth transmis peut faire endosser l'UUID invité à son porteur ; la liaison UUID/e-mail empêche l'acceptation par un autre compte, pas le partage volontaire du bearer.
