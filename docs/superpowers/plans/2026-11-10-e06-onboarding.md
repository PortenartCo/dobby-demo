# E06 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Exécution autonome demandée ; pas de validation intermédiaire.

**Goal:** Sept compositions Stitch fonctionnelles, questionnaires conformes, confirmations explicites et reprise isolée par contexte/membre.
**Architecture:** Calcul pur JavaScript depuis le JSON canonique. Routes ajoutées au routeur Famille V7 existant, templates dérivés des sept HTML originaux immuables. Brouillons dans le magasin meta IndexedDB natif ; résultats et identité via v23MemberForm/save natifs. Aucune nouvelle authentification ni synchronisation.
**Tech Stack:** JavaScript DOM, modules ES, CSS existant, Python standard de référence, Playwright/Chromium.
**Spec:** docs/dobby-v7/E06-SPEC.md ; données canoniques design/e06/references/scoring/.

## Contraintes globales
Base exacte 8418682 ; branche E06 isolée. Aucun merge, main/Pages/production Supabase inchangés. Pas de compte familial réel. Ne pas recréer Cheminette (source absente). Textes, IDs et calculs canoniques exacts. Résultat confirmé seulement explicitement ; aucun crédit E04 modifié. Préserver les champs inconnus. Photos et autorisations parentales non simulées.

## Review Focus
- Changement de compte/foyer/membre, suppression du membre ou contexte non vérifié pendant un brouillon : bloquer toute écriture hors contexte.
- Refus stockage local/meta et double clic : pas de nouveau membre fantôme ni de résultat confirmé silencieusement.
- Retour/modification après question complémentaire : invalider les réponses devenues sans objet, jamais influencer le résultat avec une question non posée.
- Conflit et ancien writer : choix explicite natif, démontrer la perte possible interversions sans prétendre la corriger côté client.
- Noms legacy et résultat déjà existant : pas de découpage arbitraire du nom ni d’annotation erronée de version de calcul après édition manuelle.

### A — Calcul et sources
- [ ] Installer les références immuables et leurs empreintes ; exécuter le Python hors du dossier source et comparer qa-results.
- [ ] RED : comparer toutes les combinaisons JS/Python et les exemples, les entrées invalides et questions conditionnelles.
- [ ] GREEN : onboarding-scoring.mjs pur, chargement du JSON inchangé ; mapping explicite IDs FR barème vers catalogue E05.
- [ ] Commit A avec résultat exhaustif.

### B/C — Parcours et intégrité
- [ ] RED : parcours avec choix de membre explicite, abandon sans effet, création native sans doublon, résultat différé/confirmé et reprise.
- [ ] Étendre uniquement le patch d’identité/formulaire natif pour prénom/nom séparés optionnels et versions des résultats ; conserver le champ name canonique et tous les champs inconnus.
- [ ] onboarding-engine.js : métadonnées temporaires par user/household/member, contexte capturé et contrôlé avant save ; résultat recalculé au moment de la confirmation ; persistance canonique via le writer E05.
- [ ] Connexion : façade vers login/requireHousehold existants, clé publique configurée uniquement. Création/invitation/association compte-membre et autorisations parentales bloquées explicitement si non vérifiables. Proposition isolée sous sql-proposals/E06-PREREQUIS.md, non exécutée.
- [ ] Sept templates dérivés, même routeur Famille, en-tête léger/progression ; barres habituelles masquées seulement pendant la cérémonie. Refaire les deux tests depuis E05, sans reconstruire le profil.
- [ ] Source graphs : emblèmes/Patronus/portraits E05 ; scène Choixpeau réellement récupérée si accessible, sinon absence explicitée. Aucune image de capture utilisée comme illustration.
- [ ] Commit B/C.

### D — Recette et livraison
- [ ] Tests reprise/reload, retour, skip, contexte, conflit, refus et héritage ; conformité et sources intacts.
- [ ] Captures avant/après sept écrans à 320/390/1440 ; variantes quatre Maisons/douze Patronus sans UI de choix direct sur les révélations.
- [ ] Revue technique indépendante ; corriger les défauts établis avec tests causaux.
- [ ] Une campagne générale adaptée aux fichiers partagés, E04/E05 et composition temporaire E03 si nécessaire ; CI au SHA final.
- [ ] Rapport E06/manifeste honnête des parcours opérationnels et bloqués ; commits poussés E06 seulement ; arrêt pour revue.
