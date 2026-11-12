# FAM-01 — Effets Famille

Périmètre local : `essai-stitch-v7/family-review-effects.js` et `.css` étendent les particules natives E01 aux vues Famille. Le bouton permanent E01, `st.stitchPreferences`, `save()`, les étincelles d'interaction, le son et les effets du Rituel restent natifs. Aucun stockage, bouton, header, dock ou moteur de rendu supplémentaire.

Le calque utilise les variables, couleurs, formes et animations CSS `e013-*` existantes. La population reste bornée à 22 particules et n'intercepte aucun clic. Le calque Famille cède la place au calque commun déjà monté sur le Chat. La désactivation retire le calque ; le mouvement réduit retire aussi les particules sans modifier la préférence ON enregistrée. Les pages masquées, le panneau natif ouvert et le chargement suspendent l'animation.

Test ciblé, sans réseau externe ni données réelles :

```sh
DOBBY_TEST_ORIGIN=http://127.0.0.1:8863 node essai-stitch-v7/tests/family-review-effects.cjs
```

La variante `FAM01_CAPTURE_BASELINE=1` bloque uniquement les deux nouveaux fichiers pour mesurer le comportement hérité de la machinerie commune inchangée. `baseline-results.json` et les captures `baseline-*` concernent ce mode sans adaptateur. Les preuves ne constituent pas un déploiement.

Les captures ON/OFF se limitent au contenu central pour vérifier un changement réellement dessiné hors du bouton permanent. `results.json` consigne les résultats à 320, 390 et 1440 px. `reduced-motion-*` montre la préférence conservée avec animations désactivées.

Les anciens tests E01.3 affirmant que Salon/Menu n'ont aucun déploiement ambiant décrivent la portée antérieure à FAM-01 ; cette attente est remplacée localement par le besoin Famille. Les fichiers communs E01 n'ont pas été modifiés.

Validation locale : le test ciblé passe sur 13 vues (`salon`, `members`, `member-edit`, `agenda`, `memos`, `memo-edit`, `health`, `health-person`, `health-history`, `medical-edit`, `contacts`, `personal`, `menu`) à chacune des trois largeurs. Les 39 combinaisons affichent 22 particules et présentent au moins 262 pixels modifiés entre ON et OFF dans le contenu. Les préférences, le mouvement réduit, la reprise des animations, la mise en pause, le passage par le Chat, l'absence de données métier modifiées et l'absence d'audio automatique passent également.

Contrôle complémentaire à 390 px : `onboarding-house` et `onboarding-ritual` conservent leurs contrôles E06 natifs ; ON/OFF, mouvement réduit et retour à la préférence active passent (`ceremony.log`). Le comportement hérité sans l'adaptateur affiche zéro particule ambiante dans les 39 combinaisons (`baseline-results.json`).
