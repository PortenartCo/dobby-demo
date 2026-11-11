# Effets initiaux, transition coordonnée et relecture E06

Périmètre : `chrome.js`, `ritual.js`, `ritual.css` et `tests/e06-effects-transition.cjs`. Aucun moteur natif, stockage, questionnaire, barème ou modèle de profil modifié. Aucun commit de cet agent.

## Contrat et code

Le lecteur `DobbyChrome.preferences()` est la lecture commune des préférences. Les valeurs par défaut sont Effets ON et Son OFF ; les propriétés déjà enregistrées prennent toujours priorité, notamment `effects:false`. La lecture ne persiste aucune valeur implicite. Le clic initialise le registre natif existant avant d’inverser le choix, de sorte que le premier clic Effets produit un OFF explicite. Le fallback de bootstrap du Rituel porte exactement les mêmes valeurs. Aucun autre défaut contradictoire n’a été trouvé dans le code V7 (la lecture Son de chat conserve un booléen false implicite).

La projection visuelle du Rituel conserve le Canvas et ses particules déjà livrés : la traversée fait évoluer son bouton, le libellé, le badge et ses étincelles vers l’émeraude, coordonnés au flash/éclairage existants et aux flammes vertes. Les commandes restent visibles, notamment Passer. L’erreur ou l’interruption rétablit les textes/couleurs de repos ; le cycle de vie natif existant et ses tokens d’annulation sont conservés. Aucun nouveau moteur ni timer d’animation.

« Revoir le Rituel » est explicite. Dans le Foyer, la même section de préférence est désormais placée dans le premier chemin de lecture, après l’introduction de démo ou avant les options du foyer, au lieu du bas d’un long registre. Dans le profil, elle reste dans Compte et paramètres. Le paramètre de relecture est transmis sans mutation du membre, de ses choix ou de ses réponses.

## RED puis GREEN

- [RED défaut initial](logs/default-red.log) : `false !== true` pour Effets sans préférence.
- [RED transition](logs/transition-red.log) : des pixels Canvas étaient déjà verts quand les effets étaient forcés ON, mais le bouton et le badge restaient dorés. Leur gradient/couleur réels sont mesurés, sans se limiter à une classe CSS.
- [GREEN 320](logs/green-320.log) puis [390/1440](logs/green-390-1440.log) : vrais clics/navigation, métadonnées et writer natifs ; profils éphémères, aucune authentification réelle.

Le test vérifie le default sans écriture, le premier OFF explicite, son rechargement et sa présence sur six destinations partagées, puis une traversée active réelle, deux relectures depuis le Foyer et une depuis les paramètres E05. Une réponse Maison B, un membre configuré, son gain confirmé de 10 runes et le planning/les missions restent identiques. Le mode de réduction des animations et un OFF explicite naviguent rapidement sans réécrire le choix enregistré ; Son reste OFF.

| Largeur | Traversée mesurée | Pixels verts Canvas repos → traversée | Bouton / badge / flash |
|---|---|---|---|
| 320 | 2664 ms | 0 → 4462 | Émeraude réelle, opacity 0.75 |
| 390 | 2675 ms | 0 → 4540 | Émeraude réelle, opacity 0.75 |
| 1440 | 2721 ms | 0 → 4404 | Émeraude réelle, opacity 0.75 |

## Captures avant/après

Les images/fontes sont décodées avant capture. Les images vertes sont prises à 1 250 ms pendant la séquence de 2 500 ms ; la navigation réelle est ensuite attendue et mesurée. Le JSON contient les RGB calculés et les pixels RGBA du Canvas.

| Largeur | Défaut avant / après | Transition avant / après | Accès Revoir |
|---|---|---|---|
| 320 | [avant](before/ritual-default-320.png) / [après](after/ritual-default-320.png) | [avant](before/ritual-green-320.png) / [après](after/ritual-green-320.png) | [Foyer](after/foyer-replay-320.png) |
| 390 | [avant](before/ritual-default-390.png) / [après](after/ritual-default-390.png) | [avant](before/ritual-green-390.png) / [après](after/ritual-green-390.png) | [Foyer](after/foyer-replay-390.png) |
| 1440 | [avant](before/ritual-default-1440.png) / [après](after/ritual-default-1440.png) | [avant](before/ritual-green-1440.png) / [après](after/ritual-green-1440.png) | [Foyer](after/foyer-replay-1440.png) |

[Résultats par largeur et observation des peintures](after/results.json). Chromium responsive ; aucun microphone, iPhone ou haut-parleur physique n’est revendiqué. Les assertions métier utilisent les véritables APIs natives ; les requêtes externes du bootstrap familial source sont bloquées. La publication existante et main n’ont pas été modifiés.
