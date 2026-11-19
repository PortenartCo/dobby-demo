# Lot 4 — Finition responsive du 19 novembre 2026

La console montre désormais les premières données au-dessus du dock sur les vues mobiles contrôlées et utilise deux colonnes de listes dès la tablette. Le correctif est appliqué sur la branche existante de la [PR #32, conservée en brouillon](https://github.com/PortenartCo/dobby-demo/pull/32), depuis `2efb3c8d5417a1bca750993838520019b2ff82eb`.

## Changement applicatif

Seul `essai-stitch-v7/admin-access.css` change :

- Panneau introductif compact, avec suppression du texte introductif répété sur les vues secondaires ; titres et explications propres à chaque opération conservés.
- Cinq destinations toujours visibles : deux rangées de trois puis deux boutons sur mobile, une rangée de cinq dès 720 px. Hauteur minimale des boutons : 44 px sur mobile, 46 px sur tablette/PC.
- Console jusqu’à 1180 px dans le shell V7 existant ; comptes, demandes et historique sur deux colonnes. Les formulaires utilisent une composition adaptée à la largeur.
- À 320 px, le nom « Administration DOBBY » revient à la ligne dans le panneau central existant. La règle est limitée aux routes `admin-*`, suivant le précédent de la vue Contrats ; dimensions et commandes du header conservées.

Typographie, palette, effets, six destinations du dock et styles de confirmation sont conservés. Aucun JavaScript applicatif, mécanisme d’autorisation, commande Edge, migration, compte, cache ou gate enfant n’a été modifié.

## Comparatifs observés

[Index des 56 nouvelles captures](../../evidence/lot-4/responsive-finish/INDEX.md) · [Comparateur HTML avec filtres](../../evidence/lot-4/responsive-finish/comparatifs.html) · [Mesures et empreintes](../../evidence/lot-4/responsive-finish/results.json).

| Mesure | Avant | Après |
| --- | --- | --- |
| Premier compte, 320 px | y=772 px | y=492 px |
| Premier compte, 390 px | y=718 px | y=497 px |
| Premier champ d’invitation, 320 px | y=780 px | y=448 px |
| Introduction secondaire, 320 px | 283 px | 52 px |
| Navigation, 320 px | 150 px | 95 px |
| Largeur de console, tablette 768 px | 480 px | 768 px |
| Largeur de console, PC 1440 px | 480 px | 1180 px |

Les 28 paires couvrent Accès, Inviter, Demandes, liste de 27 demandes en haut et en bas, confirmation puis Historique, aux largeurs 320/390/768/1440 px. Hauteur de viewport : 900 px, identique aux preuves précédentes ; bandeau explicite de fixture de 44 px inclus ; dock à y=819 px.

Le même état fictif local est conservé pour les deux phases. L’avant sert uniquement le CSS exact de la base Git à la place du nouveau CSS ; aucun HTML, script ou échange métier n’est remplacé. L’après n’intercepte aucune ressource. Les deux phases utilisent la V7 complète et les services locaux réels de la fixture existante. Les empreintes des 14 sources observées sont figées ; seul le CSS diffère entre phases. La fixture a été fermée après le run.

## Vérifications exécutées pour cette finition

- `node --test tests/private-access/admin-ui.test.mjs` : **23/23 PASS**, aucune omission ; confirmations, révisions CAS, cibles exactes, pagination, réponses tardives et démarrage direct inclus. [Journal](../../evidence/lot-4/responsive-finish/checks/admin-ui.log).
- `node tests/private-access/lot4/responsive-finish.cjs`, puis Entrée au checkpoint : **PASS**, 56 PNG et 28 comparaisons ; aucun débordement horizontal, cinq onglets lisibles, sous-titre complet à 320 px, données visibles au-dessus du dock, pagination réelle 25 → 27, dernier bouton atteignable et confirmation obligatoire annulable. [Détails de méthode](../../evidence/lot-4/responsive-finish/INDEX.md).
- `node essai-stitch-v7/tests/e01.cjs` avec origine statique loopback possédée et dossier de sortie distinct : **PASS à 390/1440 px et motion**, six destinations, header/dock, préférences et effets conservés. [Journal](../../evidence/lot-4/responsive-finish/checks/e01.log).
- Revue visuelle directe des captures mobiles, tablette et PC, puis revue indépendante du diff CSS : aucune anomalie relevée dans le périmètre contrôlé.
- Empreintes des 56 PNG et des sources vérifiées. Les **146 fichiers historiques** de preuves et rapports Lot 4 sont identiques à la base, dont les **40 captures de référence** et les autres preuves antérieures.
- `git diff --check` : PASS. Contrôle de confidentialité avant publication : [résultat](../../evidence/lot-4/responsive-finish/checks/confidentiality.json).

Les CI GitHub pertinentes sont consignées avec leurs résultats et liens dans la description de la PR #32. Les statuts du commit publié y sont consultables ; les anciens résultats CI ne constituent pas une validation de cette finition.

## Limites et conditions conservées

Cette vérification utilise Chromium 154 et ne constitue pas une campagne multi-navigateurs ou avec clavier mobile ouvert. Les données sont fictives, exclusivement locales ; aucune mutation propriétaire n’est confirmée par la console pendant les comparatifs. Le peuplement du jeu local crée les métadonnées de 27 demandes fictives et trois lignes de journal, sans modifier de compte réel.

Aucun Supabase hébergé, déploiement, fusion ou changement des lots précédents. Les campagnes Auth, Storage, SMTP/admission et migration/rollback SQL n’ont pas été rejouées. Les anciens résultats natifs et de sécurité restent historiques. Les réserves du [rapport Lot 4 existant](RAPPORT.md) concernant les permissions Auth hébergées et les liens/jetons Storage déjà signés restent inchangées.
