# E06 — Préférences et isolation du nouvel aperçu

## Cause vérifiée et limite de reproduction

**Le défaut ON n’est pas reproduit dans un profil neuf.** L’application canonique et le nouvel aperçu de contrôle ouvrent le Rituel avec Effets ON, un bouton doré actif (`aria-pressed="true"`, non désactivé) et Son OFF. La lecture des défauts ne crée aucune préférence persistée.

Le `chrome.js` publié au commit `c220d125584f1c2f2a88bbe4baa6049e974490b6` est octet pour octet identique au composant canonique intégré : SHA-256 `77bea89bfe71f02ea570a0b6efcb5b221d8c5eeac7ed6732fecd817c5de2446a`. La configuration de cet aperçu n’initialise pas `effects:false`. [Références vérifiées](published-reference.json).

**Un état OFF déjà enregistré reproduit le constat visuel** et persiste après rechargement/navigation. Le format historique ne porte aucun marqueur distinguant un ancien défaut automatiquement écrit d’un choix volontaire. L’origine exacte de la préférence présente lors de la revue humaine n’est donc pas démontrée et aucune migration forcée n’est effectuée.

Le nouveau profil de génération utilise `dobby-review-e03-e06-20261111|`, distinct du préfixe publié `dobby-review-e01-e06-20261111|`. Les tests conservent une valeur OFF et un témoin dans l’ancien espace, ouvrent le nouvel aperçu sur ON, puis vérifient que l’ancienne valeur reste exactement identique. Le correctif porte ainsi sur l’isolation du nouvel aperçu, pas sur une réécriture des choix utilisateurs. `chrome.js` et `ritual.js` sont laissés intacts.

## Tests exécutés

Commande : `node essai-stitch-v7/tests/review-integrated-effects.cjs`, avec `DOBBY_TEST_ORIGIN`, `DOBBY_REVIEW_PATH` et `DOBBY_EFFECTS_EVIDENCE` selon le parcours.

| Parcours | Résultat |
|---|---|
| Application canonique, 320 px | [PASS](canonical-320.log), [mesures](canonical/results.json) |
| Application canonique, 390 et 1440 px | [PASS](canonical-rest.log), [mesures](canonical-rest/results.json) ; 320 px déjà vert non rejoué |
| Véritable profil du générateur, 320/390/1440 px | [PASS](preview-control.log), [mesures](preview-control/results.json) |

Chaque largeur vérifie les défauts ON/Son OFF, leur présentation calculée, l’absence d’écriture à la lecture, OFF historique, clic explicite OFF, rechargement, deux destinations partagées, replay, flamme verte réellement peinte dans le Canvas, réduction système sans réécriture du choix, interruption de la traversée sans navigation tardive et conservation des membres/missions/crédits/demandes de runes. Aucun compte familial réel ni service externe ; contextes Chromium jetables, locale fr-BE et fuseau Europe/Brussels.

L’aperçu de contrôle a été généré à partir du snapshot `195ddf4a1da6e60dd237c9406de2cf1658493a45` avec les travaux de questionnaire encore en cours. **Ce bundle temporaire n’est pas présenté comme le bundle final de livraison.** L’orchestrateur produit le manifeste final après gel et vérifie son intégration.

## Captures comparatives

Il s’agit d’une comparaison d’états de préférence explicitement simulés, et non d’une preuve qu’un défaut ON aurait été corrigé dans le composant : l’état neuf était déjà ON.

| Largeur | OFF enregistré reproduit | Nouvelle utilisation dans l’aperçu isolé | Traversée verte réelle |
|---|---|---|---|
| 320 | [OFF](preview-control/stored-off-320.png) | [ON](preview-control/fresh-on-320.png) | [Vert](preview-control/enabled-green-320.png) |
| 390 | [OFF](preview-control/stored-off-390.png) | [ON](preview-control/fresh-on-390.png) | [Vert](preview-control/enabled-green-390.png) |
| 1440 | [OFF](preview-control/stored-off-1440.png) | [ON](preview-control/fresh-on-1440.png) | [Vert](preview-control/enabled-green-1440.png) |

Les vues `reduced-on-*` montrent également un bouton ON lorsque la réduction système interdit les mouvements. Le choix reste mémorisé ; ce mode ne doit pas être confondu avec une préférence OFF.

## Diagnostic du harnais initial

Les journaux `canonical.log` et `paint-diagnostic.log` conservent un échec du **premier harnais**, pas un défaut livré : il attendait seulement le changement d’URL après la traversée OFF, puis ouvrait le replay avant la fin du rendu Foyer. Le canvas restait à sa taille HTML par défaut et le contrôleur nouvellement ouvert était invalidé par la navigation précédente. Le test attend désormais le véritable contrôle Foyer `#e06-local-entry`, puis le contrôleur Rituel actif et le décodage de son image. Aucun code produit n’a été changé pour cette correction de synchronisation du test ; les pixels verts sont ensuite effectivement mesurés.

## Statut

Préférences et nouvelle isolation vérifiées. Pas de réinitialisation de préférences anciennes ; provenance utilisateur non inférée ; aucune modification de `chrome.js`/`ritual.js`, aucune publication. La recette physique Safari/iOS n’est pas revendiquée.
