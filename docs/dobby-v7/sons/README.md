# DOBBY V7 · Sons et ambiances

Le travail a commencé au SHA `ae815199225d277fb8ed0dbb6925f4aebf24f99b` de #53. La branche de #53 a ensuite avancé à `71528e1a7f9e9ba45227730debd067f8dd099c75` avec le correctif de fin de parcours Cuisine hors ligne. Les fichiers applicatifs contrôlés sont identiques entre ces deux bases. Le correctif hors ligne fait partie de la base d’empilement. [PR #53](https://github.com/PortenartCo/dobby-demo/pull/53) · [Diff des bases](https://github.com/PortenartCo/dobby-demo/compare/ae815199225d277fb8ed0dbb6925f4aebf24f99b...71528e1a7f9e9ba45227730debd067f8dd099c75)

## Inventaire et points de raccordement

| Fonction | Comportement au SHA demandé | Comportement livré | Fichiers |
| --- | --- | --- | --- |
| Chrome V7 | Bip de 660 Hz et vibration sur la plupart des clics | Confirmation à l’activation volontaire de **Sons**, transition lors d’un changement de rubrique dans le document. Les clics ordinaires gardent leur retour visuel. | `chrome.js` |
| Rituel et Cheminette | Synthèse multipiste dans un second contexte audio | Signal de transition commun au clic **Traverser**. Canvas, durée, chemin raccourci et vibrations d’origine conservés. Le signal s’arrête lorsqu’on passe le rituel. | `ritual.js`, `build-onboarding.cjs`, `ritual-effects.js` |
| Notifications Missions et Runes | Compteur et annonce visuelle | Signal court à l’arrivée d’une nouvelle alerte pour un parent déjà en session. La première lecture d’une session reste silencieuse. | `bridge.js` |
| Actions Missions | Bip commun au clic, même avant la réponse du writer | Confirmation des réalisations, demandes et validations accompagnées seulement après réussite. Le code reconnaît les alertes produites par l’action locale. | `bridge.js`, `tools-register.js` |
| Runes | Bip commun au clic et retours visuels | Signal de récompense lors de la confirmation d’une récompense, d’un bonus, d’un palier ou d’une correction enregistrée. | `member-avatar.js` |
| Cuisine et minuteurs | Bip commun au clic et à l’échéance | Confirmation après planification réussie et alerte distincte à l’échéance. Calcul, pause, reprise, affichage final et événement minuteur conservés. | `chrome.js`, `cuisine-e074.js` |
| Parler à Dobby | Synthèse vocale E02, déclenchée par le parent | Voix et permissions existantes. Les décors saisonniers sont silencieux. | `chat.js`, `seasonal-effects.js` |

Les chemins applicatifs du tableau sont relatifs à `essai-stitch-v7/`. Les signatures et les opérations inverses utilisées dans la recette transversale relient les modifications au SHA demandé. [Empreintes sources](../../../essai-stitch-v7/tests/fixtures/sons-source-extensions.json)

Le moteur `magic-audio.js` utilise un contexte Web Audio par document et charge les WAV publics en entier à la demande. **Sons** est désactivé au premier lancement. Après reload, sortie d’arrière-plan ou changement de compte, il faut un nouveau geste dans l’application pour permettre la lecture. Un signal périmé est abandonné. À niveau constant, la priorité décroît du minuteur à la confirmation en passant par récompense, notification, puis transition. Un même signal est limité à un départ toutes les 600 ms. Une interruption applique un fondu maximal de 15 ms. Les contrôles **Effets** et **Décorations saisonnières** conservent leur rôle indépendamment de **Sons**. [Lecteur](../../../essai-stitch-v7/magic-audio.js)

Les cinq gestes sont une note ronde, un arpège léger, un souffle montant, un appel descendant et une alerte courte à trois notes. Leur source produit uniquement des formes d’onde calculées. [Générateur](../../../scripts/build-dobby-v7-sounds.py) · [Contrôle technique indépendant](controle-audio.md) · [Mesures et SHA-256 des WAV](controle-audio.json)

## Comparaison avec #26

La branche #26 et le SHA demandé de #53 ont pour ancêtre commun `2f2f38b1`. Le SHA `682e09b9f0c57652da01588bb4f4118d4da7cbe0` de #26 et l’aperçu saisonnier isolé déjà présent dans #53 contiennent les mêmes trois fichiers de calendrier, JS et CSS. Les trois fichiers ont été repris octet pour octet. L’application de #53 utilisait encore les effets dorés natifs sans charger cet adaptateur.

Les hunks de raccord historiques ne s’appliquent plus directement aux versions de `build-source.cjs`, `chrome.js` et `tools-register.js` de #53. Le chargement est réintroduit aux quatre racines actuelles et l’adaptateur de #26 s’applique à côté des effets existants. Il conserve le calendrier Europe/Brussels, les fêtes fixes et mobiles, les préférences, le mouvement réduit et les six rubriques. Les modules Auth, enfants, Santé et le moteur de synchronisation restent ceux du socle V7. [Diff de #26](https://github.com/PortenartCo/dobby-demo/pull/26/files) · [Calendrier #21](https://github.com/PortenartCo/dobby-demo/issues/21)

## PWA et recette

Le shell ajoute neuf fichiers publics à la liste fermée. Les WAV représentent au total 96 700 octets. Le service worker prépare les ressources statiques pour l’usage hors ligne, y compris quand le réglage **Sons** est désactivé. Le lecteur ne demande et ne décode un échantillon que lorsque le geste et le réglage autorisent la lecture. Les règles d’exclusion des ressources privées, des requêtes authentifiées et des plages restent en vigueur. Les assets audio, les ressources de saison et les fichiers modifiés participent à l’empreinte du shell. [Inventaire](../../../essai-stitch-v7/pwa-shell.js)

| Contrôle | Preuves |
| --- | --- |
| WAV reproductibles et comportement du lecteur | `python3 scripts/build-dobby-v7-sounds.py --check` et `node --test essai-stitch-v7/tests/magic-audio.test.cjs essai-stitch-v7/tests/magic-mission-feedback.test.cjs` |
| Chromium à 320, 390, 768 et 1440 px | Job **sounds-and-seasons**, artefact `dobby-v7-sons-ambiances` avec captures, durées observées, requêtes WAV, cycle de vie et réduction du mouvement |
| Trois fêtes sur six rubriques, quatre largeurs et tests calendaires | Recettes `seasonal-browser.cjs`, `seasonal-pages.cjs` et `seasonal-calendar.test.cjs` |
| Mission, notification, récompense | Bundle isolé de #53 et acteurs Lou et parent B dans `magic-mission-browser.cjs` |
| Démonstration isolée, hors ligne et mise à jour PWA | Workflows existants du socle, dont `dobby-v7-global-demo.yml` et `dobby-v7-pwa.yml` |
| Empreinte et dérivation | `node scripts/build-dobby-v7-pwa.cjs --check` et `node --test essai-stitch-v7/tests/fam-integration-transverse.test.cjs` |

Le niveau indiqué en dBFS mesure le signal numérique. Le niveau acoustique dépend de l’appareil, et l’appréciation auditive reste réservée à la revue globale du propriétaire. Les tests Chromium simulent le passage en arrière-plan et le cycle de vie du document. La restitution sur Safari/iOS réel et les alertes de minuteur lorsque l’application est en arrière-plan restent à confirmer sur appareil.

La recette historique autonome `e06-ritual.cjs` demande encore un dock masqué pendant la cérémonie. Elle échoue sur cette assertion au SHA demandé ainsi que sur la branche des sons. Les recettes actuelles `stitch-entry-ritual.cjs`, `e06-ritual-errors.cjs` et `v7-connected-ceremony-dock.cjs` vérifient les parcours maintenus, dont le dock conservé.
