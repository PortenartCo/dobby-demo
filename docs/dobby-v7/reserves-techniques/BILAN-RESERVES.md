# DOBBY V7 — bilan ciblé des réserves techniques

## Acquis et périmètre

Reprise depuis `main b77cb9d`, dans le worktree indépendant `/workspace/dobby-v7-review`, branche `feat/dobby-v7-reserves-techniques-20261113`. Le parcours B déconnexion/reconnexion/Cheminette/Maison/Patronus est **validé par l’utilisateur**. Stitch 19/20 est clos ; aucune répétition de cette recette, réinitialisation de compte ou réimplémentation des cérémonies. Le snapshot historique de livraison 50/4/6 est conservé ; ce bilan suit uniquement les réserves.

Aucun accès au projet Supabase distant, ni lecture, ni écriture, Auth, Storage ou migration. Les tests serveur utilisent PostgreSQL standard 17.7 fictif, sans réseau, sans port et sans montage hôte. Les anciens installateurs Stitch `01`, `04`, `06`, `11` n’ont pas été exécutés. Les deux comptes Auth, le foyer, les profils, les choix magiques et les données existantes sont conservés.

## Travaux indépendants réalisés

| Réserve | Travail réalisé et vérifiable | Limite réelle conservée |
|---|---|---|
| Diagnostic serveur commun | [Un SQL unique](serveur/00-diagnostic-regroupe.sql), métadonnées et sources ciblées, transaction READ ONLY/REPEATABLE READ avec délais et ROLLBACK ; absence/permissions refusées explicites ; rôles transitifs et policies/triggers Storage génériques inclus. Tests exacts sans lecture de lignes métier. | Le vrai catalogue reste inconnu tant que le JSON manuel n’est pas disponible. La présence d’un objet ne certifie aucun droit ou parcours. |
| Courses C07 | [Faux positif corrigé](COURSES-C07.md) : un CHECK de même nom mais utilisant OR, non validé ou d’un autre type ne peut plus être accepté ou conservé silencieusement par les candidats. Cinq tests nouveaux et régressions locales du candidat passent. | Si le serveur est déjà conforme, **aucune installation**. Sinon, adapter/appliquer manuellement seulement le delta justifié après le diagnostic ; aucune conversion ou suppression de disponibilité. |
| Missions / Runes V3 | [Somme en attente corrigée](MISSIONS-V3.md) : additions et compensations exactes même aux grandes valeurs sûres, format persistant Number inchangé, quatre nouveaux tests. Répartition, occurrences, reçus et writers existants réutilisés. | Writer transactionnel V3 complet et migration/rollback adaptés non livrables sans les vrais guards privés. Attribution partagée, complétion enfant et rétrogradation V1/V2 restent fermées. |
| Parent / Enfant côté client | [Catégorie canonique préservée](FAMILLE-ACCES.md), priorité au profil serveur avec identité cohérente ; valeurs magiques propres bornées ; droits/identité recontrôlés après attente du bearer et avant retry ; flags canEdit/canMagic/canManageDependents explicites respectés. Une vraie session Auth ne passe plus pour un usage local lorsque son contexte est vide ou discordant. | Ces gardes clientes ne prouvent ni RLS ni RPC réels. Les parents établis conservent leurs opérations existantes ; aucun nouveau droit parent sur un autre profil lié n’est promis. |
| Droits serveur F09 | [Vérificateur du candidat corrigé](DROITS-SERVEUR.md) : neuf policies effectivement conformes, ACL/helper/contexte contrôlés ; littéraux SQL non normalisés à tort. Treize groupes PostgreSQL locaux, refus/cas limites et rollback non destructif. | Le candidat vise seulement les écritures directes authenticated. Il ne couvre pas les writers SECURITY DEFINER avec leurs propres policies, les guards privés Missions, toute la gestion d’autres parents ni l’exception mission enfant. `completeF09=false`. **Aucune pose automatique.** |
| Compte enfant évolutif F08 | [Contrat ciblé réutilisé](../revue-generale/famille/CONTRAT-SERVEUR.md), mêmes member_id et historique requis ; aucune invitation générique de remplacement. | API ciblée restant à développer sur le catalogue exact, puis à installer/vérifier manuellement. Bouton d’accès enfant désactivé. Aucun second profil, aucune promotion par âge. |
| Matériel | [Séance physique minimale](CONTROLES-MATERIELS.md), séparée des essais automatisés et de B. | Micro réel et Safari/iPhone ne peuvent pas être certifiés par un navigateur simulé. |

## Validation et preuves

- [Diagnostic et mode d’emploi](serveur/README.md) : SQL exact testé sur catalogues absent/partiel/fictif ; refus de permission visible ; aucune RPC exécutée ; dump avant/après identique ; aucune ligne de profil/invitation/secret ni source privée tierce exportée. La fixture historique garde explicitement son guard **STUB**, jamais assimilé au vrai code serveur.
- [C07 local](evidence/c07-local-pg17.7.log) et [F09 local](evidence/f09-local-pg17.7.json) : candidats contrôlés sur données fictives, limites des writers privilégiés exposées, aucune certification Supabase. Les runners sont fixés au daemon Docker Unix local ; ils n’acceptent pas d’hôte de base distant.
- [Validation combinée locale](evidence/validation-locale.json) : unités, navigateurs et empreintes de sources du checkpoint. Les tests automatisés vérifient les moteurs/writers natifs, pas les droits du serveur réel.
- Les frontières historiques sont conservées : une seule insertion littérale du rôle canonique dans `v23MemberContext`, inversée avant les preuves Stitch/FAM/T09, et empreintes revues des seuls modules modifiés. Aucun bloc historique n’est ignoré.
- La CI inclut les SQL fictifs isolés et les nouveaux cas client en complément de la campagne existante. Une CI verte ne lève aucun gate serveur.

## Les seules actions manuelles indispensables maintenant

1. **Serveur :** dans le seul projet personnel DOBBY, exécuter une fois le [diagnostic regroupé en lecture seule](serveur/00-diagnostic-regroupe.sql), selon [son README](serveur/README.md), puis transmettre le seul JSON technique `diagnostic_serveur`. Aucun ID de personne à renseigner, aucun ancien préflight ou installateur à enchaîner. Un refus de permission reste une erreur à analyser ; ne pas accorder de droits pour forcer la collecte.
2. **Matériel :** effectuer une seule [séance micro et Safari/iPhone](CONTROLES-MATERIELS.md), avec un profil déjà autorisé et un message neutre. Si le même iPhone possède la reconnaissance native, il suffit ; sinon, un navigateur compatible est nécessaire en plus pour le micro. Aucun nouveau test B.

**Aucune installation Supabase n’est demandée à cette étape.** Après analyse du JSON, le développement peut préparer les seules migrations réellement nécessaires avec leurs tests et retours arrière. Les installations et leur vérification resteront exclusivement manuelles. Ne pas appliquer les neuf policies provisoires en pensant activer tout F09, ni traiter l’ancienne liaison historique comme une invitation enfant évolutive.

Le [récapitulatif général des actions manuelles](../ACTIONS-MANUELLES-APRES-REVUE.md) pointe vers ce même ordre ; il ne constitue pas une deuxième liste d’opérations à exécuter.
