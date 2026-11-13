# Échange DOBBY Contrats, version 1

Le format `dobby-contracts` transporte des métadonnées et, dans un ZIP, les pièces originales disponibles. Sa lecture est locale : les deux modules ne font aucun appel IA, chargement distant, transfert ni écriture. L'aperçu et la confirmation d'importation sont des opérations distinctes. Les identifiants d'échange servent à repérer les doublons ; ils ne constituent jamais une autorisation de modifier un enregistrement ou d'accéder à un fichier familial.

## Manifeste exact

Le JSON est encodé en UTF-8, avec BOM initial facultatif. Le ZIP contient un unique `contracts.json` à sa racine. Le format et la version sont obligatoires. Les clés inconnues sont refusées à tous les niveaux : une extension nécessite une nouvelle version du format.

```json
{
  "format": "dobby-contracts",
  "version": 1,
  "contracts": [
    {
      "id": "contrat-chauffage-2026",
      "title": "Entretien chaudière",
      "provider": "",
      "reference": "",
      "date": null,
      "deadline": null,
      "note": "",
      "contract": {
        "version": 1,
        "type": "maintenance",
        "scope": "house",
        "equipmentIds": [],
        "effectiveDate": null,
        "autoRenewal": "unknown",
        "renewalDuration": {"value": null, "unit": "months"},
        "notice": {"value": null, "unit": "days"},
        "renonDate": null,
        "renonMethod": "",
        "reminders": [90, 30, 7],
        "amount": null,
        "periodicity": "",
        "terminationConditions": "",
        "provenance": [
          {
            "field": "notice",
            "documentId": "original-chauffage-2026",
            "pages": [2],
            "passage": "Passage effectivement lisible dans la source."
          }
        ],
        "uncertainties": ["La clause de préavis est à vérifier."]
      },
      "documents": [
        {
          "id": "original-chauffage-2026",
          "path": "originals/chauffage-2026.pdf",
          "name": "Contrat original.pdf",
          "kind": "contract"
        }
      ]
    }
  ]
}
```

Les informations d'illustration ci-dessus doivent être remplacées par les faits des sources. La présence d'une citation ne suffit pas à valider la clause. Le parseur ne calcule aucune date et ne promet aucune notification.

| Champ | Règle |
| --- | --- |
| `contracts` | De 1 à 150 objets. |
| `id` | Obligatoire, stable et unique dans le lot ; 1 à 120 caractères ASCII, première position lettre ou chiffre, puis lettres, chiffres, `.`, `_`, `-`. |
| `title` | Nom obligatoire, 140 caractères maximum après vérification de longueur initiale, sans troncature. |
| `provider`, `reference` | Textes facultatifs, 240 caractères maximum chacun ; absence ou `null` devient `""`. |
| `date` | Date documentaire connue ; `YYYY-MM-DD` réelle ou `null`. Aucun remplacement par la prise d'effet. |
| `deadline` | Prochaine échéance ; date réelle ou `null`, jamais une date limite de renon implicite. |
| `note` | Texte libre, 10 000 caractères maximum. |
| `contract` | Objet facultatif ; les valeurs absentes reçoivent uniquement les valeurs structurelles ci-dessous. |
| `documents` | Liste facultative, 20 pièces maximum par contrat ; une liste vide signifie qu'aucun original n'est fourni. |

Les dates vides ou absentes deviennent `null`. Les dates sont strictes, sans conversion de fuseau, avec années `0001` à `9999` ; dates impossibles, chaînes de nombres, booléens et tableaux ne sont pas convertis. Les textes sont nettoyés uniquement aux extrémités ; les contrôles ASCII non imprimables sont refusés, sauf tabulation et sauts de ligne dans les textes libres.

## Métadonnées contractuelles

| Champ | Valeurs et inconnues |
| --- | --- |
| `version` | `1`, ou absent pour normalisation en `1`. |
| `type` | Texte extensible, 80 caractères maximum ; valeurs usuelles `maintenance`, `insurance`, `energy`, `subscription`, `other`. Absence : `other`. |
| `scope` | `house` par défaut, ou `equipment`. |
| `equipmentIds` | Identifiants stables d'équipements réellement connus, uniques, même syntaxe que `id` ; 100 maximum. Vide pour `house`, au moins un pour `equipment`. La vérification de leur existence dans le foyer appartient à l'aperçu. |
| `effectiveDate` | Prise d'effet réelle ou `null`. |
| `autoRenewal` | `yes`, `no`, `unknown` ; défaut `unknown`. |
| `renewalDuration` | `{value:null,unit:"months"}` par défaut ; valeur entière sûre strictement positive ou `null`, unité `months` ou `years`. Une valeur connue exige une unité explicitement fournie. |
| `notice` | `{value:null,unit:"days"}` par défaut ; valeur entière sûre positive ou nulle ou `null`, unité `days` ou `months` calendaires. Une valeur connue exige une unité explicitement fournie. |
| `renonDate` | Date limite explicitement indiquée par une source ou `null`. Le calcul à partir de l'échéance et du préavis est distinct. |
| `renonMethod` | Texte des modalités connues, 4 000 caractères maximum. |
| `reminders` | Entiers sûrs positifs ou nuls, sans doublons, 20 maximum ; défaut `[90,30,7]`. Une liste `[]` désactive la proposition de rappels. Les jours sont comptés avant le renon, sans garantir la livraison d'une notification. |
| `amount` | Nombre JSON fini positif ou nul, ou `null`. Le nombre `0` est conservé. Aucun texte numérique ou booléen accepté. |
| `periodicity` | Texte libre, 160 caractères maximum. |
| `terminationConditions` | Conditions particulières fidèles à la source, 10 000 caractères maximum. |
| `provenance` | Liste de 100 citations maximum, voir ci-dessous. |
| `uncertainties` | Liste de 100 textes non vides maximum, chacun limité à 2 000 caractères. |

Une citation ne contient que `field` (texte obligatoire de 120 caractères maximum), `documentId` (identifiant d'une pièce du même contrat ou `null`), `pages` (liste de 100 entiers sûrs strictement positifs et uniques maximum, à partir de 1) et `passage` (texte de 4 000 caractères maximum). Une référence non nulle vers une pièce absente est refusée. Lorsque la source n'est pas joignable, `documentId:null` permet de conserver des numéros de pages et un passage effectivement lus ; l'absence est expliquée dans `uncertainties`.

## Documents et ZIP

Chaque descripteur contient uniquement `id`, `path`, `name` et `kind`. `id` suit la syntaxe ci-dessus ; les identifiants des pièces sont uniques dans tout le lot. `name` est un nom de fichier obligatoire de 240 caractères maximum : un nom seul, sans séparateur, segment caché, caractère de contrôle ni espace aux extrémités. Il possède une extension autorisée qui correspond au type de `path`, sans tenir compte de la casse ; `.jpg` et `.jpeg` sont interchangeables. Un nom sans extension, un nom HTML ou un autre type que celui du chemin est refusé. Cette vérification évite qu'un original PDF soit téléchargé sous une extension interprétable différente. `kind` vaut `contract`, `amendment`, `terms`, `correspondence` ou `other` (défaut). L'original et ses avenants sont des pièces distinctes.

`path` est relatif à la racine du ZIP, commence par `originals/` et finit par `.pdf`, `.jpg`, `.jpeg`, `.png` ou `.webp` (extension insensible à la casse). La normalisation Unicode NFC est commune au JSON et au ZIP. Les chemins sont uniques dans tout le lot, y compris sans tenir compte de la casse. Un document qui couvre plusieurs contrats peut être copié sous plusieurs chemins et identifiants distincts, sans modifier son contenu.

Chaque source du ZIP doit être référencée et chaque pièce référencée doit exister. Le ZIP ne peut contenir aucun autre fichier ; les répertoires explicites `originals/` et ses sous-répertoires sont autorisés. Les chemins absolus, URL, lettres de lecteur, barres obliques inverses, segments `.` ou `..`, segments cachés, contrôles, `%`, `?`, `#`, `:`, séparateurs Unicode ambigus et espaces aux extrémités d'un segment sont refusés. Un fichier ne peut pas également servir de répertoire ; les collisions Unicode/casse des préfixes et les doublons sont refusés.

| Limite | Valeur |
| --- | --- |
| ZIP sélectionné | 40 Mio (`40 * 1024 * 1024` octets) |
| Contenu décompressé total | 80 Mio, manifeste inclus |
| Une pièce originale | 10 Mio |
| Manifeste UTF-8 | 2 Mio |
| Entrées ZIP | 200, répertoires inclus |
| Expansion d'une entrée | Au plus `max(1024, taille_compressée * 100)` octets |
| Image raster | 40 000 000 pixels, 16 000 pixels maximum par côté |

Les tailles et le nombre d'entrées sont contrôlés avant décompression. La décompression en flux est annulée lorsqu'elle dépasse la taille annoncée. La taille finale, le CRC-32, les métadonnées locales/centrales, les régions de données contiguës et les descripteurs de données sont vérifiés. Les ZIP multiparties, ZIP64, chiffrement, méthodes autres que stockage/deflate, noms alternatifs, liens symboliques et fichiers spéciaux/cachés/système sont refusés. Les noms doivent être UTF-8. Les commentaires ZIP standards sont acceptés ; les données ajoutées hors structure sont refusées.

Le type doit correspondre aux octets réels. Les PDF doivent commencer par une signature `%PDF-1.0` à `%PDF-1.7` ou `%PDF-2.0`, et se terminer par `%%EOF` et éventuellement des espaces ASCII. Les dimensions des PNG, JPEG et WebP sont lues dans leurs en-têtes avant toute allocation de bitmap ; les WebP animés sont refusés. Ces contrôles de transport ne constituent pas une analyse antivirus, une validation juridique ou une validation intégrale du contenu PDF/image. Le lecteur restitue les octets originaux sans les modifier.

## Export JSON seul

Si l'IA ne peut pas produire un véritable ZIP ou joindre les originaux, elle doit l'annoncer et fournir le même manifeste avec `documents:[]`. Les citations gardent `documentId:null` et les absences sont précisées dans `uncertainties`. Le JSON ne contient ni base64, ni lien fictif, ni référence à un stockage DOBBY. Le parseur JSON ne télécharge jamais un chemin : la vérification des fichiers manquants s'effectue uniquement lorsqu'un ZIP est lu. Un manifeste qui conserve des descripteurs sans sources doit être présenté comme tel dans l'aperçu et ne doit pas annoncer des pièces importées.

## API et intégration

```js
import {externalPrompt, parseContractManifest, CONTRACT_FORMAT_LIMITS}
  from './contracts-import-format.mjs';
import {readContractZip, inspectContractFile, safeContractPath, CONTRACT_ZIP_LIMITS}
  from './contracts-import-zip.mjs';

const manifest = parseContractManifest(jsonTextOrObject);
// => {format:'dobby-contracts', version:1, contracts:[…]}

const {manifest: zippedManifest, files} = await readContractZip(zipBytes);
// files: Map<path, {bytes:Uint8Array, type:string, name:string, size:number}>
// Le manifeste n'est pas présent dans files.

const {type} = inspectContractFile('original.pdf', bytes);
```

`readContractZip` accepte un `Uint8Array` ou `ArrayBuffer`. L'option `{inflate(compressed, expectedSize)}` sert aux tests et aux environnements qui fournissent leur propre décompresseur ; elle peut retourner des octets ou un `ReadableStream`. Le navigateur utilise normalement `DecompressionStream('deflate-raw')`. Si ce mécanisme est absent, les entrées stockées et l'import JSON restent disponibles ; un ZIP deflate donne une erreur explicite.

Le code appelant vérifie `File.size` **avant** `arrayBuffer()` ou `text()`. Il conserve les octets et les descripteurs uniquement pour l'aperçu. Il ne transmet au writer natif que les champs contractuels validés, après corrections et confirmation ; `documents` et `path` ne sont pas des pièces jointes natives. Les fichiers sont ajoutés par l'API native de pièces, avec de nouveaux identifiants locaux. `key`, `cloudPath`, `cloudName`, `cloudType`, `cloudSize`, `attachments` et toute clé de stockage sont interdits dans l'échange.

Les choix ajouter/ignorer/mettre à jour restent explicites. Une mise à jour utilise l'identité de foyer et l'état de l'enregistrement contrôlés par le writer ; elle conserve les métadonnées inconnues et pièces existantes, même si elles ne sont pas représentées par cette version du format. Le chargement réussi d'un ZIP ne confirme ni importation, ni partage familial, ni téléversement.

Vérification ciblée : `node --test essai-stitch-v7/tests/contracts-import.test.mjs`.
