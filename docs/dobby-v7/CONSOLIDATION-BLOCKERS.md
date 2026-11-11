# Dépendances bloquées — 11 novembre 2026

Ces dépendances ne sont pas déclarées terminées. Les corrections indépendantes sont livrées et vérifiées séparément dans la matrice.

## E04-02 — séries et occurrences natives

Le modèle natif ne contient pas de série : `family-missions-core.mjs/normalizeMission` reconstruit une liste fermée de champs et retire série/récurrence/occurrence. `family-missions.js` reconstruit également les enregistrements à l'enregistrement et borne le registre à 200 missions. Les crédits sont idempotents sur `missionId`, pas sur un couple série/occurrence. `family-modules.js` partage le registre complet avec CAS et résolution de conflit ; le protocole versionné existant concerne les runes, pas les séries.

Une activation CSS ou une génération dans l'adaptateur créerait un moteur parallèle et des risques de perte par un writer ancien. Une réalisation correcte exige : modèle et protocole de séries versionnés, IDs déterministes d'occurrences, génération bornée et déduplication, édition/arrêt avec historique conservé au-delà de 200, compatibilité/refus explicite des anciens writers. Les options restent indisponibles avec explication. Aucun second registre local ni promesse de récurrence fonctionnelle.

[Audit et preuves natifs](evidence/consolidation/e01-e04/README.md). Les comportements Unique, attribution, dates et crédits natifs restent préservés.

## E05-01 et partie blason E06-04 — fichiers officiels autorisés

Aucun fichier identifié comme blason officiel avec autorisation couvrant la republication dans GitHub Pages n'a été trouvé. Les [conditions du site officiel](https://www.harrypotter.com/terms/terms-row), notamment sections3/10, ne constituent pas une autorisation de redistribuer ces visuels. Une URL Google présente dans Stitch ne prouve ni l'authenticité officielle ni le droit de publication.

| Usage | État réel |
|---|---|
| Version familiale privée | Souhait de blasons officiels conservé ; fichiers autorisés pour cet usage à fournir/identifier. Aucune version privée parallèle ni faux blason créé. |
| Aperçu GitHub Pages public | Aucun nouveau blason officiel incorporé faute de droit établi. Les anciens pictogrammes refusés ne sont plus présentés comme conformes ; emplacement neutre explicite. |

Les descriptions, le nom, le thème, les titres non tronqués et le retrait du masque sont réalisés indépendamment ; **l'exigence du grand blason officiel reste bloquée**. [Sources et audit E05](evidence/consolidation/e05/README.md).

## E06-01 — blocage levé par la mission dédiée

La copie exploitable `DOBBY-E06-RITUEL-SOURCE-STITCH.zip` est désormais reçue et conservée avec les quatre fichiers originaux et leurs empreintes. Le Rituel, sa traversée réelle, le passage et la préférence locale réversible sont intégrés. L’URL centrale renvoie du HTML ; une illustration originale adaptée, distincte du média Stitch manquant, est incorporée avec provenance. Les trois autres identifiants bloqués ci-dessus restent inchangés.

[Rapport et preuves E06-01](E06-01-RITUEL.md). L’ancien inventaire « source absente » reste une preuve historique du checkpoint a61a140, pas l’état courant.

## Reports autorisés et limites de preuve

E06-08 : comptes/foyer serveur/invitations/rattachement vérifié/permissions parentales, hors périmètre sans autorisation distincte. E07-01/02/03/09 : calendrier, Grimoire, choisir/fiche/cuisson/TM5 et raccord « vivres manquants » attendent E07.3. Puis Menu, Famille et autres modules dans l'ordre du registre. Leurs besoins exacts restent dans les 95 lignes de la matrice.

Safari/iPhone physique : non testé. Les limites de SpeechRecognition ne permettent pas de garantir une durée de silence universelle ; plusieurs phrases sont conservées tant que le navigateur écoute, une fin naturelle garde le brouillon et propose Reprendre, jamais un envoi automatique. La logique de voix/synthèse est contrôlée avec APIs simulées et les commandes natives réelles ; aucun diagnostic de microphone physique n'est revendiqué.
