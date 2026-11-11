# E06 — Consolidation visuelle et fonctionnelle

**Correction indépendante, non publiée et non validée visuellement par l’utilisateur.** Branche `fix/dobby-e06-visual-functional`, base `66a1395bb95ff7b9a7e2d1b981f5a8773070c03e`. [Mission reçue](E06-VISUAL-FUNCTIONAL-SPEC.md).

## Changements effectivement raccordés

- Le Choixpeau est l’image panoramique Stitch **1376 × 768** fournie dans ZIP10, cadrée entière. Le HTML à dix questions reste archivé et n’est jamais chargé comme questionnaire.
- Les quatre blasons **originaux Stitch**, 1024 × 1024, sont associés strictement : Gryffondor/lion doré, Serpentard/serpent émeraude, Serdaigle/aigle bronze, Poufsouffle/blaireau ambré. Ils ne sont pas présentés comme officiels. La carte immuable `DobbyCeremonyArt.houses` et le renderer `houseEmblem()` sont communs au résultat E06, à Ma Maison E05 et à l’identité finale.
- Effets **ON** sans préférence, Son **OFF**. La lecture partagée et l’initialisation au premier clic utilisent les mêmes valeurs ; un `effects:false` enregistré reste prioritaire. Aucun défaut n’est écrit au montage. La réduction système conserve l’état enregistré mais désactive les mouvements et la longue traversée.
- La traversée utilise le Canvas existant et transforme ensemble flammes, bouton, badge, décor et lumière. Le texte indique la progression. Les interruptions et erreurs remettent ces éléments au repos avec nettoyage des timers/audio ; aucun nouveau moteur.
- « **Revoir le Rituel** » est placé tôt dans le Foyer et reste accessible dans Compte et paramètres. L’action explicite force `record=replay`, sans modifier `seen`, membre, réponses ou runes ; les ouvertures ordinaires gardent leur logique.

Les six questions Maison et cinq Patronus, leurs départages, le scoring, les drafts, les confirmations, avatars et writers natifs sont conservés. [Empreintes protégées](evidence/e06-visual-functional/protected-source-hashes.json). Aucun fichier V5 ou asset historique supprimé/modifié.

## Sources et provenance

[Originaux conservés](../../design/e06/references/visual-20261111/) · [manifestes des copies actives](../../essai-stitch-v7/assets/ceremony-v2/provenance.json).

| Ressource | SHA-256 |
|---|---|
| ZIP10 | `21f27e807d251eb93b79da0d6674c6f140115a83598eba0f54f5ed4dc09e0a3d` |
| ZIP11 | `d77a4203d51689d7bd1bd42d128cc2a1d2682937151a2ce5db7a8cdfe46f2bc2` |
| Choixpeau | `0a0dd977eff92d06157590355fd18bb54c64062921b6af7aab7b2f289b15b7a9` |
| Gryffondor | `7cdcee1094f4eb7f36da04e321ce54e3122295b05d4afa083251d7e4c827028c` |
| Serpentard | `a51c6e16dc3cf2456ab8063a3d548dcf662d493520ebbb2472dcf294e3f2c4d9` |
| Serdaigle | `77612a996215a2cf8335a5fa5e7e40e15ec1760bf4bc0cc9ae9da4d957ff868d` |
| Poufsouffle | `221590fbe9cf1f5142e19aca58c0456c2491c41bc64cebaa46b029fba1ee10f4` |

Les copies Web sont identiques aux PNG sources ; aucune image externe temporaire, aucun remplacement d’asset historique. Les sources graphiques nouvelles ne modifient pas la question historique des droits sur des blasons officiels : le choix présent utilise les illustrations originales expressément fournies par cette mission.

## Tests réellement exécutés

| Vérification | Résultat / preuve |
|---|---|
| Art et parcours natifs, 320/390/1440 | **PASS** : quatre résultats réellement calculés puis confirmés ; même image dans trois contextes, décodage/dimensions/proportions, Choixpeau, avatar et ledger conservés. [Journal](evidence/e06-visual-functional/art-green.log), [résultats](evidence/e06-visual-functional/art/after/results.json). |
| Préférences, vert peint et replay, 320/390/1440 | **PASS** : ON sans préférence, Son OFF, désactivation sur six destinations et rechargement, réduction sans réécriture, deux replays/Foyer/paramètres, données et réponse B inchangées. [Rapport](evidence/e06-visual-functional/effects/README.md), [mesures](evidence/e06-visual-functional/effects/after/results.json). |
| Parcours E06 depuis le Rituel, 320/390/1440 | **PASS** : création native, reprise/rechargement, questionnaires, confirmations, identité finale et ledger. [Journal](evidence/e06-visual-functional/e06-native-journey.log). |
| Régression E05, 320/390/1440 | **PASS** : quatre Maisons, douze Patronus, grades/seuils et historique inchangés, éditions persistantes. [Journal](evidence/e06-visual-functional/e05-regression.log). |
| Erreurs/lifecycle du Rituel, 320 | **PASS** : rejet des métadonnées, fermeture audio, réessai, interruption pendant écriture et absence de navigation tardive ; données métier identiques. [Revue indépendante](evidence/e06-visual-functional/lifecycle-review.log), [états](evidence/e06-visual-functional/lifecycle/results.json). |

Les RED utiles sont conservés : absence d’image attendue, défaut Effets initial et bouton/badge dorés alors que le Canvas était déjà vert. Le premier essai art a aussi révélé une attente de nom de copie Web différente du nom réellement choisi ; le nom est corrigé sans retrait des contrôles de contenu, dimension ou partage de ressource. Aucune assertion métier supprimée pour obtenir le vert.

Les attentes historiques E01 sont adaptées au nouveau défaut **ON**, puis vérifient toujours OFF explicite/rechargement/ON et les véritables animations. L’ancienne assertion E05 du placeholder officiel est remplacée par le décodage de la ressource Stitch fournie, avec vérification qu’elle n’est pas qualifiée d’officielle. Les autres parcours historiques sont conservés.

Une seule campagne globale finale est déclenchée au push final, car `chrome.js` est commun. Sa conclusion au SHA final est fournie avec la livraison pour ne pas modifier ensuite cet artefact immuable.

## Preuve visuelle du vert

| Largeur | Pixels verts Canvas avant → traversée | Durée mesurée |
|---|---|---|
| 320 | 0 → 4462 | 2664 ms |
| 390 | 0 → 4540 | 2675 ms |
| 1440 | 0 → 4404 | 2721 ms |

Ces valeurs viennent de `getImageData()` ; le gradient du bouton, le badge, le point lumineux et le flash sont également mesurés et photographiés. Le contrôle ne se limite pas à une classe CSS.

## Captures comparatives

[Index comparatif](evidence/e06-visual-functional/CAPTURES.md) · [39 vues avant](evidence/e06-visual-functional/art/before/) · [39 vues après](evidence/e06-visual-functional/art/after/) : quatre Maisons × résultat/profil/final, plus Choixpeau, à chaque largeur. [Transition et replay avant/après](evidence/e06-visual-functional/effects/). Images, atlas CSS et fontes sont attendus avant les captures. Les nouvelles captures de régression E05 sont conservées [dans ce lot](evidence/e06-visual-functional/regression/e05/), sans remplacer les anciennes preuves E05.

Les captures longues conservent les barres fixes à la position du viewport ; les vérifications de géométrie et de clic contrôlent séparément l’absence de blocage des actions.

## Intégrité, déploiement et réserves

Les branches/worktrees existants et les PR2/3 ont été inventoriés avant création de ce worktree indépendant. L’intégration de référence reste à66a1395 ; la publication existante reste à`e24682d34f01c26c40da2399754749ced35f0bad`. Aucun merge, déploiement, Supabase, SQL, compte réel ni changement de règle d’accès. Les vérifications utilisent des contextes Chromium éphémères avec données TEST et réseau extérieur bloqué.

Le registre est complété par **ajout uniquement** ; son contenu66a1395 reste un préfixe octet pour octet identique. Les95 lignes de matrice historiques restent inchangées ; les compléments66a1395 et de cette mission sont ajoutés distinctement pour réconcilier la couverture mécanique. Les nouvelles images sont explicitement originales Stitch, pas des blasons officiels.

Réserve : la validation visuelle et fonctionnelle de l’utilisateur reste nécessaire. Recette Chromium responsive, sans essai physique Safari/iPhone ; aucune validation utilisateur ni publication n’est déduite de la CI.

[Liste complète des fichiers](evidence/e06-visual-functional/changed-files.txt) · [diff textuel](evidence/e06-visual-functional/code-and-provenance.diff). Arrêt pour revue humaine.
