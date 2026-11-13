# Reproduire les contrôles hors production

Les commandes s'exécutent depuis la racine du dépôt. Elles ne prennent aucun hôte Supabase en paramètre et les tests navigateur bloquent les destinations externes avant envoi. Les profils `TEST`/fixtures ne doivent jamais être chargés comme configuration de production.

```sh
npm ci --ignore-scripts --prefix essai-stitch-v7
npm ci --ignore-scripts --prefix essai-stitch-v7/tests
python3 -m http.server 8765 --bind 127.0.0.1
```

Dans un autre terminal du même checkout, utiliser le chemin de Chromium/Chrome réellement installé :

```sh
node --test essai-sync-v1/tests/*.test.mjs essai-sync-v2/tests/*.test.mjs essai-stitch-v5-famille/tests/*.test.mjs essai-stitch-v7/tests/*.test.mjs essai-stitch-v7/tests/*.test.cjs
CHROMIUM_PATH=/usr/bin/chromium DOBBY_TEST_ORIGIN=http://127.0.0.1:8765 DOBBY_REVIEW_EVIDENCE=/tmp/dobby-review-evidence node essai-stitch-v7/tests/revue-generale-ci.cjs
CHROMIUM_PATH=/usr/bin/chromium DOBBY_TEST_ORIGIN=http://127.0.0.1:8765 DOBBY_STITCH1920_EVIDENCE=/tmp/dobby-access-evidence node essai-stitch-v7/tests/stitch19-20-ci.cjs
node scripts/check-dobby-review60-report.cjs
```

Le runner de revue comprend aussi les parcours Profil/Contrats et les anciennes routes de cérémonie connectées. Chaque campagne compare les sources avant/après. Les fixtures HTTP de synchronisation ne certifient pas le serveur réel. Les preuves sont dirigées vers un répertoire séparé ; conserver les preuves historiques versionnées.

## SQL exact, uniquement dans un PostgreSQL sans réseau

Les deux scripts Python imposent le nom du conteneur dédié et refusent un conteneur avec réseau ou ports. Ils reconstruisent uniquement leurs bases `dobby_review_guard_test` et `dobby_review_shopping_test` fictives. Ne pas les adapter pour un hôte distant. Utiliser le daemon local, sans sélecteur de contexte Docker distant.

```sh
docker --host=unix:///var/run/docker.sock pull postgres:17.7
docker --host=unix:///var/run/docker.sock run -d --name dobby-stitch1920-pg-20261113-review --network none -e POSTGRES_HOST_AUTH_METHOD=trust -e POSTGRES_USER=dobby_local_test postgres:17.7
```

Attendre que `pg_isready` réussisse dans ce conteneur, puis lancer avec les sélecteurs distants Docker retirés de l'environnement du processus :

```sh
env -u DOCKER_HOST -u DOCKER_CONTEXT -u DOCKER_TLS -u DOCKER_TLS_VERIFY -u DOCKER_CERT_PATH python3 docs/dobby-v7/revue-generale/supabase/tests/run-role-guard-local.py
env -u DOCKER_HOST -u DOCKER_CONTEXT -u DOCKER_TLS -u DOCKER_TLS_VERIFY -u DOCKER_CERT_PATH python3 docs/dobby-v7/revue-generale/supabase/tests/run-shopping-local.py
```

Le trust Auth est limité à ce conteneur sans réseau ni port, avec utilisateur fictif. Les tests de policies utilisent un contexte SQL fictif déclaré et ne testent pas les helpers privés réels. Les scripts d'installation manuelle ne sont jamais appelés par le déploiement GitHub Pages.

## Contrôle de livraison en lecture seule

Après CI et Pages terminés, `scripts/check-dobby-v7-integration-gate.py` contrôle le main attendu, les refs de la première mission et son dernier déploiement. `scripts/verify-dobby-v7-hosted.py --sha SHA --output /tmp/hosted.json` compare les fichiers effectivement servis aux objets Git immuables, en utilisant les URLs réelles des scripts référencés. `tests/revue-hosted-public.cjs` parcourt uniquement l'accueil et le formulaire de connexion publics, sans soumission ni fixture d'identité et sans requête Supabase. Ces contrôles ne certifient pas les parcours authentifiés.
