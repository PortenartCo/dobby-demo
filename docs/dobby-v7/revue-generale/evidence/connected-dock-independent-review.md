# DOBBY V7 — revue indépendante du dock sur cérémonies

Commit revu : **`aef2664f93e707792dc4bb060227e41b18c087e1`**, comparé à **`c7b20d078380ac49dc08057d039e97cc7bd8e968`**. Périmètre strict : `chrome.js`, `onboarding.js`, `onboarding.css`, règles existantes `ritual.css`/`ritual.js` et `tests/v7-connected-ceremony-dock.cjs`. Aucun fichier produit modifié par le reviewer, aucun accès distant, aucun Supabase, aucune suite large relancée.

## Résultat

**Aucun P1/P2 restant démontré sur le correctif commité.** Le dock manquant sur les anciennes routes de cérémonie était une véritable lacune N01 du candidat précédent ; le nouveau test couvre désormais ces routes et non seulement les modules ordinaires.

Un second défaut **P2 de navigation différée** a été identifié durant la relecture du premier correctif : le simple `wait()` pouvait laisser le `G.finish()` final déclencher `location.href='./traverse.html'` avant que le clic Menu en attente soit traité. Le lot Transversal a reproduit le cas rouge (arrivée Salon au lieu de Menu), puis corrigé la course dans le commit revu. L'époque de navigation est invalidée **synchroniquement au clic du dock, avant l'attente du verrou Register** ; l'opération native termine sa sauvegarde, mais son ancien résultat de routage n'est plus appliqué. Le parcours navigateur final a été relancé indépendamment avec succès.

## Vérification indépendante exécutée

```bash
DOBBY_TEST_ORIGIN=http://127.0.0.1:8765 \
DOBBY_CONNECTED_DOCK_EVIDENCE=/workspace/dobby-independent-ceremony-dock-evidence \
node essai-stitch-v7/tests/v7-connected-ceremony-dock.cjs
```

Résultat : **`V7_CONNECTED_CEREMONY_DOCK_PASS 320` et `390`**, exit 0. Les sources HTTP locales ont été comparées au worktree avant le test ; leurs empreintes n'ont pas changé pendant l'exécution ni lors du commit. `node --check` sur Chrome/Onboarding et `git diff --check` du périmètre passent.

Le test vérifie les questionnaires natifs Maison et Patronus, progression puis reprise du même brouillon après Menu ; un seul dock et six destinations exactes **Accueil / Tâches / Repas / Courses / Famille / Menu** ; Famille actif ; en-tête cérémoniel et préférences conservés ; largeur utilisable, pas de débordement horizontal et dernière action du quiz dégagée du dock. Il retarde réellement la promesse de stockage native d'identité et de fin de cérémonie : le clic Menu l'emporte après résolution, sans mutation du profil canonique ou des Runes.

Le Rituel est parcouru avec premier toucher et pixels verts, puis quitté par le dock : `DobbyRitual.active` devient faux et Menu reste présent après 2700 ms. Le cas de mouvement réduit termine proprement vers Foyer, qui garde le dock. La route préconnexion `access-auth` conserve le dock unique masqué. Les requêtes hors serveur HTTP local sont interrompues par la fixture, et aucune requête Supabase n'est tentée.

## Lecture source et limites

- `chrome.mount()` conserve le traitement de l'en-tête Onboarding et poursuit désormais le montage du dock commun ; aucune seconde implémentation de dock n'est ajoutée.
- `onboarding.chrome()` ne masque plus le dock. Les marges basses réservent `--e01-bottom`, qui inclut déjà `env(safe-area-inset-bottom)`. La règle ciblée du Rituel est plus spécifique que son ancien masquage CSS et conserve ses commandes Effets/Son internes.
- `wait({leave:true})` invalide l'ancienne intention de routage avant toute attente. `run()` compare cette époque après le writer/lock, avant route interne ou navigation documentaire. Les données sont sauvegardées ; seul le routage périmé est supprimé.
- Le cycle Rituel existant reste inchangé : `dispose()` incrémente l'essai, annule le timer/canvas, débranche observateurs/listeners et ferme l'AudioContext capturé ; `finish()` revérifie activité/essai après l'écriture asynchrone. Le nouveau dock permet de quitter la vue, et le remplacement du DOM déclenche cette disposition. L'audio a été contrôlé par lecture de code, sans prétendre un essai matériel.
- Le test utilise un profil **TEST fictif**, le vrai routeur et les vrais moteurs locaux. Il ne valide pas une session Auth réelle ni un iPhone physique. Les safe areas non nulles et le matériel sonore restent une recette matérielle ; le contrat CSS et la géométrie Chromium mobile sont seuls attestés ici.

## Empreintes revues

| Fichier | SHA-256 |
|---|---|
| `chrome.js` | `1160f503823f15862f939cb2ae64c129f91ad28f5bc2b64a81779894c9ef96fb` |
| `onboarding.js` | `b28fa1b8ce46449f6aae3bfc31991983bd3d64a15b8521dade1056dc4e805539` |
| `onboarding.css` | `6bfb1128e766b23d522482853ba1d2f6d815423b149de648a078ba51b804a48d` |
| `ritual.css` (inchangé, contexte revu) | `706d9d7dd65107ae6d10763df48f024460285530933dcd1c1daac9f3feb7133c` |
| `tests/v7-connected-ceremony-dock.cjs` | `26d3cb82358b7873e643bdeafe54e574c598203921cce20697225d4f2f0d5247` |

La CI redémarrée de la PR #9 et les contrôles ultérieurs de publication demeurent nécessaires avant de qualifier ce nouveau correctif de déployé.
