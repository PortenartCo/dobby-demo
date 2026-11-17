# Notes du foyer — Stitch 23

**Objectif :** appliquer la revue utilisateur à la présentation des notes, sans changer les writers, la synchronisation, les permissions ou les données natives.

**Cadre approuvé :** demande utilisateur « CODEX — DOBBY V7 — Finalisation Notes du foyer / Stitch 23 ». Branche `feat/dobby-v7-notes-stitch23-20261116` issue de `main`, checkout indépendant. Ne pas reprendre, fusionner ou modifier la PR Archives #17. Aucune opération Supabase distante ou migration.

**Architecture :** changements ciblés dans `essai-stitch-v7/family-register.js` et styles limités aux vues `memos` / `memo-edit` dans `family-agenda-review.css`. Copier le PNG Stitch original sans transformation. Conserver tous les writers et les routes. Réutiliser le constructeur d'aperçu familial dans une enveloppe Notes avec son propre espace de stockage et sa CSP de démonstration.

## Étapes

- [x] Vérifier la référence actuelle, les sauvegardes et les tests natifs des mémos. Capturer liste, création, consultation et édition avant modification, avec données fictives.
- [x] Ajouter le PNG original sous le titre ; hauteur 155 px mobile, 220 px à partir de 768 px, proportions conservées, aucune superposition. Garder l'ajout et la recherche juste après.
- [x] Appliquer les tailles cibles aux boutons, recherche, cartes, consultation et formulaires. Vérifier les chaînes longues et le focus clavier.
- [x] Afficher les notes locales dans la liste existante avec leurs routes locales et leur partage manuel confirmé. Retirer le volet « Anciens mémos locaux », le statut permanent et le bouton Synchroniser. Conserver les alertes de conflit et leurs actions existantes, ainsi que les diagnostics natifs dans la gestion du foyer.
- [x] Vérifier les parcours natifs, la persistance après rechargement, la recherche titre/texte/mots-clés, les notes locales, l'import volontaire idempotent et les conflits. Simuler transport et hors ligne sans compte réel.
- [x] Capturer à 320, 390, 768 et 1440 px ; construire l'aperçu isolé avec manifeste et provenance, fournir les captures comparatives et les résultats. Commiter et publier la branche pour revue, sans fusion ni changement du site principal.

## Points de contrôle

- Deux notes de même identifiant mais de portées différentes restent consultables via leurs routes respectives.
- Un titre, un texte ou un mot-clé sans espaces ne provoque pas de débordement horizontal.
- Consulter/rechercher une note locale ne crée pas de copie familiale.
- Une sauvegarde refusée ou une version périmée ne détruit ni le texte saisi ni les données existantes.
- Les tests A/B simulent le backend ; la recette avec les deux vrais comptes familiaux reste différée.
