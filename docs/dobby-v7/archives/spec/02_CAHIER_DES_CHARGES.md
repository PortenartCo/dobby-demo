# Archives & Scriptorium — Spécification fonctionnelle validée

**Date de consolidation : 13/11/2026.** Ce document décrit les décisions de revue. Les exemples ne sont pas des données à injecter.

## A. Rôle et principes

Les Archives constituent une **bibliothèque centrale de l'état « archivé » des objets existants de DOBBY**. Elles ne constituent pas un deuxième système documentaire. Le classement se déclenche **sur la fiche de son module source**, pas depuis la page Archives.

Invariant de conservation : même identifiant canonique, même objet source, mêmes documents liés, mêmes métadonnées et historique. Un archivage/désarchivage ne crée pas une copie et ne supprime pas l'original. La fiche passe de `actif` à `archivé` puis `actif`, grâce au writer propriétaire du module. Les nouvelles et anciennes versions sont conservées et leur compatibilité contrôlée.

## B. Bandeau Stitch 22

- Source approuvée : `assets/Stitch22-screen.png`, image **1376×768**, Dobby dans un scriptorium avec livres et piles de parchemins, grande table de travail ; **ne pas utiliser l'ancien visuel avec horloge**.
- Ne pas reconstruire toute la page à partir de Stitch. Utiliser l'image comme fond/hero, respecter le cadre, les arrondis et le design DOBBY déjà en place. Ne pas changer le design system global à partir de `Stitch22-DESIGN.md`.
- Cartouche exact : « ✦ ARCHIVES & SCRIPTORIUM ✦ » à **l'intérieur du hero, en bas à droite**. Marge sûre sur mobile. Contraste suffisant. Ne pas masquer Dobby et parchemins ; recadrage responsif contenu (320, 390, 768, 1440 px). Pas de double titre flottant hors du bandeau.
- L'en-tête et le dock DOBBY restent visibles conformément aux règles générales.

## C. Recherche

- Un champ unique, pleine largeur utile, avec icône loupe et effacement alignés à l'intérieur du champ.
- Plus aucun chevauchement entre le texte « Registre des fiches enregistrées dans DOBBY » (si conservé, le placer au-dessus avec espace ; possibilité de le remplacer par une courte description adaptée aux **archives**), ni double bordure imbriquée.
- Placeholder : « Rechercher dans les archives… ». Recherche instantanée, insensible à la casse et accents lorsque possible, ciblée aux éléments archivés accessibles ; champs : titre, catégorie/type, nom de module d'origine, référence et métadonnées textuelles autorisées. Ne jamais rendre du contenu privé dans les suggestions/résultats.
- Aucun onglet ou filtre « Toutes / Assurances », ni autre segment inutile. Le filtre fonctionnel actuellement présent est conservé dans son principe, pas dans son ancienne présentation.

## D. Liste des Archives

- Une **seule liste** de fiches réellement archivées, provenant de plusieurs modules, triée de la date d'archivage la plus récente à la plus ancienne (ex aequo stable par ID/source).
- Carte compacte : icône discrète, titre, catégorie/module source, date d'archivage valide, « Consulter » et « Réactiver ». Pas de notation décorative, jargon ni indicateur fictif.
- « Consulter » ouvre **la vraie fiche d'origine** en lecture archivage, avec le statut « Archivé », informations, pièces et historique conservés ; ce n'est pas une copie réhydratée non fiable. Les actions de modification actives doivent respecter les gardes du module.
- « Réactiver » ouvre la confirmation puis restaure l'état actif dans le module d'origine, disparaît de la liste Archives et réapparaît dans le registre actif. Même ID et pièces. La recherche reste utilisable pendant ce cycle.
- Si aucun élément n'est archivé : « Aucun élément archivé pour le moment ». Aucune fiche factice « Assurance habitation », « Ancienne chaudière » ou « Recette familiale » ; ces noms étaient des **exemples** de maquette.
- Si source supprimée ou refus d'accès : afficher erreur contrôlée, ne pas exposer de métadonnées d'un autre foyer.

## E. Archivage : action dans la source

- Action « Archiver » visible sur chaque fiche **réellement archivables** de son module source (pas un bouton générique non fonctionnel dans les Archives).
- Avant mutation : confirmation avec nom de l'objet : « Archiver cet élément ? Il restera conservé dans DOBBY et pourra être réactivé depuis Archives & Scriptorium. » Boutons « Annuler » et « Confirmer l'archivage ».
- Si Annuler, données, historique, état, dates, index et réseau **inchangés**. Pour confirmer, vérifier droits/état/révision source avant commit. Une action concurrente ou refus de sauvegarde ne doit pas produire un succès trompeur.
- Archivage : l'objet disparaît des listes **actives** du module mais reste consultable depuis Archives ; pas de suppression matérielle, de perte de pièces, de second document créé.
- Date d'archivage conservée ; horodatage réel au commit, non inventé à l'import. Enregistre une représentation de statut compatible avec les writers existants et préserve les propriétés inconnues des anciennes versions.
- Un objet déjà archivé ne doit pas être réarchivé par double clic/rejeu. Gestion idempotente.

## F. Réactivation : action dans Archives

- Action « Réactiver » uniquement sur un enregistrement archivé accessible, avec confirmation « Réactiver cet élément ? Il sera de nouveau disponible dans son module d'origine. » Boutons Annuler et Confirmer la réactivation.
- En cas de confirmation : writer source, **même ID**, statut actif, aucun duplicata et aucune suppression de pièce. Afficher ensuite la source/résultat vérifié.
- Réappliquer seulement les calculs issus de données réelles (échéances, affichage) ; ne pas inventer d'entretien, de paiement, d'alerte ou de date future. Si une règle métier bloque la réactivation (par exemple ancien statut irréversible), afficher une explication plutôt que contourner le writer.
- La confirmation protège du clic accidentel ; les droits peuvent aussi bloquer une action même après confirmation.

## G. Modules sources : règle de conception

Les actions « Archiver » sont à intégrer **dans la fiche source**, avec un registre d'adaptateurs entre Archives et les modèles métier réellement présents.

| Source | Comportement attendu | Vigilance |
|---|---|---|
| Contrats & Assurances | Archiver un contrat/assurance ; conserver police, avenants, renon, échéances et PDF | Avertissement : l'archivage ne résilie pas le contrat et n'annule aucune obligation. Respect du partage/lecture seule Enfant, versions. |
| Maison & Équipements | Archiver un appareil ; conserver références, photos/documents existants, entretiens et échéances | Ne pas purger les interventions ni modifier l'équipement en cours de développement sur autre branche. |
| Recettes personnelles | Archiver une recette enregistrée ; la retirer des sélections actives, pas des anciens menus | Conserver les recettes originales et leur provenance, ainsi que plannings/courses liés. Ne pas archiver automatiquement le catalogue général. |
| Contacts et Notes | Archiver les fiches persistées si le modèle le permet sans perte, puis réactiver | Respect des notes locales/partagées et confidentialité ; aucune fusion silencieuse. |
| Autres objets | Étendre aux fiches durables, dotées d'un ID et d'un writer contrôlé, si réactivation réellement possible | Famille/santé, Missions, Runes, paiements, événements révolus, historique d'achats sont des domaines sensibles : ne pas confondre « archivé » avec supprimé, réalisé, terminé ou payé. Documenter chaque exclusion technique. |

Le tableau à fournir au checkpoint C0 doit préciser la couverture de chaque domaine ; **ne jamais afficher un bouton Archiver factice**.

## H. Concurrence, sauvegarde, permissions

- Un seul référentiel par objet : pas de `archiveRecords` stocké comme doublon ni nouveau stockage parallèle. Un agrégat en lecture peut être reconstruit et filtré depuis les données sources.
- Anciennes fiches sans statut = **actives**, sans modification rétroactive. Les documents autonomes existants doivent rester accessibles par un parcours source approprié ; ne pas les déplacer ni les marquer archivés sans consentement.
- La synchronisation ne concerne que les objets **déjà partagés** par leur module : pas de transfert automatique des données locales. Ne pas mettre en fuite des informations sensibles vers l'espace partagé. Les pièces attachées restent dans leur emplacement actuel, dont les buckets privés existants.
- Gardes : ancien pair, rechargement, compte A/B simulés, foyer différent, compte enfant, session perdue, refus réseau, offline, brouillon périmé, conflit de révision, double clic et rejeu.
- Pas de nouveau SQL distant pour satisfaire ce lot ; toute nécessité de migration devra être **rapportée avant action**. Les nouveaux gates Family V3 restent inchangés et fermés.

## I. Suppressions de l'écran Archives, PAS du service

Supprimer sur la page :

- filtres « Toutes » et « Assurances », encadré qui les contient ;
- bloc « Archives » et ses boutons « Ajouter un document », « Importer un fichier », « Contrats & Assurances », « Autre présentation », « Mémos locaux », « Exporter les fiches et mémos (JSON) » ;
- « Importer une sauvegarde de fiches JSON », ligne « Aucun fichier sélectionné » et explication « Export et fusion des métadonnées… » ;
- bloc « Enregistrement et partage », descriptif de la synchronisation et boutons « Gérer le foyer » et « Synchroniser le foyer » ;
- toute étiquette « Initialisation du foyer » ou statut technique parasite dans cette page.

**Ne pas supprimer le service** d'import ZIP/JSON de Contrats, ni la gestion des fichiers, ni les sauvegardes/rétablissements du foyer, ni la synchro Family. L'entrée « Paramètres » reste le lieu des réglages techniques ; s'assurer qu'elle existe et fonctionne.

## J. Hors périmètre et recette globale

- Pas de refonte visuelle de Contacts, Notes, Paramètres, Contrats ou Maison au-delà du point d'entrée « Archiver » et du statut requis.
- Pas de nouvelles photos ni d'IA ; pas de duplicata des recettes et contrats ; pas de notifications automatiques.
- Ne pas refaire la campagne manuelle sur les deux vrais comptes : elle est **regroupée en fin de projet**. Les tests automatisés/fixtures de ce lot sont obligatoires ; la recette réelle différée n'est pas un PASS usurpé.
