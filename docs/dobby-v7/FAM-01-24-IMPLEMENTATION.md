# Famille — FAM-01 à FAM-24 : développement local

Branche exclusivement locale : `feat/dobby-v7-family-review-fam01-24`.
Worktree : `/workspace/dobby-v7-family-review-fam01-24`.
Base immuable : `faf89d50555a3201385eae51f9ef5f93c5bf0499`.

Le worktree Famille était absent dans cet environnement. Conformément à l’addendum, il a été créé depuis cette base, sans déplacer une branche existante. Aucun travail de la mission E09 précédente n’a été repris en place.

La demande utilisateur autorise les corrections FAM et lève l’attente graphique de FAM-17. Le ZIP est une référence de conception, dont les placeholders, liens inertes, CDN et promesses de sécurité ne constituent ni des données ni des fonctionnalités autorisées.

## État des 24 décisions

Les statuts TESTE décrivent le développement local et les profils fictifs. Ils ne constituent pas une garantie de droits serveur, une invitation réelle ou une mise en production.

| Décision | Statut | Résultat et limites |
| --- | --- | --- |
| FAM-01 | TESTE | Effets ON par défaut via préférence native, ON/OFF persistant, 13 vues × trois largeurs, mouvement réduit, aucune seconde préférence ni nouveau header/dock. |
| FAM-02 | TESTE | Cartouche du registre cliquable vers le Salon. |
| FAM-03 | TESTE | Titre harmonisé et introduction redondante retirée. |
| FAM-04 | TESTE | Couleurs depuis le catalogue E05 ; thème neutre sans Maison, aucun rôle déduit. |
| FAM-05 | TESTE | Cartes entièrement cliquables vers member-detail, avatar E05, nom/catégorie/Maison/grade confirmé discret, boutons redondants retirés. |
| FAM-06 | TESTE | Anniversaires calculés sans nouveau registre ; documents dans Archives du Menu, contacts accessibles depuis Salon, événements dans Agenda. |
| FAM-07 | TESTE | Création enfant/bébé/animal distincte de la consultation/modification ; writer natif compatible. Écriture réelle bloquée par FAM-15. |
| FAM-08 | BLOQUE | Parcours d’invitation préparé, envoi désactivé : pas de contrat d’invitation et de rattachement authentifié disponible. Aucun adulte créé ni invitation prétendument envoyée. |
| FAM-09 | TESTE | Sélecteurs décoratifs de rôle, allégeance et icône supprimés du formulaire ; attributs magiques traités par E05/E06. |
| FAM-10 | TESTE | firstName/lastName E05 réutilisés, nickname ajouté, ancien name unique préservé sans découpage arbitraire ; dates anciennes et champs supplémentaires conservés. |
| FAM-11 | BLOQUE | Catégories baby/child/pet et absence de compte autonome implémentées/testées ; interface d’éligibilité repas expose excluded/child/adult/unknown. Le calcul E07 reste fondé sur les convives saisis, sans lien automatique membre→portion ; cette intégration reste à définir sans toucher au chantier Cuisine. Aucun changement d’âge/catégorie automatique. |
| FAM-12 | TESTE | Notes personnelles sur le membre, writer natif, sans réutiliser le registre de mémos. |
| FAM-13 | TESTE | Liens E06 sur l’identifiant exact, résultats recalculés nativement et confirmés, pas de choix manuel Maison/Patronus ni second questionnaire ; visuels locaux, aucun blason officiel inventé. |
| FAM-14 | TESTE | Action d’enregistrement jaune doré, annulation secondaire, dégagement du dock. |
| FAM-15 | BLOQUE | Refus natif sans identité prouvée ; matrice parent A/parent B/enfant/bébé/animal testée en démo explicite, y compris accès direct au writer. Le serveur ne fournit pas l’association compte→membre/rôle et les autorisations fines : aucune garantie serveur revendiquée. |
| FAM-16 | TESTE | Galerie Salon en deux colonnes sur smartphone, mêmes portraits et couleurs E05, accès fiche par toute la carte. |
| FAM-17 | TESTE | Nouvelle consultation reconstruite depuis Stitch et données natives : identité, consécrations, activité/Runes, notes, Grimoire existant, santé secondaire. Origines Salon/Carnet et rechargement préservés. Limites d’écriture FAM-15 explicites. |
| FAM-18 | TESTE | Événements depuis Salon : retour Salon à annulation/enregistrement ; depuis Agenda : retour Agenda. |
| FAM-19 | TESTE | Agenda compact, un header et dock officiel à cinq destinations, blocs redondants retirés. |
| FAM-20 | TESTE | Consultation, modification stable, suppression confirmée ; provenance/champs supplémentaires préservés par le writer natif ; refus d’un brouillon périmé et navigation mensuelle avec jours bornés. |
| FAM-21 | TESTE | Cartouche local trompeur retiré ; statut natif local/en attente/partagé conservé. |
| FAM-22 | TESTE | Nouveau mémo vierge ; mémo existant en consultation avant modification/suppression, identité conservée. |
| FAM-23 | TESTE | Annuler/Retour/Enregistrer respectent Salon ou liste des mémos. |
| FAM-24 | TESTE | Éditeur compact titre/texte/mots-clés et action dorée ; writer E09, snapshots, CAS, hors ligne, import volontaire idempotent et anciens mémos locaux préservés. |

## FAM-17 : référence et adaptation

Sources originales conservées sous `stitch/fam17-member-detail-20261112/`, y compris addendum et manifeste. Empreintes vérifiées à l’identique :

- code.html : `5c12e31b58c7271f13dc2e79a35ddb5d9abcdd092afc9197f4fe66282b85a5cf`
- screen.png : `701c19ecd404030cbc47dca689f9d1ece2d33f6f7cdbe37d369830823cc48cc6`
- DESIGN.md : `6db2e022f83a3f57c0e1249a9a0aa73e9213a1939ceda9172267a727b304e4db`

La route canonique `famille.html#member-detail?person=<id>&origin=salon|members` reçoit un membre existant. Les descendants conservent également `memberOrigin` pour un retour déterministe après rechargement. L’absence d’un identifiant valide affiche un état introuvable et ne sélectionne pas automatiquement le premier membre.

Le composant reconstruit les panneaux et la hiérarchie de Stitch, avec la palette et les polices locales DOBBY. Il affiche uniquement les attributs présents. Aucun âge, badge vérifié, grade, compteur de quêtes ou date médicale fictif n’est injecté. L’avatar provient de DobbyMemberAvatar ; Maison et Patronus du catalogue et profil E05 ; les résultats sont produits par le scoring E06 existant. Le blason absent est remplacé par un repère textuel neutre, pas par une armoirie artificielle. Les sprites locaux sont ceux déjà disponibles dans E05.

Activité et progression proviennent de DobbyFamilyMissions.summary et du ledger confirmé. Le Grimoire reste DobbyMagicProfile ; aucun second Grimoire ni ledger. Les Rituels & Mémoires lisent les notes du membre. Le panneau Santé fournit un lien secondaire vers le carnet existant : aucune fiche locale ni pièce médicale n’est copiée ou téléversée.

Les trois URLs Google, CDN, dock inerte, history.back() et sceau de confidentialité de la source restent uniquement dans l’archive documentaire immuable ; le nouvel écran actif ne les emploie pas.

## Modèle, droits et dépendances

Le writer v23MemberForm existant demeure la source d’écriture. Les nouveaux champs sont ajoutés au membre ; name reste compatible avec l’identité structurée E05 sans second stockage. Une fiche ancienne sans catégorie reste sans catégorie : ni le nom, ni l’âge, ni la position dans la liste ne prouvent un rôle parental. Les bébés/animaux ne peuvent agir comme sessions autonomes. Les notes et identités existantes, y compris les champs opaques, ne sont pas effacées pour entrer dans un formulaire simplifié.

Les mutations sans association fiable compte/membre sont refusées dans les opérations natives de membre et de santé locale/partagée. Les anciennes et nouvelles attributions médicales sont contrôlées avant réaffectation ; le périmètre local des données médicales reste intact. La persona de démonstration explicite permet de tester les règles sans la faire passer pour un contrôle serveur. Les modifications Maison/Patronus demandent une preuve éphémère attachée au formulaire natif et un recalcul du scoring à partir des réponses E06 ; l’appelant ne choisit pas un résultat en envoyant un identifiant et une chaîne de version.

Dépendances à résoudre avant usage réel des mutations : association authentifiée utilisateur→membre canonique, rôles du foyer vérifiés et contrôle serveur des écritures de membre/médical, plus mécanisme réel d’invitation. Il est interdit de contourner cette absence par un rôle ou un identifiant conservé dans un stockage local.

L’interface d’éligibilité repas ne modifie aucun total E07. Les valeurs adult/children demeurent les entrées de portions natives. La correspondance automatique membres→convives, la confirmation des choix et le traitement des profils sans catégorie demandent un contrat avec E07 ; aucune réécriture opportuniste du module Cuisine n’a été réalisée.

Aucun service worker n’a été ajouté. Les tests vérifient la lecture des données locales et les parcours sans réseau familial, ainsi que la reprise hors ligne des mémos avec assets servis localement. Un premier chargement de tout le site, sans réseau et sans cache préalable, n’est pas garanti par l’architecture existante.

## Validation et preuves

Socle de référence : 186 tests Node natifs réussis avant modification, journal `evidence/fam01-24/baseline-native.log`. L’échec fonctionnel de CI globale signalé dans le prompt n’a pas été réparé ni attribué à ces changements : la campagne globale n’a pas été relancée et aucune CI distante n’a été interrogée ou déclenchée pour ce chantier.

Résultats finaux : **204/204 tests Node** (`node --test essai-stitch-v5-famille/tests/*.test.mjs essai-stitch-v7/tests/e06-identity.test.mjs essai-stitch-v7/tests/e09-memo-writer.test.cjs`, journal `native-final.log`) et **2/2 parcours Chromium natifs** (`native-browser-final.log`). Les 199 tests du socle/identité seuls et les 23 tests du lot de politique/audit sont des sous-ensembles, pas des totaux à additionner.

Un échec intermédiaire d’assertion statique attendu après extension du writer a été corrigé en épinglant 10 amendements littéraux FAM au SHA de la base ; la comparaison octet par octet du reste du code natif demeure active. Cet écart de test a été traité comme conséquence de la mission, pas comme un défaut hérité de la CI globale.

La relecture indépendante et les corrections sont décrites dans [review.md](evidence/fam01-24/review.md).

Suites ciblées :

- `fam-detail.cjs` : création via writer, parcours Salon/Carnet, origines après rechargement, identifiants E06 exacts, Maison/Patronus confirmés, Grimoire/santé existants, enfant/conjoint en lecture, brouillon membre périmé conservé, accents et états vides ; captures 320/390/1440.
- `fam-members.cjs` : cartes, identité, catégories, anniversaire, compatibilité, thème, recherche, retour et formulaire aux trois largeurs.
- `fam-agenda-memos.cjs` : CRUD, retours, absence de doublon, confirmation de suppression, snapshots/conflits et imports aux trois largeurs.
- `fam-agenda-memos-sync.cjs` : deux profils, fixtures HTTP, hors ligne/reconnexion, provenance transportée, anciens mémos locaux non envoyés.
- `fam-agenda-month.cjs` : cinq changements de mois, borne des fins de mois et année bissextile.
- `family-review-effects.cjs` : 13 vues × trois largeurs, préférences, pixels réellement animés, mouvement réduit, persistance et absence d’effet métier/audio. Contrôle E06 supplémentaire à 390 px.
- `family-member-policy.test.*` : opérations natives directes, matrice de droits, anciens champs et identité, refus de résultats magiques forgés et confirmations réelles E06.

Captures et journaux : [fiche individuelle](evidence/fam01-24/detail/), [membres](evidence/fam01-24/members/), [Agenda/Mémos](evidence/fam01-24/agenda-memos/), [effets](evidence/fam01-24/effects/). La source visuelle originale `screen.png` est conservée à part pour comparaison ; elle contient des images externes cassées qui ne sont pas reprises dans l’écran actif.

## Fichiers, coexistence et réconciliation

Liste complète : `evidence/fam01-24/files-modified.txt`. Principaux points d’intégration : family.js (routes/origines), family-engine.js (facade des writers), family-register.js (mémos), family-member-detail.js/.css, family-members-review.js/.css, family-agenda-review.js/.css, family-review-effects.js/.css, magic-profile.js et onboarding.js/engine ; writer/politique natifs dans V5 et génération des quatre racines V7.

Les quatre HTML racines ne portent que l’inclusion des scripts/styles Famille issus de build-source.cjs : aucun module Cuisine/Missions n’a été reconstruit ni réécrit. Les fichiers communs chrome.js/css et les moteurs d’effets généraux restent inchangés. Les captures, transformations et amendements d’audit du writer sont propres à cette branche.

Réconciliation future :

1. Attendre une autorisation explicite ; ne pas pousser ou fusionner automatiquement.
2. Comparer la future branche d’intégration à la base faf89d5 ; conserver ses correctifs indépendants.
3. Résoudre explicitement les chevauchements family.js/engine/register, magic-profile/onboarding, index.html natif et build-source.cjs. Préserver les corrections de synchronisation E09/Runes déjà présentes dans la base.
4. Relancer la génération canonique et contrôler les quatre racines dérivées, puis les tests ciblés de droits et de navigation. Aucun ancien dossier d’aperçu ne doit être remplacé.
5. Prévoir les garanties serveur et le contrat E07 dans des missions autorisées distinctes ; ne pas activer les mutations réelles en se fondant sur les seuls tests de démo.

## Commits locaux

Le SHA d’implémentation et les résultats finaux sont consignés après les contrôles dans la section de clôture et le journal de livraison. Aucune publication, migration, PR, modification de workflows ni CI distante. Arrêt local pour revue utilisateur.

Contrôle whitespace : les fichiers modifiés passent `git diff --check`. Le DESIGN.md immuable du ZIP comporte un espace final d’origine à la ligne 138 ; ce fichier de référence est exclu du contrôle de whitespace pour conserver son SHA256 exact.
