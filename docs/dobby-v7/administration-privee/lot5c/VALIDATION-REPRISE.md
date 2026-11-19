# Lot 5C — Validation de la reprise

19 novembre 2026 · PR #34 en brouillon · base `9a815b4734316312938a9bd28a0e329b5a7ecb6f`.

| État | Résultat |
| --- | --- |
| **VALIDÉ LOCAL** | Deux restaurations PostgreSQL 17.7 réussies sur clusters neufs. Les empreintes correspondent pour 19 tables avant installation et 29 tables après assemblage fermé. Comparaison des UUID, liaisons, données, rôles/grantors, fonctions, ACL et RLS. Export puis réimport HTTP de deux fichiers dans une seconde instance Storage, vérifiés par SHA-256, chemin, propriétaire, type MIME et droits. [Procédure](RESTAURATION.md) |
| **VÉRIFIÉ HÉBERGÉ EN LECTURE SEULE** | D’après le relevé communiqué pour `pqcdkrwljgvgagzwrcmg` sur PostgreSQL 17.11, les 12 fonctions Missions sont présentes et leurs 12 empreintes correspondent. Elles appartiennent à `postgres` et aucun EXECUTE direct n’est accordé à `anon` ou `authenticated`. Les colonnes et droits de lecture de l’installateur Auth sont présents sous RLS. Bucket familial privé, huit policies et helpers Storage présents. Aucun schéma d’administration ni Edge Function installés. |
| **À TESTER APRÈS INSTALLATION** | Visibilité effective du bridge avec canari positif et négatif, Missions V2 avec sessions réelles fictives et gate client V3 fermé, conservation privée A/B et recette intégrée Auth, invitations, Storage et synchronisation. [Recette Missions](MISSIONS.md) · [Recette intégrée](RECETTE.md) |
| **BLOQUÉ** | Le projet Free doit disposer d’une voie vérifiable de restauration sous ses permissions réelles. Après un restore logique post-installation, les deux journaux conservent leurs OID d’origine et les contrôles refusent la cible recréée. La remise en service dans cet état est bloquée. Les entrées écrivantes distribuées restent des sentinelles. [Ordre de bascule](PROCEDURE.md) |

L’exercice PostgreSQL et la réimportation Storage sont deux essais distincts. Le premier sauvegarde le catalogue, les données Auth fictives et les métadonnées du modèle SQL. Le second utilise l’API Storage réelle et reconstruit les objets dans une cible vide, sans rejouer leurs lignes SQL. Les corps Missions privés restent absents du modèle d’assemblage local. L’assemblage passe ses 14 tests ciblés et le préflight complet exige toujours les références Missions. Les échecs du montage de restauration lors du même passage ont été corrigés et les deux restaurations ont été rejouées séparément. [Résultats et empreintes](RESULTATS-REPRISE.json)

L’essai avec un autre compte de restauration a rencontré un refus de rejouer un grantor. La reprise locale utilise le même administrateur PostgreSQL fictif, déjà créé par initdb. Le test omet sa seule instruction `CREATE ROLE` redondante et compare les grantors, options et attributs restaurés. Il compare également les ACL par défaut avec leur valeur effective et utilise la représentation canonique des contraintes pour écarter un écart de parenthèses au réimport. Les OID des journaux et leurs empreintes sont vérifiés séparément, sans modification.

Avant une bascule, trois conditions restent à satisfaire.

1. Préparer et vérifier le **point de reprise réel d’avant installation**, avec droits d’importation, schémas gérés et personnalisations, données Auth, octets et configuration Storage, manifeste privé A/B. Si la cible réelle exige la reprise d’un état post-installation avec de nouveaux OID, la procédure de réattestation ou de reprise à catalogue préservé reste à établir.
2. Valider le **préflight du paquet exact**, les permissions de maintenance effectives, le traitement des anciennes capacités signées/cache et le choix sur les sessions existantes. Autoriser séparément l’installation fermée et la recette.
3. Exécuter la **recette avec canaris**, dont Missions et la visibilité positive de l’Auth sous RLS, puis comparer A/B et les résultats de restauration avant toute ouverture. Le flag V3 est un gate de publication côté client. Les RPC conservent leurs propres contrôles serveur.

**Verdict de bascule NO-GO.** Les corrections de lecture V7 et Lot 3 ainsi que les migrations historiques sont préservées. Les relevés hébergés sont repris avec leur provenance, sans nouvelle connexion projet. Cette livraison est limitée aux tests de restauration et d’assemblage ainsi qu’au dossier de reprise.
