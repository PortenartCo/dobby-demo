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
- [x] Installer les références immuables et leurs empreintes ; exécuter le Python hors du dossier source et comparer qa-results.
- [x] RED : comparer toutes les combinaisons JS/Python et les exemples, les entrées invalides et questions conditionnelles.
- [x] GREEN : onboarding-scoring.mjs pur, chargement du JSON inchangé ; mapping explicite IDs FR barème vers catalogue E05.
- [x] Commit A avec résultat exhaustif.

### B/C — Parcours et intégrité
- [x] RED : parcours avec choix de membre explicite, abandon sans effet, création native sans doublon, résultat différé/confirmé et reprise.
- [x] Étendre uniquement le patch d’identité/formulaire natif pour prénom/nom séparés optionnels et versions des résultats ; conserver le champ name canonique et tous les champs inconnus.
- [x] onboarding-engine.js : métadonnées temporaires par user/household/member, contexte capturé et contrôlé avant save ; résultat recalculé au moment de la confirmation ; persistance canonique via le writer E05.
- [x] Connexion : façade vers login/requireHousehold existants, clé publique configurée uniquement. Création/invitation/association compte-membre et autorisations parentales bloquées explicitement si non vérifiables. Proposition isolée sous sql-proposals/E06-PREREQUIS.md, non exécutée.
- [x] Sept templates dérivés, même routeur Famille, en-tête léger/progression ; barres habituelles masquées seulement pendant la cérémonie. Refaire les deux tests depuis E05, sans reconstruire le profil.
- [x] Source graphs : emblèmes/Patronus/portraits E05 ; scène Choixpeau réellement récupérée si accessible, sinon absence explicitée. Aucune image de capture utilisée comme illustration.
- [x] Commit B/C.

### D — Recette et livraison
- [x] Tests reprise/reload, retour, skip, contexte, conflit, refus et héritage ; conformité et sources intacts.
- [x] Captures avant/après sept écrans à 320/390/1440 ; variantes quatre Maisons/douze Patronus sans UI de choix direct sur les révélations.
- [x] Revue technique indépendante ; corriger les défauts établis avec tests causaux.
- [x] Campagne générale unique terminée : 45/45 scripts PASS, sortie 0 ; E04/E05 et composition temporaire E03 PASS. CI au SHA final après push.
- [ ] Rapport E06/manifeste rédigés ; attendre campagne générale, commit final, push E06 et deux CI au SHA final avant arrêt pour revue.

## Progression et décisions
- A terminé : ff6f14e. Sources ZIP immuables inventoriées ; 25 600 comparaisons JS/Python PASS, toutes les sorties accessibles, qa-results identique. Aucun hasard/horloge/ID de membre dans le calcul.
- Worktree isolé /workspace/dobby-e06-onboarding ; E05/main inchangés. Baseline ciblée E05 : 7 PASS, sans relancer la suite inchangée.
- Cheminette absente : dépendance documentée, aucune recréation. Entrée E06 dédiée et accès depuis le profil ; l’application existante ne force pas une association de compte inexistante.
- Auth native : quatre parcours HTTP simulés PASS (accepté, ambigu, identifiants refusés, autre foyer). Aucune recette réelle. Configuration publique absente des sources ; usage de la clé déjà configurée seulement. Création/invitation/lien compte–membre bloqués sans simulation.
- Médias : Miroir original récupéré en local ; URL Choixpeau renvoie text/html (200), manque explicité. Aucun écran capturé utilisé comme illustration. Tous emblèmes/portraits/Patronus réutilisent E05.
- B/C : moteur natif/metadata raccordés ; prénom/nom séparés seulement si explicitement fournis, nom legacy conservé sans découpage. Versions de calcul par résultat ; modification manuelle E05 retire seulement la provenance de calcul correspondante.
- Tests causaux : brouillon retardé après changement de membre ne doit pas remplacer le brouillon actif (RED puis GREEN). Le routeur attend la sauvegarde temporaire avant de continuer ; les résultats ne sont écrits qu’après confirmation.
- Revue technique indépendante (base E05..fe2ecdc) : trois P2 établis et corrigés par tests causaux : identité canonique fixée avant toute relecture meta après création ; mutation atomique des brouillons dans le store meta natif avec détection de conflit sur le même membre ; refus explicite de membership affiché et confirmations bloquées, distinct du cache hors ligne.
- Preuves de correction : e06-review.cjs PASS (création/retry, deux vrais onglets IndexedDB, contexte restauré refusé), e06-drafts.test.mjs PASS, e06-shared.cjs PASS 320/390 (vrai writer natif et PATCH sur fixture HTTP ; résultat/version/même membre après reload, données privées exclues). Les clients anciens peuvent toujours effacer les extensions : test causal e06-sync.test.mjs, NON LIVRÉ interversions.
- Les URLs des adaptateurs natifs et composants partagés modifiés portent une version E06 afin d’éviter un assemblage nouveau UI/ancien adaptateur en cache. Cela ne protège pas les autres anciens writers.

- Contrôle visuel final : dimension du Patronus corrigée (utilitaire CSS source absent du bundle commun), test causal >=150×150 et reruns parcours/12 variantes PASS. Quatre thèmes de Maison et sept scènes à trois largeurs documentés.
- Livraison préparée : rapport, 60 captures et journaux ciblés/généraux ; génération reproductible PASS. Les captures anciennes régénérées par la campagne sont restaurées, seules les preuves E06 sont livrées. Les deux CI doivent encore être constatées au SHA final avant bilan.
