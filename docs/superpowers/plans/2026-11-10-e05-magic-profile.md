# E05 Magic Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Execution autonome autorisée par la mission E05.

**Goal:** Un profil par identifiant familial, quatre thèmes et médias locaux, sans second writer ni moteur de runes.
**Architecture:** Catalogue pur partagé natif/V7 ; extensions optionnelles `magicProfile` dans les membres. Le formulaire membre natif reste le seul writer et préserve les champs inconnus. Un composant Profil remplace la présentation personnelle, partage le composant avatar et les bandeaux existants.
**Tech Stack:** JavaScript DOM, HTML/CSS, Node tests, Playwright Chromium.
**Spec:** `docs/dobby-v7/E05-SPEC.md` (demande utilisateur).

## Global Constraints
- Base exacte 8bcd49c ; nouvelle branche feat/dobby-e05-magic-profile ; aucune fusion E03.
- Récompenses 10/25/50 et protocole E04 inchangés ; seuils approuvés [0,50,100,200,350,550,800,1100,1500,2000,2600,3300].
- Aucun changement Supabase/SQL, aucun second stockage, aucune publication.
- Aucun test réel de comptes, aucune photo réelle ; questionnaires non développés.

## Review Focus
- Membre supprimé ou compte sans rattachement : choix explicite, jamais premier membre attribué au compte.
- Edition native classique : conservation du magicProfile et des extensions inconnues.
- Ancien client : démontrer et documenter la perte possible des champs, pas une compatibilité prétendue.
- Conflit de révision : choix explicite existant et conservation de la version choisie, sans mélange arbitraire.
- Médias absents et permissions absentes : états explicites, pas de simulation.

### A — Identité et règles
- [ ] Tests catalogues, identifiants invalides, patch partiel/legacy, seuils approuvés ; constater RED puis GREEN.
- [ ] Catalogue partagé `family-profile.js`, champs optionnels validés via le formulaire natif ; préserver les extensions.
- [ ] Vérifier sauvegarde native réelle, reload, édition classique, refus stockage ; fixtures Famille CAS/conflits/ancien client.
- [ ] Commit A.

### B — Profil graphique
- [ ] Test navigateur RED : profil explicite, thème/médias/récompenses, paramètres repliés, bouton doré.
- [ ] `magic-profile.js/.css` : composition verticale unique ; modification Maison uniquement dans sa carte ; sélection Patronus/avatar et identité ; liens familiaux ; paramètres natifs repliés.
- [ ] `member-avatar.js` : portrait local ou emoji, même badge E04 ; `chrome.js` : routage profil sans attribution arbitraire ; `family.js` : pas de premier membre pour personal.
- [ ] Aucune fausse association de compte ni droit parental ; contrôle de sauvegarde sur contexte inchangé.
- [ ] Commit B.

### C — Médias et recette
- [ ] Rechercher export demandé ; inventorier sources exploitables ; générer médias originaux si possible, sinon statut manquant explicite.
- [ ] Captures quatre thèmes 320/390/1440 ; sélection/retour/reload/états vides/clavier/contraste/débordement.
- [ ] Régression E04 ciblée, composition temporaire E03 sans fusion ; une passe adaptée non-régression ; CI SHA final.
- [ ] Rapport E05 avec preuves, inventaire médias et blocages photos/droits/interversions/export ; commit final et push ; arrêt.

## Progression et décisions d’exécution
- A terminé : commit 3e3862e ; 7 tests purs/fixtures et e05-native PASS. Validation RED constatée avant implémentation.
- B/C : profil unique et médias locaux opérationnels ; e05.cjs PASS 320/390/1440. Les 20 illustrations sont originales, générées en deux atlas locaux sans retouche ; fenêtres CSS par identifiant.
- Décision : export `(4).zip` absent après recherche workspace/dépôt ; aucun asset de cet export prétendu récupéré. Fidélité à cette référence NON VÉRIFIÉE ; demande de pièce jointe émise et travaux indépendants poursuivis.
- Décision : édition du registre familial existante conservée ; aucun rôle parental ni lien compte/membre inventé. Bouton doré = choix explicite tant que le modèle ne fournit pas ce lien.
- Décision : photo personnelle NON LIVRÉE ; bucket documentaire privé repéré dans le code/proposition SQL, mais capacité et droits d’utilisation pour des profils non validés. Aucun appel production.
- Décision : ancien writer peut effacer magicProfile ; scénario reproduit. Intégrité interversions NON LIVRÉE, pas de réécriture du protocole Famille pour masquer cette limite.
