# E03 — Harmonisation typographique

Base : `10e1662f4e2e8588ed180221c2345711ea5a177d`. Branche : `feat/dobby-e03-missions`. Worktree propre et tête distante identique avant intervention. Aucun AGENTS.md applicable trouvé dans le dépôt.

## Comparaison aux pages de référence

Les pages actives Accueil et Famille (« Le Salon des Curiosités ») ont été comparées à E03 dans Chromium à 320, 390 et 1440 px. Polices chargées avant capture. Mesures par `getComputedStyle` et identification des fichiers effectivement rendus par `CSS.getPlatformFontsForNode` (CDP), sur le H1 et le texte du bouton, hors pictogramme.

| Propriété | E03 avant | Salon des Curiosités | E03 après |
| --- | --- | --- | --- |
| Police du titre réellement rendue | PlayfairDisplay-Bold | PlayfairDisplay-Bold | PlayfairDisplay-Bold |
| Titre : taille / graisse / interligne | 22 px / 700 / 26,4 px | 22 px / 700 / 27,5 px | 22 px / 700 / 27,5 px |
| Titre : marge inférieure | 12 px | 8 px (`mb-2`) | 8 px (`mb-2`) |
| Titre : effet | Aucun | Ombre dorée Stitch | Même classe d’ombre dorée |
| Bouton : famille calculée | Georgia, serif | Playfair Display | Playfair Display |
| Bouton : fichier effectivement rendu | LiberationSerif-Bold (substitution système de Georgia) | PlayfairDisplay-SemiBold, police locale | PlayfairDisplay-SemiBold, police locale |
| Bouton : taille / graisse / interligne | 13 px / 700 / 18,2 px | 16 px / 600 / 24 px | 16 px / 600 / 24 px |
| Bouton : espacement des lettres | 0,52 px | 0,4 px (`tracking-wide`) | 0,4 px (`tracking-wide`) |
| Bouton : hauteur / rayon | 52 px / 16 px | 52 px / 16 px | 52 px / 16 px |

Accueil confirme les conventions de titre (Playfair Display Bold 22 px, interligne 27,5 px) et de CTA 16 px / 52 px. Son bouton utilise `font-serif` / graisse 700 ; le Salon utilise explicitement `font-headline-sm` / Playfair Display / graisse 600. E03 reprend cette dernière référence, conformément à la demande de rapprochement avec le Salon.

Les tailles, graisses, interlignes, espacements de lettres, couleurs, ombre du titre, gradient, ombre et rayon du bouton sont identiques aux valeurs calculées du Salon aux trois largeurs. Vérification des polices locales réellement utilisées : aucune substitution système après correction.

## Modification ciblée

- H1 : classes existantes du Salon, dont `font-headline-lg`, `font-bold`, `text-[22px]`, `leading-tight`, `text-center`, `mb-2` et son ombre dorée.
- CTA : classes existantes du bouton principal du Salon, dont `font-headline-sm`, `font-semibold`, `text-[16px]`, `tracking-wide`, `h-[52px]`, `gap-2`, gradient et ombre dorés, hover/active. Texte et lien `famille.html#mission-edit` inchangés.
- Adaptation à la longueur du texte en capitales : `px-space-sm` (8 px) préserve une marge intérieure au pictogramme à 320 px. Ce token existe déjà ; aucun nouveau style typographique ou token ajouté.
- Espacement vertical du contenu : `gap-space-md` (16 px) et gouttières `px-margin-mobile` (16 px). Suppression des quatre règles personnalisées qui imposaient les anciennes valeurs, au profit des utilitaires Stitch existants.
- Cadre illustré indépendant conservé, scène de 160 px, image/cadrage/badge inchangés. À 320 px, titre et CTA se répartissent naturellement sur deux lignes sans réduire la police ; à 390/1440 px, présentation sur une ligne. Aucun débordement horizontal constaté.

Fichiers produit : `missions-layout.html`, `missions.css`, `missions.html` régénéré. `build-source.cjs`, la feuille Tailwind compilée, les autres styles partagés et le code JavaScript sont inchangés. Aucune modification métier, writer, formulaire, V5, E01/E02, E04, Supabase, SQL ou source Stitch originale.

## Captures avant / après et références

| Largeur | E03 avant | E03 après | Accueil | Salon des Curiosités |
| --- | --- | --- | --- | --- |
| 320 | [Avant](https://github.com/PortenartCo/dobby-demo/blob/feat/dobby-e03-missions/docs/dobby-v7/evidence/e03/typography/before-missions-320.png) | [Après](https://github.com/PortenartCo/dobby-demo/blob/feat/dobby-e03-missions/docs/dobby-v7/evidence/e03/typography/after-missions-320.png) | [Référence](https://github.com/PortenartCo/dobby-demo/blob/feat/dobby-e03-missions/docs/dobby-v7/evidence/e03/typography/before-accueil-320.png) | [Référence](https://github.com/PortenartCo/dobby-demo/blob/feat/dobby-e03-missions/docs/dobby-v7/evidence/e03/typography/before-famille-320.png) |
| 390 | [Avant](https://github.com/PortenartCo/dobby-demo/blob/feat/dobby-e03-missions/docs/dobby-v7/evidence/e03/typography/before-missions-390.png) | [Après](https://github.com/PortenartCo/dobby-demo/blob/feat/dobby-e03-missions/docs/dobby-v7/evidence/e03/typography/after-missions-390.png) | [Référence](https://github.com/PortenartCo/dobby-demo/blob/feat/dobby-e03-missions/docs/dobby-v7/evidence/e03/typography/before-accueil-390.png) | [Référence](https://github.com/PortenartCo/dobby-demo/blob/feat/dobby-e03-missions/docs/dobby-v7/evidence/e03/typography/before-famille-390.png) |
| 1440 | [Avant](https://github.com/PortenartCo/dobby-demo/blob/feat/dobby-e03-missions/docs/dobby-v7/evidence/e03/typography/before-missions-1440.png) | [Après](https://github.com/PortenartCo/dobby-demo/blob/feat/dobby-e03-missions/docs/dobby-v7/evidence/e03/typography/after-missions-1440.png) | [Référence](https://github.com/PortenartCo/dobby-demo/blob/feat/dobby-e03-missions/docs/dobby-v7/evidence/e03/typography/before-accueil-1440.png) | [Référence](https://github.com/PortenartCo/dobby-demo/blob/feat/dobby-e03-missions/docs/dobby-v7/evidence/e03/typography/before-famille-1440.png) |

Captures obtenues directement dans le navigateur, sans retouche ni visuel artificiel. Captures E03 avec missions et états existants également actualisées dans `evidence/e03/open-*`, `viewport-*`, `empty-*`, etc.

## Vérifications

- Mesures complètes : `evidence/e03/typography/before-computed.json`, `after-computed.json` et journaux `before-fonts.txt`, `after-fonts.txt`.
- Tests existants `e03.cjs` : PASS 320/390/1440, incluant filtres, création/modification, rechargement, commandes communes et cohérence E01/E02. Une relance après ajout de la marge intérieure, susceptible d’affecter la géométrie du CTA ; aucun changement ultérieur du produit.
- Génération par le générateur existant ; reproductibilité contrôlée sur le commit final par le workflow existant.
- Une seule CI demandée sur le commit final ; résultat et lien de l’exécution dans le compte rendu de livraison.
- Aucun écart visuel résiduel identifié. Chromium aux largeurs demandées ; Safari physique non testé.

Aucune fusion ni publication d’application. Arrêt pour revue visuelle humaine avant intégration.
