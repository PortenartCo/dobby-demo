# DOBBY V6 — Mission 1 : dossier de revue

Suite de la revue PR #2 : [corrections finales et captures ciblées à 320/390 px](corrections-pr2.md).

Harmonisation de la V5 familiale autour de l’écran Stitch **La Taverne Gourmande**, sur la branche [`codex/dobby-v6-mission-1`](https://github.com/PortenartCo/dobby-demo/tree/codex/dobby-v6-mission-1). Base contrôlée : `94dfdd5ce1af177a5a07b2425344f2c3f1d280f6`.

## Résultat réalisé

- Une palette et une échelle typographique centrales, trois polices locales avec repli Georgia, un jeu local Material Symbols Outlined.
- En-tête partagé de 80 px, accès au compte familial, menu sur les racines et retour raccordé aux actions V5 sur les détails/formulaires. Navigation commune Traverse / Missions / Taverne / Famille.
- Quatre héros de 220 px issus des images explicitement référencées dans les HTML fournis, servis localement. Illustration, titre, citation et action principale utilisent une seule implémentation. L’image entière est conservée avec `object-fit: contain` ; les éventuelles bandes de fond préservent le cadrage à 320 px.
- Cartes, panneaux familiaux, formulaires, onglets, états vides, messages et variantes de boutons communs. Les suppressions ont une icône et un nom accessibles explicites. Échap ferme le menu et restaure le focus.
- Présentation appliquée aussi aux rendus directs Documents/Équipements, sans dépendre uniquement de `render()`.
- Correction des anciennes mentions de non-synchronisation globale dans le menu et les listes ; distinction entre l’ancien carnet local et les rendez-vous partagés. Aucune garantie AES ou d’absence de Cloud ajoutée.

Les fichiers [dobby-v6.css](../../essai-stitch-v5-famille/dobby-v6.css) et [dobby-v6.js](../../essai-stitch-v5-famille/dobby-v6.js) portent cette couche. Le chargeur `stitch-v5.js` l’installe après `family-health.js`. Si la feuille de présentation ne peut pas se charger, la V5 reste disponible.

`index.html`, `essai-stitch-v5-famille/index.html`, **tous les fichiers family-*** et les propositions SQL sont inchangés par rapport à la base. Les identifiants des champs, attributs d’action et gestionnaires métier existants sont conservés. Des associations label/champ sont ajoutées lorsque la V5 n’en possédait pas.

## Design system effectivement utilisé

| Famille | Règle commune |
|---|---|
| Fonds | `--dobby-bg #1e100c`, surfaces `#271814 / #2c1c18 / #372622 / #43302c` |
| Accents | or `#f9bb5f`, or profond `#d49b42`, sauge `#afcdc0` |
| Texte | parchemin `#fadcd5`, secondaire `#d4c4b1`, destructif `#ffb4a8` |
| Typographies | Playfair Display titres ; EB Garamond corps ; Literata contrôles et légendes |
| Échelle | titre 28 px (26 px à 320), section 22, carte 19, corps 18, contrôle 12, légende 11 ; champs 16 px pour éviter le zoom iPhone |
| Géométrie | gouttière 12 px, cartes 16 px de rayon, contrôles 12 px de rayon, cibles de 44 px minimum en hauteur |
| Shell | largeur maximale 480 px centrée, safe areas haut/bas, barre inférieure 72 px |
| États | actif, désactivé, focus visible, erreur et `aria-busy` ; les véritables états métier de chargement restent ceux des modules V5 |

La feuille centrale surcharge explicitement les anciennes couches inline V2–V5. Les `!important` sont regroupés dans ce pont de présentation ; supprimer ces couches historiques demanderait une refonte de `index.html`, exclue ici pour préserver le contrat testé.

## Couverture et captures

La [matrice des 53 écrans](ecrans-stitch.md) précise pour chacun la capacité V5, les composants, le choix de variante et les limites. Les sept paires `_1`/`_2` sont consolidées en parcours uniques. Aucun backend ni écran fonctionnel fictif n’est créé.

Ouvrir la [galerie de comparaison](comparaison.html) pour les quatre racines et un échantillon de formulaires/détails.

| Page | Avant 390 px | Après 390 px | Après 430 px |
|---|---|---|---|
| Taverne | [capture](evidence/before/plan-390.png) | [capture](evidence/after/plan-390.png) | [capture](evidence/after/plan-430.png) |
| Traverse | [capture](evidence/before/home-390.png) | [capture](evidence/after/home-390.png) | [capture](evidence/after/home-430.png) |
| Missions | [capture](evidence/before/missions-390.png) | [capture](evidence/after/missions-390.png) | [capture](evidence/after/missions-430.png) |
| Famille | [capture](evidence/before/family-390.png) | [capture](evidence/after/family-390.png) | [capture](evidence/after/family-430.png) |

La baseline provient d’une extraction immuable de `94dfdd5` servie sur un autre port. Les détails utilisent les **mêmes fixtures synthétiques marquées TEST VISUEL**, uniquement dans des profils navigateur éphémères. Les captures principales restent celles des données de démonstration déjà présentes en V5, sans injection de contenu Stitch.

La recette visuelle couvre 103 combinaisons vue/taille : quatre racines à 320/390/430/1280 px ; recettes, choix de convives, panier, documents, maison, conversation, menu, saisie/import JSON ; contacts, listes et détail d’une liste, santé, contrats, recherche, import de document ; fiches et formulaires de document, mémo, équipement, membre ; recette, cuisine et adaptation TM5 ; modales Missions et Agenda. 51 captures après et 37 captures avant sont conservées. Les [mesures après](evidence/after/audit.json) et [mesures avant](evidence/before/audit.json) sont inspectables.

## Vérifications exécutées

| Contrôle local | Résultat |
|---|---|
| Les 18 `node --check` du workflow | PASS |
| `node --test essai-sync-v1/tests/*.test.mjs essai-sync-v2/tests/*.test.mjs essai-stitch-v5-famille/tests/*.test.mjs` | 54/54, aucune suppression/modification des tests existants |
| `node essai-stitch-v5-famille/tests/browser-regression.cjs` | 3/3 pages PASS : smoke V5, redémarrage Documents/Missions, présentation V6 |
| `node essai-stitch-v5-famille/tests/visual-audit.cjs` | 103/103 contrôles, zéro débordement mesuré, un H1 par vue, quatre héros complets, surfaces communes, zéro erreur JS non interceptée |
| Comparaison des fichiers métier à `94dfdd5` | Index, family-* et SQL inchangés |

Les [résultats navigateur](evidence/browser-results.json) conservent les messages exacts. Le test V6 contrôle notamment l’absence de mutation des collections lors de la navigation, le compte, les retours des rendus directs, les enregistrements Documents/Missions, les noms des suppressions et le focus du menu. Les deux défauts de revue ont été reproduits par un test rouge avant correction, puis vérifiés au vert.

Le workflow [Dobby Sync regression](../../.github/workflows/dobby-sync-regression.yml) exécute ces contrôles et conserve l’artefact `dobby-v6-browser-evidence` pendant 14 jours. Les deux pages navigateur historiques restent inchangées. Playwright est une dépendance **de test uniquement**, épinglée avec lockfile ; aucun paquet n’est chargé par l’application. Le runner navigateur remplace le dump DOM à temps virtuel, qui pouvait attendre des ressources distantes : il utilise Chromium réel et bloque tout trafic externe pendant les assertions. La CI effective se consulte dans les checks de la PR et dans [Actions pour cette branche](https://github.com/PortenartCo/dobby-demo/actions?query=branch%3Acodex%2Fdobby-v6-mission-1).

Reproduire :

```sh
npm ci --ignore-scripts --prefix essai-stitch-v5-famille/tests
python3 -m http.server 8765 --bind 127.0.0.1
# Dans un autre terminal, depuis la racine du dépôt :
CHROMIUM_PATH=/usr/bin/chromium node essai-stitch-v5-famille/tests/browser-regression.cjs
CHROMIUM_PATH=/usr/bin/chromium node essai-stitch-v5-famille/tests/visual-audit.cjs
```

## Limites et prochaines actions

- Intégration DOM vérifiée avec les modules V5 et stockage local ; **aucune recette avec deux sessions Supabase réelles** ni envoi de PDF à un foyer connecté. Les contrôles de synchronisation sont les régressions locales existantes, pas une preuve de fonctionnement Cloud en production.
- Chromium automatisé ; Safari sur iPhone physique, clavier logiciel, taille de texte système agrandie et VoiceOver restent à recetter. Safe areas et réduction des animations sont prises en compte par les styles.
- L’éditeur médical partagé exige un foyer activé : son autorisation n’est pas contournée pour produire une capture. Le carnet local et son éditeur sont audités ; le style commun couvre la modale partagée.
- L’image de plat est celle de la V5 lorsqu’elle existe, sinon son pictogramme d’origine. Aucun plat fictif de la maquette n’est présenté comme un repas réellement planifié.
- Les capacités partielles de l’export (profil magique, historique autonome, import IA/OCR, sauvegarde Cloud universelle, localisation) restent signalées dans la matrice. Animation et Maison/Patronus restent mission 2.

## Déploiement et retour arrière

**Aucun déploiement, aucune fusion dans main, aucune migration, aucune modification de données Supabase.** GitHub Pages publie la branche `main`, chemin `/`, configuration lue avant le push. Cette branche de revue n’est pas une version publiée.

Retour arrière de la présentation : retirer le bloc `health.onload` V6 du chargeur, ou annuler les commits de présentation sur cette branche. Les fichiers de données et clés de stockage restent ceux de la V5 ; aucune transformation à inverser. Cette procédure est décrite, pas annoncée comme un rollback de production testé.
