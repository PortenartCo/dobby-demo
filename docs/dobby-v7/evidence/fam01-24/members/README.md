# Membres — FAM-02 à FAM-14

Composants : `essai-stitch-v7/family-members-review.js` et `.css`.

Validation locale :

```sh
DOBBY_TEST_ORIGIN=http://127.0.0.1:8863 node essai-stitch-v7/tests/fam-members.cjs
```

Résultat : PASS aux trois largeurs 320, 390 et 1440 px. Aucune requête vers un backend ; données fictives dans des profils navigateur éphémères.

- Intégration contrôleur : liste → fiche individuelle, cartouche → Salon, recherche sur surnom et réinitialisation, un header et un dock.
- Cartes : avatar E05, palette du catalogue E05, clic sur toute la carte, catégorie non inventée pour les anciens membres, aucun grade par défaut présenté comme acquis.
- Formulaire : création distincte de la modification, choix Bébé/Enfant/Gardien uniquement, identité séparée, surnom, espèce, date facultative et notes. Les données d’identité déjà saisies restent visibles si une catégorie animal est choisie et qu’un complément existe.
- Compatibilité : identité historique conservée entière, champs structurés cohérents avec le writer natif, limite totale de 80 caractères contrôlée avant l’écriture, date historique incompatible préservée jusqu’à correction ou effacement explicite.
- Mobile : pas de débordement horizontal et bouton principal doré accessible au-dessus du dock en bas de page.
- Dépendances : l’invitation adulte est un parcours UI explicite et bloqué, sans envoi fictif. Sans association de compte vérifiée, création et modification sont désactivées avec motif. Les garanties d’autorisation natives sont couvertes par les tests du modèle, pas déduites de cette interface.

Les formulaires autorisés dans ce test utilisent une fixture de permissions de présentation, sans appeler Enregistrer. Les tests du modèle et du writer natifs couvrent les écritures et leurs refus séparément.

Preuves : `members-integrated-*.png` montrent la liste via le vrai contrôleur ; `members-*.png`, `member-create-pet-*.png` et `member-edit-blocked-*.png` montrent les contrats de présentation ciblés. `result.json` précise le périmètre.

FAM-13 est raccordé par les fiches individuelles et les questionnaires E06 gérés par le parent, sans questionnaire ni stockage ajouté dans ce composant.
