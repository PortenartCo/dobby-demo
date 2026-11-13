# DOBBY V7 — Maison & Equipements — Pack Codex (13 novembre 2026)

## Utilisation

1. Ouvrir une **nouvelle session Codex** sur `PortenartCo/dobby-demo`.
2. Joindre **ce ZIP entier** (ne pas joindre séparément des captures si le ZIP est accepté).
3. Coller le texte du fichier `01_PROMPT_CODEX.md`, ou le court message de lancement figurant ci-dessous.
4. Codex doit lire `02_SPEC_FONCTIONNELLE_VALIDEE.md`, `03_REGISTRE_RECETTE.md`, `04_CONTRAT_IMPORT_IA.md` et `05_PROMPT_IA_EXTERNE.md` avant de développer. Les captures et la référence Stitch 21 sont incluses.

**Message de lancement minimal (si ZIP joint) :**

> MODE EXECUTION — Implémente DOBBY V7 Maison & Équipements selon `01_PROMPT_CODEX.md` et les pièces du pack. Lis le manifeste, le registre de recette et la référence Stitch 21. Commence du dernier main sur une branche et un worktree isolés, protège les chantiers parallèles, teste, intègre et déploie seulement les parties effectivement vérifiées. Ne modifie pas Supabase distant. Remets une matrice exhaustive réalisé/partiel/bloqué et les actions manuelles nécessaires.

## Contexte vérifié au 13/11/2026

- Dépôt : `PortenartCo/dobby-demo` ; `main` observé au SHA `54d74b9448a1c518d8a3c483cd4deaea1e493748` (vérifier nouveau SHA lors du lancement).
- PR #13 **Contrats & Assurances** : fusionnée. Le mécanisme d'association d'équipements aux contrats est à réutiliser ; ne pas recréer un registre parallèle.
- PR #12 **socle familial** : fusionnée ; certains gates d'usage des capacités serveur restent fermés. Aucun accès enfant non validé ne doit être élargi par ce chantier.
- PR #11 **Famille/Runes** : ouverte lors de ce point ; vérifier son statut avant toute fusion. Ne pas toucher son worktree.
- L'application publiée est : `https://portenartco.github.io/dobby-demo/`.
- Le ZIP Stitch 21 remis par l'utilisateur a été vérifié : il contient exactement `screen.png` (visuel), `DESIGN.md` (indications de style). **Ce n'est pas du code exécutable ni une page HTML.**
- Visuel original également livré ici sous `sources/stitch21/original_stitch21.zip`, pour traçabilité ; la source prête à intégrer est `sources/stitch21/screen.png`.
- `sources/stitch21/DESIGN.md` est une référence graphique, **pas** une autorisation de remplacer le design system existant.

## Règles de sécurité et de non-régression

- Compte personnel DOBBY uniquement, aucune ressource Portenart professionnelle.
- Ne pas exécuter de SQL ni d'opération distante sur le projet Supabase personnel. Si une évolution est requise, livrer SQL manuel `preflight/apply/verify/rollback` et isoler la fonction concernée jusqu'au contrôle humain.
- Ne pas réexécuter les anciennes migrations Stitch 19/20 ni les installations familiales déjà appliquées. Ne jamais réinitialiser les comptes ou les données existantes.
- Ne jamais traiter une CI verte ou des fixtures comme une preuve d'utilisation multi-comptes réelle.
- Interdire le remplacement automatique d'un document, d'une intervention, d'un équipement ou de son historique sans décision de l'utilisateur.
- Ne jamais publier comme disponible une synchronisation de fichiers ou un rappel automatique non prouvés.

## Documents

| Fichier | Rôle |
|---|---|
| `01_PROMPT_CODEX.md` | Mission d'exécution autonome et checkpoints |
| `02_SPEC_FONCTIONNELLE_VALIDEE.md` | Toutes les décisions utilisateur, sans perte |
| `03_REGISTRE_RECETTE.md` | Liste de contrôles `H/F/M/D/A/S/P` vérifiables |
| `04_CONTRAT_IMPORT_IA.md` | Contrat d'échange ZIP/JSON versionné proposé pour l'import |
| `05_PROMPT_IA_EXTERNE.md` | Prompt que DOBBY devra proposer à l'utilisateur pour son IA externe |
| `exemples/equipments.json` | Exemple fictif du format d'import (aucune donnée réelle) |
| `sources/stitch21/screen.png` | Image d'en-tête validée, non redessinée |
| `sources/stitch21/DESIGN.md` | Référence originale Stitch |
| `captures_revue/*.png` | Captures des anomalies observées, nommées par fonction |
| `MANIFEST_SHA256.txt` | Empreintes du pack, hors ce manifeste |

Les fichiers du pack sont une **spécification de développement**, pas la preuve que le code ou les migrations sont déjà en production.
