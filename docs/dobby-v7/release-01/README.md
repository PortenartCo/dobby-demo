# DOBBY V7 · Onboarding familial

Le parcours part des pages natives V7 et utilise le client Auth et Famille existant. Le premier parent confirme son adresse, enregistre son profil et crée son foyer. Dans la liste des membres, il génère un lien à partager. Le second parent voit l’aperçu du foyer, peut créer son compte depuis cet écran et reprend l’invitation après confirmation de son adresse. Après acceptation, le serveur confirme deux profils canoniques distincts dans le même foyer.

La liste des membres vérifie les droits au moment d’ouvrir le formulaire d’invitation. L’opération de génération reste enregistrée sur l’appareil jusqu’à l’affichage du lien. Si la réponse est perdue après validation serveur, un nouvel essai après rechargement récupère le même lien. Les mutations d’onboarding et la récupération de mot de passe vérifient la session de l’appareil. La déconnexion retire uniquement la session de l’onglet qui l’a demandée.

## Comparaison des fondations

| Référence | SHA examiné | Résultat |
| --- | --- | --- |
| #36 | `e3b8ce8bd05c3cec6b2b4f424000e374b2bf1af4` | Missions V2 à responsable unique et crédit idempotent déjà repris dans le socle récent. Les anciennes restrictions et leur jeu de scripts restent dans l’historique de #36. |
| #45 | `02ebb9fe5c85ab886680d3d8da9afa1d271462e1` | Ancêtre commun du socle Santé et des correctifs Contacts/E01. |
| #48 | `a54d0a14c738499a4148d28ca47564215a57c633` | Base du brouillon. Les cinq fichiers communs avec #36 ont été comparés avant l’édition. `access.js` conserve la transition d’onglet de #48 et `family-v2.js` conserve les contrôles du transport Santé. |
| #49 | `790d79dbb2a63809cf2602c81b1fc935884b02f3` | Les quatre fichiers sont repris à l’identique. Ils ne se recoupaient pas avec le diff de #36. |

Les cinq fichiers communs entre #36 et #48 sont `family-modules.js`, `family-v2.js`, `access-config.js`, `access.js` et `tools-register.js`. Le test de provenance inverse le lot onboarding et retrouve les fichiers de la tête de #48 avant de vérifier les autres lots.

## Rejouer le parcours

Depuis la racine du dépôt, avec Docker, Node.js, Python et Chromium disponibles.

```sh
npm ci --ignore-scripts --prefix essai-stitch-v7/tests
CHROMIUM_PATH=/usr/bin/chromium python3 docs/dobby-v7/release-01/onboarding-local.py --evidence /tmp/dobby-onboarding
```

Le script démarre quatre services éphémères avec des images épinglées. Les ports HTTP sont liés à `127.0.0.1`. Chromium redirige les requêtes de l’application vers cette pile et bloque les destinations externes. Les adresses `example.test` reçoivent leurs messages dans Mailpit. Le test suit les liens de confirmation et de récupération transmis par GoTrue, puis contrôle les RPC et la RLS dans PostgreSQL. La fixture réutilise les fonctions et politiques d’onboarding du socle Famille. Elle adapte la résolution JWT au catalogue jetable et écarte le précontrôle d’empreintes réservé au catalogue hébergé.

Les captures masquent les codes d’invitation. La recette vérifie les largeurs 320, 390 et 1440 px, l’expiration, le rejeu des reçus, la réponse perdue puis récupérée après rechargement, le refus anonyme, l’isolation entre foyers, la récupération du mot de passe et le remplacement de session entre onglets.

## Retour arrière

Le lot modifie le client et les tests. Il n’ajoute aucune migration. Pour revenir au candidat précédent, rétablir le code du socle #48 avec les quatre correctifs #49. Les profils, foyers et invitations sont des écritures du socle natif. Toute éventuelle restauration de données relève d’une opération distincte.
