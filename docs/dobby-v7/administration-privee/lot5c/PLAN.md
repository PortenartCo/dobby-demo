# Lot 5C — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Assembler un seul paquet final vérifiable pour soumission à validation, sans exécution hébergée.

**Architecture:** Réutiliser la fondation et les variantes validées, conserver intégralement la garde RLS V7. Générer une installation transactionnelle fermée, raccordant le bridge Auth aux lecteurs/activateurs et à l’empreinte Storage ; activation séparée sur canari privé. Conserver les contrôles de catalogue/Missions sans option de contournement livrée.

**Tech Stack:** PostgreSQL 17, Node natif, psql, Docker local isolé, PostgREST épinglé.

**Spec:** Demande Lot 5C du 19 novembre 2026 ; base PR #34 `afb09873b39e533d433c72a436ab3cbcfc043bbc`.

## Global Constraints

- Aucun accès en écriture Supabase hébergé, aucune exécution distante dans cette mission.
- Projet futur exclusivement `pqcdkrwljgvgagzwrcmg`, PostgreSQL 17.11 rapporté par l’utilisateur ; aucun nouveau projet ni support.
- Migrations historiques, 27 contrôles et 12 références Missions inchangés.
- Conserver la correction V7/25006 et ses deux seuls nouveaux droits V7.
- Aucun déploiement, fusion, compte réel, gate enfant ou architecture nouvelle.

## Review Focus

- Réinstallation/entrée manquante : refus avant DDL et aucune activation implicite.
- Bridge invisible sous RLS : refus d’activation, aucun flag positif fondé sur les seules ACL.
- Storage incompatible après raccordement : empreinte de source exacte et contrôle bloquant.
- Rollback rouvrant les anciens chemins : fermeture conservant les gardes, restauration complète distincte.
- Fonctions Missions privées absentes : refus intégral du paquet ; tests partiels explicitement identifiés.

## Task 1 — Assemblage et préflight

**Files:** créer `supabase/integration/lot5c/build.mjs`, sources de raccordement, préflight READ ONLY, installation fermée, activation et fermetures générées, manifeste d’empreintes ; `tests/private-access/lot5c/package.test.mjs`.

**Interfaces:** consomme les générateurs Lot 5B et migrations historiques épinglées ; produit `00-preflight.sql`, `10-install.sql`, `20-activate.sql`, `80-stop-admin.sql`, `90-close.sql` et `manifest.json`.

- [x] Vérifier le refus du paquet intégral sans Missions, sans DDL résiduelle.
- [x] Raccorder lecteurs et activateurs Auth dans la source de revue ; adapter l’attente Storage de ce seul lecteur.
- [ ] Validation fonctionnelle complète : **ARRÊT**, nouveau 25006 Lot 3 prouvé pour les deux invitations valides ; droits/canari/installation partielle vérifiés mais paquet NO-GO.
- [ ] Fermetures et restauration physique fonctionnelles : non validées sur assemblage valable, arrêt sur blocage.
- [x] Source gelée, commit et sauvegarde GitHub après contrôle de confidentialité ; CI ciblée rouge conforme au défaut, compatibilité 70/70.

## Task 2 — Dossier opératoire unique

**Files:** `docs/dobby-v7/administration-privee/lot5c/` : procédure, restauration, recette, décisions et résultats ; entrée privée exemplaire hors secrets.

**Interfaces:** consomme les scripts et leur manifeste ; produit l’ordre exact, les GO humains et un verdict distinguant préparation locale de l’autorisation de bascule.

- [x] Décrire sauvegarde DB/octet Storage/configuration et manifeste A/B conservé hors Git.
- [x] Définir recette fictive, préservation A/B, décisions liens signés/sessions et limites Missions.
- [x] Revue et preuves consignées ; confidentialité et livraison de la PR #34 en brouillon. Aucun GO de mise en service.

## Journal de décisions

Plan arrêté sur le blocage métier nouveau, sans déclarer la tâche d’intégration fonctionnelle terminée. Les livrables sont un dossier NO-GO et des entrées SQL sans charge mutable. Décision de livraison après revue : garder l’assemblage uniquement dans la source examinable, distribuer des sentinelles seules et imposer les deux postflights. Risque si ces conditions étaient ignorées : installation d’un système cassant les invitations ou exécution indue d’un candidat non validé. Aucune décision d’activation, rotation ou restauration réelle prise pour l’utilisateur.
