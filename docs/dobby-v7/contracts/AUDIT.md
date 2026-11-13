# Audit ciblé — Contrats & Assurances

Base vérifiée au démarrage : `b77cb9de100a864c8aace8fb9e07053220ccd23a` sur `origin/main`. Checkout source `/workspace/dobby-demo`, worktree indépendant `/workspace/dobby-contracts`, branche `feat/dobby-v7-contracts-20261113`. Aucun AGENTS.md dans ce dépôt.

Le registre V7 s'appuie sur `DobbyRegister`, la façade `DobbyFamilyStitchEngine` et le moteur V5 natif dans son iframe. Les fiches restent dans `st.familyDocs` : Archives et Contrats lisent les mêmes enregistrements. Les équipements proviennent de `st.houseItems` ; aucun second catalogue.

Le writer familial `family-modules.js` sérialisait une whitelist des champs anciens et une seule référence cloud. L'application du payload distant remplaçait les données en conservant seulement la copie locale ancienne. Cette livraison étend le même writer : métadonnées JSON extensibles, marqueur `contractsVersion:1`, fusion compatible avec les anciens pairs et conservation des références locales sans les publier. Le nouveau helper natif utilise le même `save()`, `houseStore` et `houseRead` ; aucun moteur de stockage supplémentaire.

Les fichiers partagés utilisent exclusivement le `storageFetch` et le bucket privé existants. L'ajout reste local ; le transfert au foyer est une action distincte. Aucune politique, table, RPC ni migration distante n'est modifiée. Le document partagé ancien et la copie locale ancienne peuvent être différents : leurs descripteurs sont distingués.

L'échéancier est calculé à partir des dates et clauses enregistrées. Les mois calendaires sont soustraits avec bornage au dernier jour du mois cible. Le module prépare les dates des rappels, sans prétendre délivrer des notifications ni valider juridiquement un renon.

Le parcours IA échange des fichiers explicitement choisis sur l'appareil. Aucune clé IA, aucun appel automatique à un fournisseur IA, aucun téléversement silencieux. Les ZIP sont lus en mémoire avec bornes, contrôle des chemins/CRC/types réels et associations sources explicites.

## Chantier parallèle

PR #11 observée ouverte : `feat/dobby-v7-reserves-techniques-20261113`, SHA initialement observé `6f0eac584ada10160be9e14e464e0200de3cbfda`. Elle concerne notamment les rôles, Missions/Runes et réserves serveur. Nos changements communs se limitent au workflow CI, à une condition d'affichage `family.js` et à une ligne du writer documentaire ancien dans l'index natif. Aucun de ses changements n'est incorporé de force ; état de main à revérifier avant fusion. Aucun changement ici dans family-core, family-v2, family-access, family-runes, family-engine ou le schéma.

## Portée des preuves

Les essais natifs utilisent le vrai localStorage et IndexedDB du navigateur avec données fictives. Les tests de synchronisation/Storage utilisent des fixtures HTTP explicitement nommées et des tests du writer. Ils ne prouvent pas les permissions du Supabase réel ni une consultation à deux comptes réels. Aucun compte familial de recette n'a été fourni à cette session. Aucun accès distant authentifié n'est revendiqué.

Comparaison ciblée avant intégration : PR #11 reste ouverte au SHA `6f0eac584ada10160be9e14e464e0200de3cbfda`. Ses hunks communs sont distincts : index natif ligne1701 contre notre import documentaire ligne1198 ; politique enfant family.js lignes24–39 contre notre condition de présentation ligne65 ; workflow lignes258/290 contre notre ajout de recette autonome. Aucun code de cette PR n’est fusionné ; main sera rechargé avant merge.
