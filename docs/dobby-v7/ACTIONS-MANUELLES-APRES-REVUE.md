# DOBBY V7 — opérations manuelles restantes

La recette finale B déconnexion/reconnexion, Cheminette et conservation Maison/Patronus est validée au commit `b77cb9d`. **Ne pas la redemander.** Les deux comptes, le foyer et les données existantes sont conservés.

## Supabase : réutiliser le travail déjà effectué

Le chantier distinct [PR 12](https://github.com/PortenartCo/dobby-demo/pull/12) a reçu le diagnostic réel. Sa description rapporte ensuite l’installation manuelle par l’utilisateur du nouveau socle `10`, de Storage `11` et le retour de vérification `20`. Voir la [passation précise](reserves-techniques/PASSATION-SOCLE-CONCURRENT.md), qui distingue ces résultats rapportés des vérifications réalisées par notre mission.

**Aucun diagnostic, installateur ou ancien préflight supplémentaire n’est demandé maintenant.** Ne pas rejouer le paquet du socle, les anciens Stitch `01/04/06/11`, ni le candidat provisoire `roles-01-apply.sql`. Notre [SQL regroupé](reserves-techniques/serveur/00-diagnostic-regroupe.sql) reste une archive d’investigation testée, à utiliser seulement si un manque technique précis le justifie ultérieurement.

Le diagnostic déjà reçu a permis à l’autre chantier de développer les RPC Missions V3 et l’invitation enfant au même `member_id`, avec renforcement des permissions. Ces fonctions ne sont pas réimplémentées ou comptées deux fois ici. Leur code, leur installation rapportée et leur recette fonctionnelle sont des états distincts : les flags de preuve et de release restent annoncés fermés. Après intégration du client correspondant, suivre sa recette REST/RPC/Storage et Parent/Enfant, sans rejouer la recette B ni transformer son compte en enfant. F08 nécessitera un troisième compte Auth de test confirmé et non lié, conservant les comptes A/B existants. Le catalogue seul ne prouve pas ces parcours.

## Contrôle matériel indépendant

Une seule [séance micro et Safari/iPhone](reserves-techniques/CONTROLES-MATERIELS.md) reste nécessaire : permission tardive/refus, arrêt au relâchement ou à la sortie, saisie et dock accessibles avec clavier, safe areas et portrait/paysage. Un navigateur simulé ne peut pas certifier ces matériels. Aucun compte, foyer ou contenu familial à recréer ; transmettre seulement appareil/navigateur/version et étape réussie ou en anomalie.

## Retours arrière et limites

Les corrections de ce lot sont documentées dans le [bilan ciblé](reserves-techniques/BILAN-RESERVES.md). Aucun accès SQL, API, Auth ou Storage distant n’a été effectué par cette mission. Les tests serveur utilisent uniquement PostgreSQL 17.7 fictif sans réseau ni port ; aucun déploiement applicatif ne lance de migration.

En cas de régression applicative, revenir uniquement à une version testée et contrôler CI/Pages/SHA ; conserver toutes les données locales et partagées, reçus, allocations, profils et disponibilités. Ne pas faire passer un ledger V3 dans V2. Les anciens rollbacks de policies ou de schéma ne sont pas des étapes de clôture et ne doivent pas être appliqués au nouveau socle par analogie ; employer seulement le retour conservateur du paquet exact après analyse de la situation. Toutes les interventions Supabase restent exécutées par l’utilisateur sur le seul projet personnel DOBBY, jamais sur les projets professionnels Portenart.
