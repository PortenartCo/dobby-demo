# DOBBY V7 · Catalogue et images

## Contrat V2

Un ZIP `dobby-recipes` V2 complet associe une couverture et une image autonome à chaque couple `method` et `stepIndex`, avec un index qui commence à zéro. C’est valable pour toutes les étapes traditionnelles et toutes les étapes TM5 lorsqu’il y a une variante. Chaque image indique `photo-originale` ou `illustration-IA`. Une planche de plusieurs étapes est une anomalie éditoriale. Le parseur peut vérifier les liens et les empreintes. La continuité visuelle et l’absence de planche demandent un examen d’images.

Un ZIP complet peut déclarer `"mediaProfile":"per-step"`. Le Grimoire refuse alors une couverture ou une image d’étape absente, une provenance manquante, une liaison répétée, la réutilisation d’un fichier ou d’une image de contenu identique. Le catalogue impose cette règle même si le champ est absent. Les imports personnels anciens ou incomplets restent lisibles et permettent l’ajout ultérieur de photos. Le prompt demande une image par étape sans raccourcir la recette ni ajouter d’instructions à une transcription.

Le plafond est de 161 médias référencés, soit une couverture et jusqu’à 80 étapes par méthode. Un ZIP reste limité à 40 Mio, 80 Mio décompressés, 180 entrées, 150 fiches, 2 Mio de JSON et 10 Mio par image source. Les limites de pixels, le contrôle CRC et les refus des chemins dangereux ou fichiers spéciaux s’appliquent toujours. Découper les lots selon le nombre d’étapes, le poids et les entrées, même quand ils contiennent moins de 150 fiches.

## Contrôles de masse

Le compilateur s’exécute hors ligne avec Node.js et ImageMagick `convert` avec support WebP. Il relit chaque ZIP par le parseur V2, valide 100 % des fiches avec le moteur natif et enregistre les rejets, les doublons exacts d’identifiant, de titre et de contenu, ainsi que la réutilisation d’images. Il contrôle portions, durées, ingrédients structurés, métadonnées et exhaustivité des liaisons d’images. Chaque média décodé porte les empreintes source et WebP, ses dimensions, ses tailles, sa provenance et son index dans le rapport. Les quotas restent 140 plats, 30 entrées et 30 desserts par collection, pour 400 fiches au total. Les durées sont comptabilisées séparément.

```sh
node essai-stitch-v7/build-recipe-catalogue.mjs audit - /tmp/catalogue-audit.json /chemin/prive/lot-*.zip
node essai-stitch-v7/build-recipe-catalogue.mjs audit /chemin/prive/revues.json /tmp/catalogue-audit.json /chemin/prive/lot-*.zip
node essai-stitch-v7/build-recipe-catalogue.mjs build /chemin/prive/revues.json /tmp/catalogue-candidat /chemin/prive/lot-*.zip
```

`audit` écrit le rapport même en cas de rejet. Un code de retour non nul signale un dossier incomplet, des rejets, une revue manquante ou des quotas insuffisants. `build` exige les quotas exacts, une réussite technique globale et la revue de chaque ZIP. L’entrée `batches[sha256DuZip]` du fichier de revue s’applique aux seuls octets audités. Tout ZIP remplacé reçoit une nouvelle empreinte. Le dossier de sortie doit être neuf.

| Entrée du fichier de revue privé | Ce qu’elle documente |
|---|---|
| `rights` | Droit de publication publique et absence de données privées dans le ZIP complet |
| `samples[importKey]` | Fidélité des images au texte, absence de planche, cohérence culinaire et visuelle sur les fiches de l’échantillon |
| `anomalies[importKey]` | Correction ou justification constatée pour les anomalies de poids ou de résolution de cette fiche |
| `diet` | Contrôle diététique du lot en privé, avec le référentiel individuel en vigueur |
| `tm5[importKey]` | Réglages et étapes de cette adaptation effectivement contrôlés, avec `date` au format ISO |

Chaque entrée attestée contient `status: "PASS"` et une référence `evidence` vers la preuve. Un lot de cinq recettes ou moins est revu entièrement. Au-delà, l’outil sélectionne au moins 10 % de chaque catégorie et collection présentes, par empreinte stable, puis indique les anomalies à revoir en priorité. Les variantes TM5 sont vérifiées explicitement avant publication. Une anomalie systémique reste un refus du lot tant qu’elle n’est pas résolue. Le code conserve la distinction entre réussite technique, échantillons revus et contrôles sémantiques absents. La diététique ne fait l’objet d’aucune certification automatique. Les attestations, les règles privées et leurs valeurs restent hors du registre de diffusion.

Les champs éditoriaux `catalogue` sont `collection` (`classic`, `diet`), `course` (`starter`, `main`, `dessert`), `description`, `difficulty` (`facile`, `intermediaire`, `avancee`), `tags` et `allergens`. Chaque ingrédient porte `id`, `canonicalId`, quantité, unité et `optional`. L’outil journalise les doublons exacts. L’échantillonnage identifie les variantes sémantiques répétitives, les incohérences d’allergènes ou de continuité visuelle et les risques culinaires qui demandent une revue. Les ZIP et les recettes éditoriales réels restent attendus dans ce chantier.

## Budget et confidentialité

- **Catalogue**. Fichiers WebP statiques, adressés par empreinte. Le navigateur ne demande que l’illustration de l’étape active en Mode Cuisine. Ces fichiers n’entrent pas dans le stockage Supabase. Le registre livré reste vide hors recettes de référence historiques. Les ZIP bruts ne sont jamais copiés dans le dossier compilé.
- **Recettes personnelles**. Le navigateur décode et réencode avant IndexedDB et avant transfert, y compris en ajout/édition. Couverture jusqu’à 960 px, cible haute 45 Kio. Étape jusqu’à 768 px, cible haute 30 Kio. La qualité et les dimensions sont réduites par paliers sans agrandir la source. Un WebP jusqu’à 128 Kio reste recevable pour la lisibilité, signalé au-dessus de la cible. Une conversion indisponible ou un fichier hors plafond bloque les nouveaux médias. Les ZIP sources et photos historiques restent conservés localement, hors transfert, pour respecter les archives existantes.
- **Partage**. Le writer et la révision Recettes restent la référence. `03-images-recettes.sql` est une proposition locale qui limite les entrées de la table privée à 128 Kio par WebP et 64 Mio d’octets médias par foyer. Le verrou de foyer sérialise les insertions. Un rejeu exact ne consomme pas de quota. Le parent peut préparer la photo, et tout membre canonique actif ne peut la lire qu’une fois la référence exacte publiée dans la révision Recettes du foyer. Les erreurs conservent la version locale en attente et laissent les autres modules se synchroniser. Un serveur antérieur au service médias continue à partager le texte.
- **Octets préparés**. Un blob désigné dans aucun instantané Recettes n’est pas servi. Il compte dans le plafond. Le bilan SQL en lecture seule permet d’identifier les octets préparés. Le nettoyage automatique est différé pour protéger disponibilités hors ligne, reprises, anciennes références et historiques. Aucun blob privé ne peut devenir un asset du catalogue par ce parcours.
- **Coût**. Au budget de travail 40 Kio + 10 × 25 Kio, les médias du catalogue représentent environ 113 Mio pour 400 fiches, hors TM5. 64 Mio couvriraient environ 225 jeux d’images de ce poids pour un foyer. Il s’agit du seul budget de blobs. Le plafond JSON natif, les index, les photos non référencées et l’usage réel de la base restent à mesurer. Supabase mentionne un quota gratuit de base de 500 MB et un quota Storage séparé de 1 GB. Le bucket privé existant offre plus de marge pour les fichiers, mais déplacer les photos demanderait de nouvelles politiques et la coordination entre objets, révisions et nettoyage. Conserver d’abord la table privée existante, bornée et dédupliquée. [Base](https://supabase.com/docs/guides/platform/database-size) · [Quota Storage](https://supabase.com/docs/guides/storage/pricing) · [Buckets privés](https://supabase.com/docs/guides/storage/buckets/fundamentals)

## Matrice de vérification

| Exigence | Preuve |
|---|---|
| 6/6 et 12/12 étapes, couverture distincte, TM5 indépendant | `tests/catalogue-lot3.test.mjs`, `tests/catalogue-lot3-steps-ui.cjs`. SHA de chaque image affichée comparé à sa référence après import natif. Captures 320, 390 et 1440 px. |
| Quotas, provenance, refus d’absence et de répétition, approbations absentes | Tests de l’audit. Rapport JSON avec PASS/FAIL/SKIP, fichiers, empreintes, tailles et échantillons. |
| Règles ZIP et compatibilité d’archives | Tests existants E07.3 et E07.4. Le ZIP local original reste comparé octet par octet. |
| WebP et confidentialité entre appareils | `tests/catalogue-lot3-ui.cjs` et `test-postgres.py`. Révision native, refus enfant/inactif/autre foyer, lecture membre, budget et rejeu. |
| Régression Missions/Runes et recherche | Suite native et vérification séparée sur le résultat de combinaison du sommet #45. |
| Recette réelle, fidélité des images éditoriales, droits et diététique | SKIP dans ces preuves fictives. Aucun compte réel, quota hébergé mesuré, publication ou migration hébergée. |

Le test industriel mesure les images synthétiques en entrée et en sortie. Ses nombres permettent de reproduire la vérification des budgets. Ils ne prédisent pas la lisibilité ni le coût des vraies photos.
