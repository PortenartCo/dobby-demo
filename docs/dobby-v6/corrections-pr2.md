# PR #2 — Corrections finales de présentation

Périmètre : corrections ciblées sur `codex/dobby-v6-mission-1`, après la revue du commit `77ef54d`. Aucun nouvel inventaire Stitch, aucune reconstruction de l’architecture.

## Famille

La page conserve un seul panneau par rôle : membres, agenda du foyer, rendez-vous médicaux partagés et grille des outils. L’ancien bloc Gazette/Agenda médical local rejoint une section repliable du panneau médical, uniquement lorsque des rendez-vous locaux existent. Leurs boutons d’édition restent ceux de la V5.

Le second hub « Organisation familiale » est retiré de la présentation. Ses accès Répertoire, Listes et Carnet sont conservés dans la grille ; le suivi automatique rejoint l’accès Missions. Les données des anciennes fiches, événements, membres et tâches restent dans leurs modules d’origine. L’agenda conserve ses échéances et ses exports Calendrier.

## Missions

Les deux registres restent distincts : **Missions créées par le foyer / À faire ensemble**, puis **Missions automatiques**. Ils partagent cartes, espacements et composants. La carte récapitulative automatique qui répétait le compteur est supprimée ; le statut de partage reste dans la bande de contexte commune. Les filtres et les archives automatiques sont conservés. La maisonnée et les listes restent accessibles dans une section repliable.

Les actions Terminer/Rouvrir et les cases automatiques utilisent les gestionnaires initiaux. Le test vérifie que terminer une mission manuelle laisse la source automatique inchangée, puis que celle-ci peut être terminée indépendamment. Les titres d’événements et de missions occupent une ligne complète avant les actions sur mobile, au lieu d’être comprimés en colonne étroite.

## Pièces jointes

- **Déconnecté** : copie locale disponible, sélecteur familial indisponible masqué et état de partage expliqué. L’input familial reste désactivé selon le module initial.
- **Connecté, fiche destinée au partage** : action de partage existante conservée. Lorsqu’une copie locale existe aussi, deux boutons de destination permettent de choisir « Partager au foyer » ou « Sur cet appareil ». Un seul sélecteur est visible, même en ouvrant la section de sauvegarde locale.
- **Fichier déjà partagé** : ouverture/retrait du fichier familial et consultation de la copie locale conservés. Les règles initiales de remplacement restent applicables.
- **Fiche privée** : action locale et choix explicite de partage d’origine conservés.

Les contrôles natifs restent en place avec les mêmes IDs, attributs et gestionnaires. Leur présentation affiche « Choisir un fichier » et « Aucun fichier sélectionné » en français ; le vrai nom est affiché après sélection. Aucun transfert, droit ou format de stockage n’est modifié. La disponibilité est lue sur les contrôles rendus par le module métier, sans réinterpréter l’authentification.

## Captures comparables

Les 20 captures **avant** proviennent du commit immuable `77ef54d`, servi sur un port distinct. Les 20 captures **après** utilisent les mêmes fixtures synthétiques. Aucun compte familial réel n’a été utilisé.

| Vue | Avant 320 | Après 320 | Avant 390 | Après 390 |
|---|---|---|---|---|
| Famille avec données | [capture](evidence/review-final/before/family-320.png) | [capture](evidence/review-final/after/family-320.png) | [capture](evidence/review-final/before/family-390.png) | [capture](evidence/review-final/after/family-390.png) |
| Missions avec données | [capture](evidence/review-final/before/missions-320.png) | [capture](evidence/review-final/after/missions-320.png) | [capture](evidence/review-final/before/missions-390.png) | [capture](evidence/review-final/after/missions-390.png) |
| Document déconnecté | [capture](evidence/review-final/before/document-offline-320.png) | [capture](evidence/review-final/after/document-offline-320.png) | [capture](evidence/review-final/before/document-offline-390.png) | [capture](evidence/review-final/after/document-offline-390.png) |
| Document avec partage et copie locale, état simulé | [capture](evidence/review-final/before/document-online-backup-320.png) | [capture](evidence/review-final/after/document-online-backup-320.png) | [capture](evidence/review-final/before/document-online-backup-390.png) | [capture](evidence/review-final/after/document-online-backup-390.png) |

Le dossier contient aussi les états vides et les variantes document sans copie locale, déjà partagé et privé. Les captures générales `evidence/after/family-390.png`, `missions-390.png` et `document-detail-390.png` sont actualisées.

## Preuves et limites

- `node --test essai-sync-v1/tests/*.test.mjs essai-sync-v2/tests/*.test.mjs essai-stitch-v5-famille/tests/*.test.mjs` : **54/54**.
- `node essai-stitch-v5-famille/tests/browser-regression.cjs` : **3/3 pages PASS**, dont réouverture Documents/Missions ; assertions historiques inchangées.
- `node essai-stitch-v5-famille/tests/visual-audit.cjs` : **103/103 contrôles**.
- `node essai-stitch-v5-famille/tests/review-ui.cjs` : **20 combinaisons vue/état/taille**, sans débordement mesuré ni erreur JS, plus actions Agenda, édition d’une ancienne fiche locale, création d’une mission, complétion des deux sources et écriture binaire locale vérifiées. [Résultat détaillé](evidence/review-final/after/results.json).
- Une sélection de PDF de test utilise le writer IndexedDB V5 inchangé ; les 25 octets attendus sont retrouvés dans le stockage local du profil éphémère.

Les états connectés sont **simulés uniquement à l’interface du module Documents**, dans le runner de test, avec tout trafic externe bloqué. La session globale de l’application reste déconnectée dans ces fixtures : sa bande de contexte le reflète. Il ne s’agit ni d’une recette d’authentification, ni d’un transfert familial réel. Aucun test manuel sur deux comptes n’a été relancé.

Seuls `dobby-v6.js` et `dobby-v6.css` changent dans le code applicatif. Les fichiers `family-*`, les index, l’authentification, les writers et SQL restent inchangés. La CI exécute aussi la vérification ciblée et conserve ses captures dans l’artefact navigateur. La PR reste ouverte pour revue : **aucune fusion, aucun déploiement, aucune intervention sur Supabase ou les données familiales**.
