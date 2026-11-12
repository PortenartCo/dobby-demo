# DOBBY V7 — ADDENDUM CODEX : FAM-17, nouvelle fiche individuelle Stitch

**Objet :** remplacer uniquement la condition d'attente FAM-17 du prompt Codex `FAM-01 a FAM-24` par une implementation a partir de la nouvelle maquette Stitch jointe.
**Statut :** source de conception recue, a raccorder ; ce ZIP ne constitue pas un code DOBBY fonctionnel.
**Date de reference :** 12 novembre 2026.

## Fichiers sources, tous inclus dans le dossier `stitch-source/`

- `code.html` : maquette HTML Stitch originale, a preserver comme source visuelle et structurelle.
- `screen.png` : rendu portrait Stitch 311 x 1600 px, a comparer lors de la validation visuelle.
- `DESIGN.md` : palette, styles, composants et typographie de l'interface.

Le `MANIFEST.json` contient les SHA-256 des fichiers originaux. Conserver une copie immuable sous `docs/dobby-v7/stitch/fam17-member-detail-20261112/` (ou repertoire de preuve equivalent dedie) dans la **branche Famille uniquement**, puis implementer les adaptations dans les fichiers canoniques existants. Ne pas utiliser la maquette directement comme une page autonome qui contourne le moteur de l'application.

## Contrainte de concurrence prioritaire

Un autre Codex travaille sur `feat/dobby-v7-global-review-20261112`. Ne jamais toucher a cette branche, a son worktree, a `main`, aux previews Pages existantes, aux migrations Supabase ni au deploiement general. Lancer les tests uniquement sur la branche/worktree Famille independant deja prevu ; conserver le gate d'arret avant toute publication/push/PR. Si la branche Famille est en cours d'execution, ajouter ce dossier et cette instruction dans **son propre worktree** sans reinitialiser ni relancer sa mission ; sinon utiliser l'ancetre immuable annonce dans le prompt Famille.

## FAM-17 : structure visuelle validee en principe

1. **Hero / identite** : vrai avatar E05, prenom/nom, surnom optionnel, categorie Parent / Enfant / Bebe / Gardien-animal, Maison, grade Runes ; couleurs de la Maison native. Aucun faux membre ou faux grade dans les donnees reelles.
2. **Registre du Logis** : infos effectivement stockees (prenom, nom, surnom, naissance) ; autres champs uniquement si la persistence native les prend en charge et si la regle d'autorisation le permet.
3. **Consecrations magiques** : Maison / Patronus recuperes du profil magique natif. Si manquants, boutons vers tests E06 ciblant **l'identifiant exact** du membre. Reutiliser les visuels locaux disponibles, leurs limites de droits et les composants E05/E06 ; aucun blason artificiel republiant des marques non autorisees.
4. **Activite & Runes** : resume derive du ledger Runes confirme, progression calculee et lien vers **le Grimoire personnel existant**. Ne jamais recopier les chiffres fictifs de Stitch.
5. **Rituels & Memoires** : notes personnelles enregistrees via le writer membre native (FAM-12), jamais via un registre parallele de memos.
6. **Carnet de Sante & Soins** : **acces secondaire** au module medical preexistant, sans migration implicite, ni exposition indue de fiches medicales individuelles locales, ni fausses dates de visites.
7. **Navigation** : les clics sur les portraits du Salon et du Carnet ouvrent cette fiche en lecture. Retour deterministe au Carnet / Salon d'origine ; bouton Modifier suivant les droits FAM-15. Garder un seul header et le dock officiel a **5 destinations** toujours visibles.

## Autorisations FAM-15, obligatoire avant activer Modifier

- Tous les membres consultent toutes les fiches selon la regle utilisateur retenue. Tenir compte de la sensibilite des informations de sante et de leur perimetre local existant ; ne pas assimiler cela a une autorisation automatique de partager la donnees privees sensibles vers le foyer.
- Parent : propre profil et enfants/bebes/animaux ; jamais le profil de l'autre conjoint.
- Enfant : seulement sa propre Maison/Patronus via questionnaires E06, autres informations en lecture seule.
- Bebe/animal : aucune session autonome ; les parents gerent leur fiche.
- Verifier le controle au niveau du writer/autorisations effectives. Si l'identite parentale n'est pas prouvee ou les autorisations serveur manquent, interdire la mutation concernee et documenter le blocage. **Ne pas simuler une securite par des boutons masques**.

## Differences maquette Stitch -> application reelle : a corriger avant integration

- **3 images externes** (portrait, blason, Patronus) sont liees a des URLs Google `lh3.googleusercontent.com/aida/...` ; elles sont absentes ou illisibles dans le screenshot fourni. Ne pas conserver ces URLs en production ; utiliser les assets et composants DOBBY existants, avec un remplacement neutre si aucun visuel autorise n'existe. Le ZIP ne fournit aucun de ces trois medias en fichiers locaux.
- Les valeurs fictives `Lea Vance`, `Dame Chouette`, `1450` Runes, `18` quetes, `Rang IV`, dates de visite, et age `35 ans` sont des **placeholders de mise en page**, jamais des informations a injecter dans la famille ni des donnees a calculer depuis le HTML.
- Dans le screenshot, la date de naissance fictive `14 novembre 1989` ne correspond pas a l'age `35 ans` affiche le 12 novembre 2026. Calculer tout age depuis la vraie date de naissance, ou l'omettre.
- Les elements `Acces Parent`, `Modifier`, badges de verification, notes et statuts doivent etre derives des permissions et donnees natives, non maintenus en dur.
- `history.back()` est un comportement Stitch fictif : le remplacer par la navigation DOBBY selon origine. Les liens du dock `href="#"` ne sont pas fonctionnels ; conserver le dock DOBBY officiel.
- Le HTML source contient `cdn.tailwindcss.com`, Google Fonts et Material Symbols distants ; integrer au pipeline/ressources locaux de DOBBY, sans nouvelle dependance CDN obligatoire ni nouvelle CSP affaiblie.
- Le cartouche final « Sceau de Protection DOBBY », « fiche hermetique locale », etc. formule une promesse de securite non demontree et contradictoire avec le partage familial futur. Supprimer ces affirmations non prouvees.
- Le patronus/les maisons ne doivent pas etre choisis via une edition de texte arbitraire ; utiliser le resultat des tests E06 et leur workflow de confirmation.
- La nouvelle fiche est une **vue de consultation de membre**, pas le profil magique E05 existant : garder un lien vers son Grimoire, ne pas le dupliquer.

## Mode operatoire dans la branche Famille

1. Faire le preflight du worktree, de la branche Famille et des changements en cours ; ne rien reset.
2. Deposer les trois fichiers originaux dans un dossier source de reference, controles par SHA256.
3. Implementer une route `member-detail` (ou equivalente dans le routeur natif) qui recoit un vrai `member.id`; les actions des cartes E09 et Carnet naviguent vers cette route, et non directement vers `health-person`.
4. Reutiliser les composants `DobbyMemberAvatar`, `DobbyMagicIdentity`, `DobbyMagicProfile`, `DobbyOnboarding`/E06, le ledger Runes et les writers existants. Toute adaptation des champs firstName, lastName, nickname, notes, categorie / type d'animal reste soumise au gate de compatibilite de FAM-10/11/12.
5. Produire des captures comparatives 320/390/1440 px avec donnees fictives generees via le writer natif. Aucune image cassee, valeur incoherente, double dock/header, action de modification sans droit ou bouton inerte.
6. Tester : navigation depuis Salon et Carnet, retour, profil enfant sans Maison, profil avec Maison/Patronus, lecture seule enfant, interdiction modifier conjoint, lien Grimoire, lien carnet medical, caracteres accentues, affichages vides et chargement hors-ligne.
7. Mettre a jour le rapport `docs/dobby-v7/FAM-01-24-IMPLEMENTATION.md`, statut FAM-17 et preuves. Enregistrer dans la branche locale Famille, **sans push, fusion, publication ni migration**.

## Critere de livraison FAM-17

Source Stitch originale integreement preservee comme reference ; ecran de consultation reconstitue et lie aux donnees natives, tests ciblant les interactions et les permissions reelles, et aucune regression sur le Salon/Agenda/Memos. Si une dependance (assets, droits, writer) manque, la signaler comme **BLOQUE/PARTIEL** sans maquiller l'etat.
