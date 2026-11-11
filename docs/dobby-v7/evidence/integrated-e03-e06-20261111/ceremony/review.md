# Revue indépendante — checkpoint D / cérémonie

Date : 2026-11-11. Source consultée : `87d94598cf78b4ca1f76e8924f55a36b2eefbba5`, diff fourni `/workspace/scratch/integrated-ceremony-review.diff`, spécification §§7–10 et rapport `REVIEW-E03-E06-20261111-CEREMONY.md`. Périmètre : questionnaires, scoring, brouillons et présentation Maison/Patronus. Runes, autres auteurs et CI exclus.

## Constat matériel

### D-01 — P2 — Le Retour de q2 vers q1 est neutralisé pour un brouillon migré

**Localisation :** `essai-stitch-v7/onboarding.js:12` (`prepare`). Confiance élevée ; démonstration par suivi du code, sans exécution supplémentaire.

**Déclencheur :** ouvrir un ancien brouillon `e06-v1` contenant une réponse q2 non confirmée, puis cliquer sur le bouton Retour alors que la nouvelle q2 est affichée, avant d'y répondre.

La migration (`onboarding-drafts.mjs:21–24`) place correctement le brouillon à `index=1`, conserve l'archive et ajoute `scoringNotice`. Retour appelle `previous('house')`, qui enregistre `index=0` (`onboarding-engine.js:16`), puis `nav()` produit `record:'q0'` (`onboarding.js:11,99`). À la préparation de cette route, la condition ajoutée ligne 12 remplace **tout** index demandé par `1` dès que `scoringNotice` existe : q1 n'est donc jamais affichée et le bouton semble sans effet. Les Retour répétés restent sur q2 jusqu'à une nouvelle réponse à cette question.

Cela contrevient à la navigation arrière à préserver (§7). Il faut empêcher les liens vers une question ultérieure de contourner q2 sans interdire le retour vers une question antérieure. L'invalidation de q2 et le refus de calculer un questionnaire incomplet suffisent toujours à empêcher une confirmation utilisant l'ancienne réponse.

**Couverture existante :** `review-integrated-ceremony-compat.cjs` vérifie le lien ancien `q5` vers q2 puis répond immédiatement ; `review-integrated-ceremony.cjs` vérifie Retour sur un questionnaire redémarré, sans `scoringNotice`. Leurs PASS documentés ne couvrent donc pas ce déclencheur.

## Verdicts par exigence

| Point | Verdict et justification |
|---|---|
| Un seul radio / coche or | Conforme : véritables radios de même groupe, état `checked` unique ; CSS `:has(input:checked)` pilote seul la visibilité de `✓`. Le changement clavier, reload, retour courant et les questions complémentaires sont couverts par les preuves existantes aux trois largeurs. Réserve D-01 pour le retour après migration. |
| Copie exacte q2 | Conforme : titre, question et quatre réponses du JSON correspondent à la copie approuvée ; identifiants q2/A–D conservés et vérifiés dans le moteur et le navigateur. |
| Axes et versions | Conforme : A anticipation/investigation, B action/anticipation, C action/investigation, D lien/anticipation, avec justification explicite. Six questions et départage conservés ; autres axes et Patronus inchangés. `versionFor` enregistre Maison `e06-v2`, Patronus `e06-v1`. La distribution v2 différente est publiée honnêtement, sans revendiquer la borne v1 de 10 %. |
| Brouillons et champs inconnus | Conforme sur les données : copie intégrale du brouillon v1 avant invalidation de q2 ; autres réponses, champs d'extension et enveloppe conservés. Pas d'écriture à la lecture ; adoption/archivage lors de la transaction native suivante, avec contrôle de conflit existant. Brouillons Maison confirmés et sans réponse q2 préservés. Ancien client et versions futures refusent le conteneur incompatible. Navigation après migration à corriger selon D-01. |
| Résultats confirmés / recalcul | Conforme : chargement et rendu ne réattribuent aucune Maison. `finish()` accepte les versions historiques et ne transmet aucun nouveau résultat. Nouvelle attribution après questionnaire complet et confirmation explicite uniquement. |
| Validation native | Conforme et limitée : `family-profile.js:20` ajoute seulement Maison v2 à la liste autorisée ; Patronus reste v1, futures versions refusées, profil/identifiant validés et champs inconnus conservés. `linkedMember=()=>null` inchangé. |
| Douze Patronus et Profil | Conforme dans les preuves : renderer partagé, cellule d'atlas 3:4 avec fond `400% 300%`, sans nouveau recadrage ni étirement ; cadres finaux égaux et titres alignés, y compris formats hauts/larges, aux largeurs 320/390/1440. Captures finales Cygne 320 et Profil Cygne 390 examinées visuellement : agrandissement et équilibre convaincants. Aucun asset dupliqué. |

## Preuves et limites

Les journaux fournis sont PASS : `ceremony-green.log`, `ceremony-compat-green.log`, `ceremony-extras-green.log`, `ceremony/scoring/green-final.txt` (8/8), `regression.txt` (18/18) et `profile-and-confirmation.txt` (14/14). Les assertions des tests joints au diff et `ceremony/after/results.json` ont été lus. Aucun test n'a été relancé, aucune preuve PASS n'est présentée comme une nouvelle exécution de cette revue.

Inspection statique et inspection de captures existantes ; pas de nouvelle recette navigateur, pas de Safari/iPhone physique, pas de compte ni d'API réelle. Cette revue ne valide ni l'intégration globale, ni les runes, ni la CI, ni la publication.

**Verdict D : correction demandée pour D-01 ; reste du périmètre conforme sur le code et les preuves consultés.** Uniquement ce fichier de revue a été créé ; aucun source, index, compte ou service n'a été modifié.

## Relecture ciblée D-01 — 2026-11-11

La revue initiale ci-dessus est conservée comme historique. Cette relecture porte uniquement sur `/workspace/scratch/integrated-ceremony-d1-fix.diff`, l'appendice D-01 du rapport CEREMONY et les nouvelles preuves fournies.

**D-01 : corrigé.** À `onboarding.js:12`, `Math.min(1, Number(ui.record.slice(1)))` remplace la réimposition inconditionnelle de l'index 1. Le format de route reste préalablement restreint à `q0`–`q6` : `q0` conserve désormais l'index 0 ; `q1` et les routes ultérieures restent bornées à l'index 1 tant que la nouvelle q2 n'a pas été répondue. Le Retour natif q2→q1 fonctionne donc sans rétablir l'ancienne réponse q2 ni permettre de la contourner. Les routes Patronus et les questionnaires sans notice ne changent pas de comportement.

Le complément du test de compatibilité (`review-integrated-ceremony-compat.cjs:12–16`) exerce le bouton Retour réel, vérifie la réponse q1 persistée et q2 toujours `null`, puis Continuer vers q2 avec zéro radio sélectionné et bouton désactivé. Il vérifie encore le lien q6 après cette séquence. Les assertions existantes de conservation de l'archive, du résultat v1, du reload et de la nouvelle réponse demeurent présentes.

Preuves consultées : `ceremony-d1-back-red.log` présente le timeout attendu sur le retour vers q1 à 390 px avant correctif ; `ceremony-d1-back-green.log` consigne PASS à 320/390/1440 après correctif. `ceremony/compat/results.json` confirme les trois largeurs et `backAfterMigration: "q1 allowed; q2 still mandatory"`. Ces preuves concordent avec le changement de code ; aucun nouveau constat matériel ni nouvelle régression dans ce diff limité.

**Verdict D actualisé : conforme sur le code et les preuves consultés ; aucun constat matériel ouvert.** Aucun test relancé par cette relecture. Les limites de la revue initiale restent applicables ; seul le présent fichier de revue a été modifié.
