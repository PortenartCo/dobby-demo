# Revue du 11/11/2026 — G, avatars — PARTIEL

Le sélecteur et les seize illustrations supplémentaires sont préparés et testés en isolation. **Le Profil magique de l’application conserve son interface actuelle : aucun raccordement aux fichiers occupés par E06 n’a été effectué. La sélection directe et les vingt-quatre choix ne sont donc pas déclarés livrés dans l’application.**

## Défaut reproduit

Le catalogue natif comporte huit portraits. Dans `magic-profile.js`, `.mp-avatar-gallery` contient des `span` issus de `DobbyMemberAvatar.create`, sans action de sélection ; `editor()` construit séparément un `select[name=magicAvatarId]`. Le test de reproduction attend huit choix directement activables et obtient zéro : [baseline-red.log](evidence/review-e01-e05-20261111/avatars/baseline-red.log). Les captures `before-320.png`, `before-390.png`, `before-1440.png` montrent la carte inchangée.

## Fichiers préparés

- `essai-stitch-v7/avatar-selector-review.js` expose `DobbyReviewAvatarSelector.mount({form, member, trigger})`. Il améliore le véritable formulaire existant ; son `select` reste l’unique champ `magicAvatarId`. Le composant ne crée ni writer, ni stockage, ni registre, ni liaison compte/membre. Aucun branchement automatique.
- `essai-stitch-v7/avatar-selector-review.css` : choix directement cliquables, contour et coche dorés, focus visible, aperçu immédiat, boutons de type `radio` accessibles, flèches/Home/End/Entrée/Espace, emoji conservé. Les choix non raccordés sont visibles et explicitement désactivés ; ils ne peuvent pas remplacer la valeur du formulaire.
- `essai-stitch-v7/avatar-catalogue-review.js` expose un **catalogue additif proposé** et les métadonnées de cadrage. `extend(nativeRows)` conserve les objets et identifiants existants et ajoute `portrait-9` à `portrait-24`, sans modifier `DobbyMagicIdentity`. `applySprite(face,row)` permet le cadrage du nouvel atlas sans altérer le cadrage historique des huit premiers portraits.
- `essai-stitch-v7/assets/review-avatars-20261111/portraits-09-24.png` : atlas original de seize portraits, généré avec `image_gen` le 11/11/2026, inspecté visuellement, copie intacte de la sortie. Aucun portrait réel, personnage protégé, URL externe ou simple recoloration. [Inventaire](evidence/review-e01-e05-20261111/avatars/MEDIA.md).
- `essai-stitch-v7/tests/review-avatars-20261111.cjs` : harnais d’amélioration explicite du Profil réel, avec données fictives locales et trafic externe bloqué. Il ne constitue pas un raccordement de l’application.

## Vérifications exécutées

`node essai-stitch-v7/tests/review-avatars-20261111.cjs` : **PASS 320/390/1440**. [Journal](evidence/review-e01-e05-20261111/avatars/targeted-green.log).

Le harnais vérifie les vingt-cinq tuiles (emoji + vingt-quatre portraits), les seize choix non raccordés désactivés, l’absence de mutation au montage et à l’aperçu, l’ouverture et la réouverture au clavier, le choix avec flèches/Home/End/Espace, la sauvegarde réelle et le rechargement. À 390 px, chacun des huit identifiants actuels est effectivement sauvegardé par le formulaire natif, puis le retour à l’emoji est sauvegardé. Le nom, l’identifiant de membre, la Maison, le Patronus, les champs inconnus et le registre des runes restent conservés. Un refus du `save()` natif provoque le rollback existant et ne devient pas un succès d’aperçu. Un membre modifié à distance reste protégé par le contrôle natif. Un identifiant d’avatar inconnu reste inchangé, sans sélection automatique de l’emoji.

Les captures `after-isolated-320.png`, `after-isolated-390.png`, `after-isolated-1440.png` montrent **le composant monté par le harnais**, avec les seize nouveaux choix désactivés. Les barres fixes sont masquées uniquement pendant la capture du composant, pour éviter qu’elles recouvrent l’image longue. Le rendu et les tests d’interaction s’exécutent dans la page réelle avec ses barres.

Une revue indépendante a détecté la perte de focus lorsqu’on masque le `select` précédemment focalisé. Le montage visible transfère maintenant le focus au choix courant ; le paramètre `trigger` traite également les réouvertures. Le test reproduit ce parcours avec Entrée sur « Modifier ». La revue rappelle aussi de retirer l’ancienne galerie statique lors du raccordement.

## Raccordement minimal après E06 — non exécuté

1. Vérifier que les fichiers partagés sont libérés, relire la version E06 de `magic-profile.js`, `magic-profile.css`, `family-profile.js`, `member-avatar.js` et leurs chargements. Ne pas reprendre une copie ancienne de ces fichiers.
2. Intégrer **une fois** les données et `applySprite` de `avatar-catalogue-review.js` au catalogue canonique `essai-stitch-v5-famille/family-profile.js`. Le plus simple est de déplacer son IIFE au début du fichier canonique, puis de construire `avatars` ainsi :

   ```js
   const avatars = freeze(window.DobbyReviewAvatarCatalog.extend(
     Array.from({length:8}, (_,index) => ({
       id:'portrait-'+(index+1), name:'Portrait '+(index+1), index,
       available:true, asset:'../essai-stitch-v7/assets/magic/avatars.png'
     }))
   ));
   ```

   Ce fichier étant chargé dans la page et dans le moteur natif `dv7-engine`, le validateur `patch()` reçoit alors le même catalogue de vingt-quatre choix dans les deux contextes. Conserver strictement les huit premières lignes et leurs identifiants. Une alternative est un chargement de `avatar-catalogue-review.js` **avant** `family-profile.js` dans les deux contextes ; un chargement uniquement dans la page parente ne suffit pas et ferait refuser les nouveaux identifiants par le writer natif. Ne pas ajouter de chargement asynchrone tardif au validateur.
3. Dans `DobbyMemberAvatar.create`, après le cadrage historique, appliquer les métadonnées lorsqu’elles existent :

   ```js
   if (portrait.sprite) window.DobbyReviewAvatarCatalog.applySprite(face, portrait);
   ```

   Garder le cadrage d’origine pour `portrait-1` à `portrait-8`. Le helper pose le fond, sa taille et sa position sur l’élément du visage ; l’insigne natif reste inchangé. Vérifier les avatars du Profil, des membres et de l’attribution des missions.
4. Charger le CSS et le JS du sélecteur après les composants natifs, dans les seuls points d’entrée concernés et dans leurs générateurs autorisés. Dans la carte avatar de `magic-profile.js`, retirer la boucle de galerie statique, conserver l’appel natif `editor(appearance,'magic-avatar',...)`, puis monter :

   ```js
   window.DobbyReviewAvatarSelector.mount({
     form: appearance.querySelector('#magic-avatar-form'),
     trigger: appearance.querySelector('#magic-avatar-edit'),
     member
   });
   ```

   Le formulaire, son handler `save()`, ses validations, ses contrôles de contexte et les actions Enregistrer/Annuler restent ceux du Profil. Ne pas appeler `saveMember` depuis un clic de portrait. `trigger` est nécessaire pour restaurer le focus lors de l’ouverture du formulaire caché.
5. Retirer les déclarations « raccordement en attente » uniquement lorsque le catalogue et le renderer sont réellement chargés ; le composant les masque automatiquement si tous les choix présents sont acceptés. Rejouer le harnais en adaptant explicitement les assertions de seize choix désactivés, tester la sauvegarde et le rechargement des vingt-quatre identifiants dans le writer natif, leur rendu partagé, les refus et les régressions E06. La campagne actuelle ne prouve pas ces raccordements futurs.

## État exact

| Élément | État |
|---|---|
| Composant isolé, clavier, aperçu et emoji | Préparé, testé dans le harnais |
| Huit identifiants actuels via writer canonique | Vérifiés, tous sauvegardés à 390 px |
| Seize nouveaux portraits originaux | Produits et inspectés ; assets locaux disponibles |
| Catalogue proposé de vingt-quatre portraits | Préparé ; natif inchangé à huit |
| Sélection des seize nouveaux identifiants | Désactivée en attente du raccordement canonique |
| Galerie directe dans l’application | Non raccordée, différée après E06 |
| Comptes réels, backend, droits parentaux | Non utilisés, non vérifiés |
| Commit, push, fusion, publication ou déploiement par ce sous-lot | Aucun |
