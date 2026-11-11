# Revue intégrée — Contrat historique register-tools

11 novembre 2026 — Sous-lot limité à `essai-stitch-v7/tests/register-tools.cjs`. Aucun code produit ni autre test modifié dans cette reprise.

**Cause vérifiée.** La CI au commit `87421ca` s'arrête à la ligne 4 : délai de 12 secondes dépassé en cliquant une carte dont la mission native a pour échéance le `2027-01-01`. La spécification §4 exige désormais un défaut de sept prochains jours. La fixture historique reste hors de cette période ; l'absence de carte dans cette sélection est donc attendue. Le journal RED CI a été conservé dans `evidence/integrated-e03-e06-20261111/legacy-register-tools/ci-87421ca-red.log` ; le timeout n'a pas été répété.

**Adaptation minimale.** Après les deux retours sur Missions, le test choisit l'option `all` du sélecteur `[data-e03-period]` et ouvre les éventuelles sections repliées par leur `summary`. La date de fixture, les writers natifs et les 27 assertions historiques restent inchangés : création/édition sans doublon, clôture/réouverture, annulation de suppression, indépendance des sources automatiques, rechargement, conversation et panier natifs, recherche, profil explicite, fiche absente et éditeur périmé. Une variable `DOBBY_REGISTER_TOOLS_EVIDENCE` redirige les captures vers un nouveau dossier et préserve les preuves historiques.

**GREEN ciblé.** `REGISTER_TOOLS_PASS 320` et `REGISTER_TOOLS_PASS 390`, processus terminé avec exit 0. Journal : `evidence/integrated-e03-e06-20261111/legacy-register-tools/green.log` ; six captures dans `legacy-register-tools/green/`. Origine `http://127.0.0.1:8893`, Chromium `/usr/bin/chromium`, profils éphémères et réseau externe bloqué. `node --check` et `git diff --check` du script : PASS.

Aucune campagne complète répétée. Sous-lot gelé, sans stage, commit, push ni publication.
