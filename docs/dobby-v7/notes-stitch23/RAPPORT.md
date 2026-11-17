# DOBBY V7 — Notes du foyer / Stitch 23

Branche indépendante : `feat/dobby-v7-notes-stitch23-20261116`, créée depuis `main` au commit `521c9199ac18cb71b2fbbd2717ded2f7781aa4db`. Aucun commit de la branche Archives PR #17 n’a été fusionné ou repris. Le site principal et la PR #17 ne sont pas modifiés.

## Résultat

- PNG Stitch 23 original intégré sous « Notes du foyer », sans retouche, filtre, texte ou bouton superposé. Hauteur : 155 px jusqu’à 767 px, puis 220 px. `object-fit: contain` conserve toute l’image et ses proportions.
- Boutons, recherche, textes et formulaires à 16 px minimum ; titres des cartes à 19 px ; mots-clés à 15 px. Polices, palette et composants DOBBY conservés. Styles limités aux vues Notes.
- Volet « Anciens mémos locaux », état « Foyer non connecté » et bouton « Synchroniser » retirés des Notes et de leurs formulaires. Les notes locales apparaissent dans la liste et restent dans leur registre d’origine. « Partager une copie avec le foyer » réutilise l’import manuel existant avec confirmation ; aucun import à l’ouverture ou à la recherche.
- Aucune modification du moteur `family-engine.js`, des writers, du stockage, des mécanismes hors ligne, de reprise et de synchronisation, des permissions ou des identifiants. Les alertes de conflit et les choix de résolution existants restent disponibles. Les erreurs réseau restent détectables dans l’état d’erreur de l’API native existante ; la gestion du foyer conserve ses indications de connexion à vérifier.
- Création, consultation, édition, suppression, recherche par titre/texte/mots-clés et retours Famille/Salon conservés. Aucun nouveau champ, aucune migration, aucune opération Supabase distante ni activation de droits supplémentaires.

Empreinte SHA-256 du `screen.png` extrait du ZIP et du fichier intégré `essai-stitch-v7/assets/notes-stitch23.png` :

```text
51372431f4b460278e9f287de40f4079dcfd26cd5e6a7fb53ee968548abc149d
```

## Vérifications exécutées

| Contrôle | Résultat | Preuve |
| --- | --- | --- |
| Régressions natives synchronisation, hors ligne, sauvegardes, conflits, permissions et writers mémos | 444 tests réussis | `evidence/logs/native-regressions.log` |
| Notes aux largeurs 320, 390, 768 et 1440 px | 4 parcours réussis : image, tailles calculées, absence de débordement, chrome, CRUD, identifiant stable, recherche titre/texte/mots-clés, texte long, mémo local, annulation, partage volontaire idempotent, retour Salon, alertes | `evidence/after/result.json` |
| Parcours natifs Agenda / Mémos existants | Réussis à 320, 390 et 1440 px ; formulaires, brouillons périmés et données préservées | `evidence/native/agenda-memos/result.json` |
| Registre Contacts / Notes / Listes existant | Réussi à 320 et 390 px | `evidence/logs/register-family.log` |
| Deux profils navigateur fictifs et transport HTTP intercepté | CRUD partagé, édition de B, rechargement hors ligne, reprise sur événement online, import explicite et idempotent, anciennes notes exclues des payloads, agenda et provenance préservés, signal d’erreur natif non vide hors ligne | `evidence/native/agenda-memos/sync-browser/result.json` |
| Constructeur de l’aperçu | 1 test réussi : empreintes complètes, writers et image identiques, stockage isolé, connexions réelles désactivées, refus d’écraser un aperçu | `evidence/logs/preview-builder.log` |
| Aperçu empaqueté dans Chromium | Formulaire et writer natifs, persistance après rechargement, anciennes notes conservées, autre espace de revue intact, zéro requête externe, zéro erreur JavaScript | `evidence/preview/result.json` |
| Captures comparatives | 48 captures : six écrans, avant/après, quatre largeurs | `comparatifs.html` |

Les captures « avant » proviennent du code applicatif de `main` au commit de départ. Les tests utilisent uniquement des données fictives et des profils navigateur jetables.

Le scénario HTTP historique échouait déjà avant la modification : il ne répondait pas à `dobby_v7_context` et cherchait encore l’ajout d’un mémo dans le Salon. Sa fixture utilise maintenant le contrat d’identité fictive existant du dépôt et la route Notes actuelle. Les politiques applicatives n’ont pas été assouplies. Les anciennes assertions qui ouvraient le volet local ont été adaptées à l’accès direct aux notes locales. L’échec initial est conservé dans `evidence/logs/original-sync-fixture-failure.log`.

Le test visuel a d’abord échoué sur l’absence de l’illustration avant de passer après intégration (`expected-before-failure.log`). Le test d’alerte avec statut injecté vérifie le rendu uniquement ; les garanties de transport et de reprise reposent sur les tests natifs et le scénario HTTP intercepté.

## Aperçu isolé et reproduction

Construction à partir des sources commises, dans un nouveau répertoire :

```bash
node scripts/build-dobby-notes-review.cjs --output /tmp/dobby-notes-review
python3 -m http.server 8873 --bind 127.0.0.1 --directory /tmp/dobby-notes-review
```

Ouvrir `http://127.0.0.1:8873/`. L’entrée pointe directement vers les Notes. Le manifeste `review-manifest.json` indique le commit source, les transformations de l’enveloppe et les empreintes de toutes les ressources. Espace de stockage propre : `dobby-review-v7-notes-stitch23-20261116|`. Le backend est simulé ; la CSP bloque les connexions externes. Les commandes de la barre de revue appartiennent à l’enveloppe de démonstration, hors du module produit.

Contrôles reproductibles depuis le dépôt (Chromium installé et dépendances de `essai-stitch-v7/tests` présentes) :

```bash
python3 -m http.server 8863 --bind 127.0.0.1
node essai-stitch-v7/tests/notes-stitch23.cjs
DOBBY_TEST_ORIGIN=http://127.0.0.1:8863 node essai-stitch-v7/tests/fam-agenda-memos.cjs
DOBBY_TEST_ORIGIN=http://127.0.0.1:8863 node essai-stitch-v7/tests/fam-agenda-memos-sync.cjs
DOBBY_TEST_ORIGIN=http://127.0.0.1:8863 node essai-stitch-v7/tests/register-family.cjs
node --test essai-sync-v1/tests/*.test.mjs essai-sync-v2/tests/*.test.mjs essai-stitch-v5-famille/tests/*.test.mjs essai-stitch-v7/tests/e09-memo-writer.test.cjs
node --test essai-stitch-v7/tests/notes-review-build.test.cjs
node essai-stitch-v7/tests/notes-preview.cjs
```

Lancer les serveurs dans des terminaux séparés. Le dernier contrôle attend l’aperçu servi au port 8873. `CHROMIUM_PATH` et les variables d’URL des tests permettent de changer le navigateur et les ports.

## Limites et revue

Les tests HTTP et A/B sont simulés. **La synchronisation entre les deux vrais comptes familiaux n’a pas été testée ni annoncée comme validée.** Elle reste différée à la recette globale DOBBY. Aucun essai sur téléphone ou tablette physique ; les quatre largeurs ont été contrôlées dans Chromium. La campagne historique de tous les autres modules n’a pas été relancée ; les contrôles portent sur le périmètre demandé et les régressions natives partagées.

La branche est conservée pour revue avant fusion. Aucun déploiement sur le site principal.
