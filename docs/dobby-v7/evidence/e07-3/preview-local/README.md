# Aperçu E07.3 assemblé — parcours local réel

**PASS 320, 390 et 1440 px**, sans interception de requête ni substitution de moteur. Les fixtures passent par les formulaires et le sélecteur de fichiers de l’interface ; les seules données préparées hors application sont des sentinelles brutes d’isolation, dans des contextes Chromium neufs.

- Deux créneaux fictifs explicites, calendrier ±1 semaine/sélection et planning natif inchangé.
- Catalogue, ajout aux favoris, rechargement, annulation puis confirmation du retrait.
- Retour/avance du navigateur sur le choix d’ajout, saisie manuelle puis véritable création native.
- Copie réelle du prompt dans le presse-papiers autorisé du navigateur de test.
- JSON V1 de deux recettes, aperçu, annulation sans écriture puis confirmation.
- ZIP V2 : image PNG de fixture réellement décodée 10 × 8, original byte-identique vérifié dans le blob store natif, total explicite 15 min, une seule recette avec adaptation TM5 liée et forcée « À vérifier » malgré `verified:true` dans l’entrée.
- Deux filtres de préparation pour cette même recette, rechargement avec photo et lien TM5 conservés, réimport du ZIP en mode conserver/ignorer sans doublon ni écrasement.
- Panier existant, véritable ajout et rechargement, cinq destinations permanentes restant dans le sous-répertoire.
- Réinitialisation avec deux onglets ; sentinelles LocalStorage, SessionStorage et six bases IndexedDB d’autres espaces conservées, y compris leurs blobs de « photographies » de fixture. Seul le nouvel espace E07.3 est remis à zéro.
- Aucune requête POST/backend, aucune tentative réseau externe et aucune ressource HTTP manquante sur le parcours final.

[Résultats des trois largeurs](results.json) · [journal 320](green-320.log) · [journaux 390/1440](green-390-1440.log) · [manifeste effectivement testé](tested-manifest.json) · [empreinte et portée du bundle](bundle-proof.json).

Le bundle temporaire `e073-preview-test-current/` est produit depuis les fichiers E07.3 courants, avant les commits finaux ; son manifeste identifie donc encore la base66a1395. Il sert uniquement à la recette locale. La recette du bundle final commité puis celle de l’URL publiée doivent être documentées séparément ; aucune publication ni synchronisation réelle n’est déduite de ces résultats locaux.

Les diagnostics conservés distinguent un premier bundle devenu obsolète avant les corrections natives d’import, puis des tentatives d’images Stitch historiques du moteur invisible refusées par la CSP. Le générateur E07.3 neutralise désormais ces références dans ses copies, sans modifier les originaux ; la preuve réseau finale demeure stricte.
