# DOBBY V7 — Stitch 19/20 : choix d’intégration

Base vérifiée : `main` `0f3131f3deb1ff63f3accca9c591521b04f4f212`.
Branche isolée : `feat/dobby-v7-stitch19-20-integration-20261112`.
Archive reçue : SHA256 `b24078e7ab232c5fa25883fa0accd9f718e2746adf3c80ec2b533eedb66bda6e`.

L’interface reste celle de l’application native : routeur Famille, moteur V5 intégré,
IndexedDB et writers familiaux existants, questionnaires `e06-v1` inchangés. Les
références Stitch définissent les compositions visuelles, sans importer leur logique.

Le parcours d’accès comporte cinq vues dans V7, un profil avec galerie intégrée,
et un contrôleur d’étapes consommant une façade d’accès du client familial natif.
Le compte authentifié, son membre canonique et son foyer sont résolus côté serveur ;
aucune déduction par nom, ordre ou sélection de profil. Les résultats magiques
calculés gardent le writer qui recalcule le barème ; les choix directs passent par
une API native distincte avec provenance manuelle. La fin et la reprise sont
attachées au membre, au compte et au foyer.

Les cérémonies sont présentées en fenêtres depuis Traverse ; les questionnaires
existants restent accessibles par leurs routes natives. Le nouveau mode d’entrée
session du Rituel mène à Traverse, sans répéter les cérémonies terminées. Les
corrections de défilement et de largeur sont ciblées et partagées entre les modules.

Les seize portraits humains supplémentaires retrouvés dans une archive locale
peuvent être raccordés au catalogue après contrôle de leur provenance ; les huit
premiers gardent leurs identifiants et leur cadrage. Aucune image n’est générée.

## Répartition de l’implémentation

- Accès natif : session authentifiée sans foyer, confirmation e-mail, récupération,
  contexte serveur, création/rejointure idempotente et identité canonique.
- UI d’accès : Bienvenue, Connexion/Inscription, Profil, Rejoindre, Créer ; point
  d’entrée canonique préparé et ancienne racine conservée comme archive.
- Identité magique : contexte/permissions vérifiés, choix manuels, provenance,
  fenêtres Maison/Patronus et reprise, sans nouvelle grille de calcul.
- Transversal : scroll Famille, six largeurs, clavier, Cheminette/Effets/Son.

## Supabase : intervention utilisateur uniquement

Le connecteur refuse l’accès au projet familial attendu. Aucune modification
distante n’est autorisée à Codex : ni MCP, ni CLI, ni API ni script. L’utilisateur
exécute les éventuelles interventions et communique les résultats. Le diagnostic
joint ne lit que les catalogues. Les migrations ne seront déclarées appliquées
qu’après retour utilisateur ; aucune structure inconnue ne doit être supposée.

Les tests locaux utilisent des fixtures annoncées comme telles. Ils ne certifient
pas les comptes, invitations ou droits réels. Les parties validées sont déployables
selon la demande ; les fonctions dépendantes du backend restent exclues d’une
déclaration opérationnelle et de leur mise en production avant recette réelle.
