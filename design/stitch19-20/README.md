# Références visuelles Stitch 19 / 20

Les huit HTML et cinq PNG fournis sont conservés sans transformation dans
`stitch19/` et `stitch20/`. `reference-manifest.json` associe chaque copie à son
chemin source, ses octets et son SHA-256, ainsi qu’aux empreintes des deux ZIP
originaux. Les ZIP imbriqués ne sont pas dupliqués. Les références sont graphiques :
leurs scripts, questionnaires, comptes fictifs, états simulés et images distantes
ne doivent pas devenir la logique de DOBBY.

## Correspondance des compositions

| Vue intégrée | Source relative | Composition |
|---|---|---|
| Bienvenue | `stitch19/dobby_bienvenue_dans_dobby/` | Illustration Dobby, présentation courte, Continuer. Élargir intelligemment sur PC. |
| Connexion / inscription | `stitch19/dobby_connexion_et_inscription/` | Illustration et formulaire en deux colonnes sur PC ; connexion, inscription, invitation. |
| Profil unique | `stitch19/dobby_cr_ation_de_mon_profil/` et `stitch19/dobby_cr_ation_de_mon_profil_galerie_24_portraits/` | Fusionner aperçu, galerie et formulaire ; deux colonnes sur tablette/PC, empilement mobile. |
| Rejoindre | `stitch19/dobby_rejoindre_un_foyer/` | Hero et billet d’invitation ; un seul état réel, foyer et invitant authentiques. |
| Créer | `stitch19/dobby_cr_ation_d_un_nouveau_foyer/` | Hero cheminée, nom obligatoire vide, action dorée. |
| Intro Maison | `stitch20/dobby_c_r_monie_de_la_maison_magique/` | Fenêtre brun/or, Choixpeau, test natif ou galerie des quatre Maisons. |
| Intro Patronus | `stitch20/dobby_c_r_monie_de_d_couverte_du_patronus/` | Fenêtre bleu nuit/cyan, test natif ou galerie des douze Patronus. |

Stitch 19 : fond `#1e100c`, cartes `#271814` / `#2c1c18`, champs `#180b07`,
or `#f9bb5f` / `#d49b42`, texte `#fadcd5`, secondaire `#d4c4b1` ; Playfair
Display, EB Garamond et Literata. Stitch 20 : Maison `#120704` / `#1c0f0b`
et or `#ffd87a` / `#d49b42` ; Patronus `#070b14` / `#0c1424` et cyan
`#38bdf8` / `#7dd3fc` ; Cinzel et Plus Jakarta Sans, déjà disponibles localement.

Les fenêtres et formulaires restent défilants au doigt et à la roulette. Ne pas
reproduire les hauteurs fixes et `overflow-hidden` des prototypes. Préserver les
illustrations avec leur ratio et éviter leur recadrage destructeur. Retirer les
barres de simulation et les faux membres/invitations des compositions intégrées.

## Ressources et provenance

`local-assets.json` inventorie les dimensions, types réels et empreintes des onze
ressources locales retenues. Le Dobby à la lanterne du Chemin de Traverse est
l’alternative existante la plus proche de la nouvelle référence Bienvenue ; son
origine diffère de l’URL distante Stitch 19. L’illustration Dobby devant la cheminée
en 1024 × 1536 et sa provenance sont aussi disponibles. Les quatre blasons Stitch
sont des illustrations originales, pas des blasons officiels.

Les huit portraits natifs conservent leurs identifiants et leur cadrage. Les seize
portraits supplémentaires existent dans une ancienne revue locale : atlas 4 × 4,
1254 × 1254, SHA-256 `c1c4e2d7819c1540b66046709525187ba8219ceaec8308de3d410f1238dc45a9`.
L’image a été inspectée : seize humains distincts, cohérents avec les huit natifs.
Le raccordement canonique avait été différé après E06 ; les fichiers graphiques
étaient produits et disponibles. `portraits-09-24-original-provenance.md` conserve
le document historique au commit `73454d70627d4666afd1d8f87b8e567ab93ed0e3`.
La copie active et son fichier `.provenance.json` se trouvent dans
`essai-stitch-v7/assets/magic/`. Aucune image nouvelle n’a été générée.

Le sprite Patronus contient les douze animaux, en 4 colonnes × 3 lignes. Chaque
cellule s’affiche au ratio 3:4, avec `background-size:400% 300%` ; les positions
suivent la colonne / 3 et la rangée / 2. Les nouveaux portraits utilisent 4 × 4 ;
leur cadrage ne remplace pas celui des huit portraits historiques.

## État des captures source

Les PNG source présents sont : Profil-galerie 462 × 1600, Rejoindre 487 × 1527,
Créer 487 × 1832, Maison 1600 × 1280 et Patronus 1600 × 1280. Bienvenue,
Connexion **et la première variante Profil** n’ont aucun PNG dans les fichiers
reçus. Les deux captures Stitch 20 montrent des images centrales cassées ; la
galerie Stitch 19 mélange des liens cassés, animaux et blasons. Ces défauts de
référence ne doivent pas être reproduits. Les comparaisons rendues et captures
de l’application intégrée relèvent de la recette navigateur séparée.
