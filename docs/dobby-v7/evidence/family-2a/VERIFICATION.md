# Vérification de livraison — Mission 2A

Branche `feat/dobby-stitch-53-source-backed-v7`, départ `cb440793cc04079cd472a3cd1d8fcf3e14c1f84b`, PR #3. Les résultats CI du SHA livré sont consignés directement dans la PR et ses checks.

## Résultats locaux

- `npm run test:family --prefix essai-stitch-v7/tests` : parcours membres, agenda, santé locale, contacts, cas limites, relecture, partage/hors ligne/conflits et comparaisons réussis à 320/390 px. Les profils sont éphémères ; le client familial natif utilise uniquement une API interceptée en mémoire.
- Dernière correction de notice : `family-review.cjs` puis `family-visual.cjs` réexécutés et réussis. La notice initiale de démonstration a été reproduite par une assertion en échec avant correction. Aucune action métier n’a changé pour cette correction de texte.
- 54 régressions Node existantes : 54 réussies, zéro échec. Les modules communs de branchement et le pont ont changé, ce qui justifie ce contrôle.
- Smoke des quatre racines : 8 combinaisons réussies (4 × 320/390 px). Les parcours complets Cuisine n’ont pas été relancés localement ; leurs scripts existants restent dans la CI finale, le pont étant partagé.
- Génération répétée : aucun écart des templates, du manifeste ou des quatre racines. Empreintes des sept originaux comparées au manifeste d’origine. Syntaxe des nouveaux scripts et `git diff --check` réussis.
- Manifeste contrôlé : 23 templates actifs = 18 sources fonctionnelles + 5 partielles ; 30 importations sans raccordement. Pour ce lot : 2 fonctionnelles, 5 partielles.
- Aucun fichier V5 publié, SQL ni HTML original modifié depuis le départ. Aucun compte réel, aucune écriture vers Supabase, fusion ou publication.

## Défauts reproduits puis corrigés

La relecture indépendante a identifié trois défauts importants : sélection du partage désactivée après activation pendant une saisie, faux état « registre immaculé » pour un registre d’antécédents inexistant, et mentions de visibilité incorrectes. Les assertions échouaient avant correction et passent après correction. Les états sélectionnés création/modification et semaine/mois ont aussi été corrigés. La vérification finale des captures a corrigé la notice de démonstration restée dans le formulaire médical.

Le test de disponibilité utilise désormais la propriété DOM `option.disabled` et le clavier. L’ancien test `selectOption()` pouvait franchir programmatiquement une option encore désactivée. Le brouillon est conservé et le périmètre reste local tant que l’utilisateur ne choisit pas volontairement le partage.

Les régressions du parcours couvrent aussi la recherche vide, les liens supprimés, les anciennes fiches sans identifiant, les doublons et suppressions liées, la recharge du mode création, la conservation des brouillons, les espaces seuls rejetés par le moteur et le retour depuis un menu secondaire V5.

## Preuves et limites

[48 captures indexées](README.md) : 28 références/interfaces, 14 états vides, 6 états partagé/hors ligne/conflit. [Contrôles navigateur](checks.json) : 14 écrans intégrés aux deux largeurs, aucun contrôle débordant relevé. Les données des captures sont des fixtures identifiées `TEST` ; la référence conserve les exemples de la maquette, jamais importés dans le moteur.

Les cinq statuts partiels et les fonctions absentes restent détaillés dans [FAMILY-2A.md](../../FAMILY-2A.md) et le manifeste. Deux URL de héros originales répondent avec un contenu non image ; leur substitution par le Salon est signalée également dans les références. Les tests simulés ne constituent pas un test sur comptes réels ni une certification des services de production.
