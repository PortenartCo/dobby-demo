# DOBBY V7 Maison — Contrat de transport IA proposé `dobby-equipment` v1

Ce document définit **le format fonctionnel à implémenter** par Codex, compatible avec la pratique `dobby-recipes` / `dobby-contracts` sans réutiliser leurs identifiants de format. Les noms de clés ci-dessous constituent la base normative du paquet. Si le code natif rend une adaptation nécessaire, Codex doit modifier de manière coordonnée **le schéma, le prompt IA, l'exemple et les tests** avec un motif explicite. Aucun fichier de ce paquet n'est une migration SQL.

## Archive

- Format ZIP simple, fichier d'entrée UTF-8 nommé **`equipments.json`** à la racine.
- Dossier facultatif `documents/` pour les PDF, factures, photographies et notices *réellement fournis*.
- ZIP possible sans documents, si seuls leurs liens officiels sont disponibles.
- Fallback : le même `equipments.json` seul doit pouvoir être importé.
- Les fichiers et images n'existent que si leur présence est vérifiable ; ne pas créer de PDF vide ou fictif.
- Les noms relatifs sont sûrs (sans `..`, backslash, chemin absolu, lien symbolique ou doublon normalisé). Les types et tailles admissibles sont contrôlés réellement, pas seulement par extension.
- Par défaut, réutiliser et adapter avec prudence les limites bornées de l'import Recettes et du stockage natif ; documenter les limites retenues et les cas refusés. Aucune explosion mémoire ou extraction filesystem arbitraire.

## JSON (version initiale)

```json
{
  "format": "dobby-equipment",
  "version": 1,
  "equipment": [
    {
      "importKey": "stable-key-uniquement-pour-cette-source",
      "name": "Nom lisible",
      "category": "Chauffage",
      "brand": null,
      "model": null,
      "serialNumber": null,
      "manufacturerReference": null,
      "place": null,
      "purchase": {
        "date": null,
        "amount": null,
        "currency": null,
        "seller": null,
        "invoiceReference": null
      },
      "warranty": {
        "endDate": null,
        "details": null
      },
      "maintenancePlans": [
        {
          "importKey": "stable-plan-key",
          "title": "Nom du type d'entretien",
          "interval": { "value": 12, "unit": "months" },
          "lastKnownDate": null,
          "nextDateOverride": null,
          "overrideReason": null,
          "usualProvider": null,
          "notes": null,
          "sourceRefs": []
        }
      ],
      "documents": [
        {
          "id": "doc1",
          "kind": "manual",
          "title": "Notice fabricant",
          "path": null,
          "url": null,
          "official": null,
          "sourceRefs": []
        }
      ],
      "sources": [],
      "notes": null,
      "missing": [],
      "uncertain": []
    }
  ]
}
```

Les chaînes inconnues doivent être `null` plutôt que des faux intitulés. `maintenancePlans` et `documents` peuvent être des listes vides. Pour un document URL seulement, `path: null` et `url` réelle ; pour un document joint, `path` sûr et `url` facultative. Une date suit `YYYY-MM-DD` et est validée calendrièrement. Montants : nombre décimal fini non négatif ou `null`, monnaie ISO 4217 quand connue ; aucune conversion de devise inventée.

## Provenance et incertitude

Chaque entrée `sources` peut inclure :

```json
{
  "id": "source1",
  "origin": "user_invoice",
  "title": "Facture fournie par l'utilisateur",
  "path": "documents/facture-achat.pdf",
  "url": null,
  "page": 1,
  "retrievedAt": null,
  "note": "Référence vérifiée sur la page 1"
}
```

`origin` peut être `user_invoice`, `user_photo`, `user_manual`, `manufacturer`, `official_distributor`, `other` ou `unknown`. `sourceRefs` relie les assertions documentaires et les plans d'entretien aux IDs de `sources` ; un plan non sourcé doit rester marqué `uncertain` / `À vérifier`. Ne pas traiter une recommandation commerciale comme une obligation légale.

## Validation et passage au stockage natif

- **ImportKey externe ≠ ID natif.** DOBBY conserve ou crée des IDs canoniques au moment de l'enregistrement autorisé.
- Toujours dédupliquer dans le ZIP puis face aux fiches existantes ; éviter la fusion automatique sur le seul modèle (plusieurs appareils identiques peuvent coexister).
- Les opérations `Ajouter`, `Ignorer`, `Mettre à jour` sont explicites *par entrée*. Pour mise à jour, sélection de la cible et aperçu des champs réellement modifiés.
- La mise à jour n'efface ni historique, ni documents, ni champs additionnels inconnus, ni programmes d'entretien préexistants. Pas de remplacement silencieux d'un document existant par un lien URL.
- Une date `lastKnownDate` importée est **déclarative** et ne génère jamais automatiquement une intervention dans l'historique.
- Une périodicité importée peut être conseillée par la notice, mais doit être montrée pour validation, avec sa provenance ; pas de valeur imposée si non documentée.
- Les documents associés à un équipement ne sont pas automatiquement partagés au foyer si seuls les fichiers locaux sont opérationnels. Ne pas confondre un manifeste ZIP avec une preuve de stockage cloud.
- Rejeter les chemins dangereux, les entrées dupliquées, dates hors calendrier, blobs incohérents, archive tronquée/surcompressée, dépassement de limites et références `sourceRefs` inconnues ; démontrer qu'un refus ne modifie aucune fiche.
- Encadrer l'import par une session/identité de foyer et un état de révision ; si le foyer ou le registre change pendant la préparation, exiger une nouvelle prévisualisation.

## Exemples de sources externes recherchées par l'IA

Pour un produit identifiable par plaque ou facture, l'IA devra chercher le manuel et la fiche technique **du fabricant et de la référence exacte**. Si elle n'a pas accès à Internet, elle doit signaler l'absence de recherche, pas inventer une URL. Si un PDF officiel ne peut pas être livré, seul le lien réel et sa provenance sont consignés. Cette étape est exécutée **hors de DOBBY**, dans l'outil externe choisi par l'utilisateur.
