# Import local des équipements — `dobby-equipment` v1

Le contrat normatif reste [04_CONTRAT_IMPORT_IA.md](spec/04_CONTRAT_IMPORT_IA.md). Le parseur ne lit aucun compte, n'écrit aucune fiche, ne télécharge aucune URL et n'appelle aucune IA. Son format est indépendant de `dobby-contracts` ; le lecteur ZIP a été copié puis adapté sans modifier le code Contrats.

## API

- `parseEquipmentManifest(textOrObject)` dans `essai-stitch-v7/equipment-import-format.mjs` renvoie `{format:'dobby-equipment', version:1, equipment:[...]}` ou lève `EquipmentImportError`.
- `safeEquipmentPath(path)` valide et normalise un chemin relatif Unicode NFC, identique dans le manifeste et l'archive.
- `readEquipmentZip(bytes, {inflate}?)` dans `equipment-import-zip.mjs` renvoie une promesse `{manifest, files}`. `files` est une `Map` des chemins canoniques vers `{bytes:Uint8Array,type,name,size}` ; le JSON et les dossiers n'y figurent pas.
- `inspectEquipmentFile(name,bytes)` renvoie `{type}` après vérification de l'extension, de la signature et, pour les images, de dimensions bornées.
- Limites exportées : `EQUIPMENT_FORMAT_LIMITS` et `EQUIPMENT_ZIP_LIMITS`.

Le lecteur accepte `Uint8Array` et `ArrayBuffer`. La décompression native utilise `DecompressionStream('deflate-raw')` avec lecture bornée ; sans cette capacité, utiliser un ZIP stocké ou un JSON sans pièces jointes. Le paramètre facultatif `inflate(compressedBytes, expectedSize)` peut retourner des octets ou un flux lisible ; il doit employer un décompresseur fiable. Les tailles/CRC des sorties sont contrôlées avant acceptation.

## Structure et normalisation

Le seul manifeste s'appelle **`equipments.json`**, en UTF-8, à la racine. Son tableau est **`equipment`** au singulier. La version est le nombre `1`, pas une chaîne. Les clés inconnues, notamment les références de stockage natif, sont refusées à tous les niveaux.

Les champs suivent exactement le contrat : `importKey`, `name`, `category`, `brand`, `model`, `serialNumber`, `manufacturerReference`, `place`, `purchase`, `warranty`, `maintenancePlans`, `documents`, `sources`, `notes`, `missing`, `uncertain`. Les objets d'achat et de garantie absents sont normalisés avec leurs champs inconnus à `null`. Les textes facultatifs absents, `null` ou blancs deviennent `null` ; aucun faux « NON DISPONIBLE » n'est ajouté. Les listes absentes ou `null` deviennent `[]`. Les textes connus sont nettoyés de leurs espaces périphériques, sans troncature.

`name` et les titres de programmes sont requis (160 caractères maximum). Les identifiants sont stables, de 1 à 120 caractères ASCII, lettres/chiffres/points/tirets/soulignés, commençant par une lettre ou un chiffre. Les `importKey` d'équipements sont uniques dans le lot. Les identifiants de documents et sources, ainsi que les `importKey` des programmes, sont uniques **dans leur équipement** : ils ne sont pas des IDs natifs DOBBY.

Les dates non nulles sont de vraies dates `YYYY-MM-DD` (année 0001 à 9999), avec contrôle des mois et années bissextiles. Les chaînes vides et horodatages ne sont pas des dates. `purchase.amount` est `null` ou un nombre fini non négatif ; zéro est conservé. La monnaie connue est un code ISO 4217 en majuscules ; aucune conversion n'est faite. `official` est strictement `true`, `false` ou `null`.

Chaque équipement a 0 à 100 programmes. Une fréquence inconnue est `{value:null,unit:null}`. Une fréquence connue exige un entier strictement positif et `months` ou `years` ; aucune fréquence par défaut n'est imposée. `lastKnownDate` est déclarative et ne crée pas d'historique. L'échéance explicite, son motif, le prestataire et les notes restent distincts.

## Sources, pièces et incertitudes

Les `sourceRefs` de documents/programmes doivent désigner des `sources[].id` de la même fiche, sans doublon. Les origines acceptées sont `user_invoice`, `user_photo`, `user_manual`, `manufacturer`, `official_distributor`, `other`, `unknown` ; l'absence est `unknown`. `page` est un entier positif ou `null`, `retrievedAt` une date ou `null`.

Une source peut avoir un fichier, une URL, les deux ou une description textuelle (par exemple un fait communiqué oralement). Une source entièrement vide ne fournit aucune provenance exploitable. Un programme sans référence à une source identifiable reçoit dans `equipment.uncertain` : `Programme « titre » : provenance absente — À vérifier.` Le message n'est pas dupliqué si le manifeste normalisé est relu. Ce signal ne valide jamais une obligation légale ou une recommandation.

Les types documentaires sont `purchase_invoice`, `technical_sheet`, `manual`, `installation`, `warranty`, `maintenance_invoice`, `inspection`, `other`. Un document doit avoir un `path` ou une URL HTTP(S) sans identifiants ; une URL seule est valide, avec `path:null`. La validation syntaxique d'une URL ne prouve pas qu'elle a été consultée ou qu'elle est officielle. Aucun téléchargement automatique n'est effectué.

Toutes les pièces jointes sont dans **`documents/`**, avec une extension PDF, PNG, JPEG ou WebP cohérente avec leur signature. Un fichier peut être cité par `documents[].path` **ou uniquement par `sources[].path`** ; il peut servir à plusieurs sources ou équipements sans être copié. Deux documents de la même fiche ne peuvent pas déclarer le même chemin (casse ignorée). Toutes les références doivent correspondre exactement à un fichier de l'archive et toute pièce jointe doit avoir au moins une référence ; pièces manquantes et pièces inutilisées sont refusées.

Le parseur de manifeste seul ne dispose pas d'octets et ne peut vérifier l'existence des pièces. **L'intégration JSON seul doit refuser tout `path` non nul** avant d'ouvrir une session d'enregistrement et demander un ZIP complet. Pour le fallback JSON préparé par l'IA : `path:null`, liens réels conservés, pièces absentes déclarées dans `missing`/`uncertain`.

## Limites et refus

| Élément | Limite |
| --- | --- |
| JSON UTF-8 | 2 Mio = 2 097 152 octets |
| Archive ZIP | 40 Mio = 41 943 040 octets |
| Total décompressé | 80 Mio = 83 886 080 octets |
| Une pièce | 10 Mio = 10 485 760 octets |
| Entrées ZIP, dossiers inclus | 200 |
| Expansion d'une entrée | 100:1, tolérance de 1 024 octets |
| Équipements | 150 |
| Documents par équipement | 20 |
| Programmes et sources par équipement | 100 chacun |
| Références source par document/programme | 100 |
| Messages `missing`/`uncertain` | 100 par liste, signalements automatiques compris |
| Images | 40 mégapixels, 16 000 pixels par côté |

Les notes et détails de garantie sont limités à 10 000 caractères, les messages à 2 000, les URLs à 4 000, le motif d'échéance à 4 000 ; les autres titres/libellés font au plus 160 ou 240 caractères selon le champ.

Les ZIP stockés et deflate sont admis. Sont refusés : archives multiparties, ZIP64, chiffrement, noms alternatifs dans les champs supplémentaires ZIP, liens symboliques/fichiers spéciaux/cachés/système, chemins absolus ou ambigus, traversée, antislash, encodages `%`, caractères de contrôle/invisibles, noms Windows réservés, segments cachés, doublons NFC/casse, collisions fichier/dossier, incohérences entre les répertoires central et local, descripteurs invalides, CRC incorrects, chevauchements, données étrangères ou troncature. Les limites de tailles et de ratio sont contrôlées avant décompression ; les sorties sont également bornées et leur taille/CRC vérifiés après décompression.

Les PDF exigent une signature et un marqueur de fin cohérents ; les images exigent une signature et des en-têtes de dimensions vérifiables. Il s'agit d'une validation de transport, pas d'un antivirus ou d'un décodage exhaustif des contenus. SVG, GIF, HTML, exécutables et WebP animés sont refusés.

## Prompt et exemples

Le texte copiable est `essai-stitch-v7/equipment-import-prompt.txt`. Il conserve intégralement le texte fonctionnel fourni dans [05_PROMPT_IA_EXTERNE.md](spec/05_PROMPT_IA_EXTERNE.md), puis précise les objets, contraintes et limites effectivement appliqués.

[examples/equipments.json](examples/equipments.json) est la copie de l'exemple fictif fourni dans le paquet d'origine, avec les deux programmes illustratifs de 12 et 36 mois ; aucune obligation légale n'en découle. [examples/equipments-url-only.json](examples/equipments-url-only.json) illustre les liens sans pièces jointes. Ses URLs `.invalid` sont des données de test explicitement fictives et ne sont pas des notices réelles.

Vérification locale : `node --test essai-stitch-v7/tests/equipment-import.test.mjs essai-stitch-v7/tests/contracts-import.test.mjs`. Aucun changement du format, du runtime ou des règles de sauvegarde Contrats.
