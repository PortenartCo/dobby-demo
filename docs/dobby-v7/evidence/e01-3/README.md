# E01.3 — Standard / Doré réellement animé

Référence : `06f930cff4e72164c247fa1843f15c77f1a6b781`. Aucune donnée de foyer injectée dans les scénarios d’ambiance : profils vides isolés, réseau externe bloqué, préférences actionnées par les vrais boutons. Les sources Stitch, les cartes et le fichier image restent intacts.

## Preuve animée obligatoire

[Vidéo réelle OFF → ON → OFF → ON → OFF, 9 secondes, 390 × 844](ambiance-390.mp4).

Enregistrement direct du navigateur avec les animations CSS en cours, sans montage d’images ni accélération. Seul le chargement initial est retranché et le fichier encodé en H.264/MP4, 25 images/seconde. Le son n’est pas enregistré : l’indépendance audio/vibration est vérifiée séparément par observation des appels aux API. [Chronologie réelle du tournage](video.json).

Lecture : environ 0–1 s OFF ; 1–5 s ON (les effets continuent après la fin des étincelles brèves) ; 5–6 s OFF ; 6–8 s ON ; fin OFF. La vidéo montre une émulation iPhone 13 sous Chromium, pas un appareil physique.

## États et moteurs

| Contrôle | OFF | ON | Mouvements réduits |
|---|---|---|---|
| Chromium, iPhone émulé 390 px | [OFF](chromium-off-390.png) | [ON](chromium-on-390.png) | [Statique](chromium-reduced-390.png) |
| Chromium, ordinateur 1440 px | [OFF](chromium-off-1440.png) | [ON](chromium-on-1440.png) | [Statique](chromium-reduced-1440.png) |
| WebKit Linux, iPhone émulé 390 px | [OFF](webkit-off-390.png) | [ON](webkit-on-390.png) | [Statique](webkit-reduced-390.png) |
| WebKit Linux, ordinateur 1440 px | [OFF](webkit-off-1440.png) | [ON](webkit-on-1440.png) | [Statique](webkit-reduced-1440.png) |

Les captures fixes servent seulement à comparer les états. Le mouvement est contrôlé par la vidéo et les variations mesurées des matrices/opacités, pas déduit de ces images.

## Vérifications reproductibles

- `node essai-stitch-v7/tests/e01-3.cjs` : Chromium, deux largeurs, taps à 390 px.
- `DOBBY_E013_BROWSER=webkit node essai-stitch-v7/tests/e01-3.cjs` : WebKit, deux largeurs, taps à 390 px (runtime de test WebKit requis).
- `node essai-stitch-v7/tests/e01-3-video.cjs` : vidéo, avec le FFmpeg de test Playwright et l’encodeur FFmpeg système ; aucune dépendance de l’application ajoutée.
- `DOBBY_E01_EVIDENCE_DIR=/tmp/e013-regression node essai-stitch-v7/tests/e01.cjs` : parcours et bandeaux E01 existants, avec assertions supplémentaires de périmètre et de mode réduit.

[Contrôles Chromium](checks-chromium.json), [contrôles WebKit](checks-webkit.json), [résultats des commandes](results.txt).

Contrôles effectués : apparition sous deux secondes ; 22 particules bornées ; vrai changement des transformations et de l’opacité ; halos évolutifs ; propriétés animées limitées à `transform`/`opacity` ; suppression OFF immédiate ; huit cycles et quinze remontages sans accumulation ; nettoyage des éléments temporaires ; pause des chronologies CSS réellement mesurée ; mode réduit avec indicateur statique ; appels audio/vibration nuls pour l’étoile alors que le son est ON ; préférence conservée après rechargement et passage par les autres destinations ; aucun calque ambiant sur ces pages ; navigation, taps et absence de débordement ; données de foyer, image et carte de repas inchangées.

## Performance, portée et limites

La population permanente est créée une fois par activation et réutilisée : aucun ajout DOM à chaque image, aucune boucle JavaScript de rendu. Les éléments d’interaction sont plafonnés à 40. Palette, intensité, vitesse, forme et halos sont regroupés dans un descripteur et quelques variables CSS. Aucun calendrier saisonnier, sélection de thème ou E01.4.

Les cadences consignées dans les JSON sont des échantillons `requestAnimationFrame` de 1,2 seconde sur une machine de test. Elles ne mesurent ni la batterie ni la fluidité d’un iPhone physique. Le test d’arrière-plan simule le signal `document.hidden`/`visibilitychange`, puis vérifie la pause et l’arrêt des temps CSS ; il ne constitue pas une mesure d’énergie en veille du système.

WebKit est le moteur WPE sous Linux, avec profil mobile, et non Safari iOS sur appareil. La molette native n’est pas disponible dans l’automatisation WebKit mobile : ses taps sont réellement émulés, son défilement est vérifié programmatiquement ; la molette est testée dans Chromium et WebKit ordinateur. Les gestes physiques, Safari iOS, consommation et recette utilisateur restent à valider sur matériel réel.

Aucun défaut restant identifié dans le périmètre automatisé. Aucune publication, modification de données réelles ou déploiement.
