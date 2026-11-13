# Réconciliation avec le chantier de finalisation du socle

Contrôle GitHub du 13 novembre 2026, pendant la CI du présent lot. Le contrôle initial confirmait `main b77cb9d` ; pendant la CI, la PR 13 Contrats a été fusionnée dans `main 70c56eb156758d4c0447b8ec8f3fd84e1efeaa22`. Ce nouveau code doit être repris et testé avant notre intégration. La [PR 12](https://github.com/PortenartCo/dobby-demo/pull/12), branche `feat/dobby-v7-family-core-20261113`, est un chantier distinct, **encore non fusionné** au checkpoint `7a8999f47f7478af533f9b81faad0e634a7926b5`. Ses développements ne sont pas comptés comme réalisés par cette mission.

## Éléments déjà fournis ailleurs

Le [compte rendu du catalogue reçu](https://github.com/PortenartCo/dobby-demo/blob/7a8999f47f7478af533f9b81faad0e634a7926b5/docs/dobby-v7/finalisation-socle/CATALOGUE-RECU.md) confirme qu’un diagnostic regroupé réel a déjà été exécuté par l’utilisateur et transmis en privé : PostgreSQL 17.11, colonne Courses initialement absente, treize helpers privés Missions connus, liaison canonique aux profils TEXT et maintenance du writer familial identifiées. Les corps privés restent hors du dépôt et n’ont pas été redemandés.

La [synthèse publique de vérification](https://github.com/PortenartCo/dobby-demo/blob/7a8999f47f7478af533f9b81faad0e634a7926b5/docs/dobby-v7/finalisation-socle/evidence/hosted-installation-summary.json) signale ensuite que l’utilisateur a appliqué son nouveau paquet `10-install-socle.sql` et `11-install-storage.sql`, puis retourné `20-verify-socle.sql`. Elle rapporte 36 définitions conformes au candidat testé, le contrat Courses et cinq policies Storage présents. **Ce sont les résultats rapportés par ce chantier ; cette mission n’a accédé à aucun projet Supabase et ne les a pas revérifiés à distance.** Les numéros de ce nouveau paquet ne désignent pas les anciens scripts Stitch.

## Conséquences pour cette livraison

- **Ne pas exécuter notre diagnostic regroupé par défaut.** Il est conservé, testé et disponible comme outil d’investigation si un manque précis est démontré ; le catalogue déjà reçu doit être réutilisé d’abord.
- **Ne réinstaller ni Courses, ni les policies provisoires de cette revue, ni aucun ancien script Stitch.** Les candidats SQL corrigés ici restent des références techniques, pas une seconde installation à enchaîner au socle.
- La RPC V3, les nouvelles permissions et le rattachement ciblé d’un enfant sont repris par la PR 12. Ne pas réimplémenter ses fonctions ou les compter deux fois. Notre lot apporte les corrections indépendantes du calcul Runes et des gardes clientes natives, leurs tests et les vérificateurs SQL.
- Les flags de preuve serveur et de release cliente du socle restent annoncés fermés. Une vérification de catalogue ne prouve ni Auth réel, ni REST/RPC/Storage réel, ni parcours complet. Leur intégration et leur recette doivent suivre le checkpoint de ce chantier, avec conservation de nos gardes lors de sa réconciliation.
- Les seuls contrôles matériels encore indépendants sont le [micro et Safari/iPhone](CONTROLES-MATERIELS.md). La recette finale B reste acquise ; elle n’est pas à répéter.

## État et suites

Le blocage initial « sources serveur manquantes » est **repris par le chantier du socle**, et non remis à la charge de l’utilisateur par cette mission. Aucune nouvelle action SQL n’est demandée ici. Les essais réels des nouvelles capacités Parent/Enfant/Missions/Storage resteront à organiser après l’intégration du client correspondant et selon ses gates ; aucun succès fonctionnel nouveau n’est annoncé par cette passation.

Avant chaque intégration/publication, le gate vérifie de nouveau `main`, ses CI et Pages, ainsi que les références de la première mission. Le chevauchement de sources avec ce chantier concerne les gardes Famille/Runes, le workflow et la notice manuelle ; il doit conserver ces corrections à sa réconciliation. Une modification concurrente fusionnée impose de réconcilier le nouveau code et ses tests avant de continuer. Cette note décrit les checkpoints observés ; elle n’annonce ni la fusion de PR 12 ni sa recette runtime. La fusion concurrente de PR 13 est conservée dans notre réconciliation, sans attribuer ses développements à ce lot.
