# Retour conservateur et reprise — Lot 1

**Aujourd’hui : aucun système distant n’a été modifié.** Aucun rollback Supabase n’est donc à exécuter.

## Développement local

Le runner détruit son seul conteneur fictif à la fin de chaque exécution. Pour reprendre après un échec, corriger la cause puis relancer les [commandes locales](verification.md) ; le prochain essai crée une base neuve. Il ne faut ni réinitialiser un environnement existant, ni rejouer un ancien paquet d’installation familial.

La migration est transactionnelle. Une erreur avant COMMIT annule ses nouveaux objets/grants. L’amorçage est lui aussi transactionnel et refuse le rejeu : un manifeste invalide ne laisse ni propriétaire partiel, ni autorisation ou décision incomplète.

## Après une éventuelle installation future autorisée

- Conserver les autorisations, suspensions, générations et décisions. Ne pas supprimer de comptes/données ni revenir à une approbation implicite de tous les Auth.
- Le Lot 1 ne branche aucun moteur métier et ne modifie aucune policy existante ; il n’y a donc aucun writer familial à restaurer depuis ce lot. Ne pas réinstaller les anciens SQL pour retirer ces fondations.
- Si les droits de session manquent ou disparaissent, le nouveau contrôle refuse l’accès. Préparer la correction minimale des permissions/définitions et sa vérification pour approbation ; aucun remplacement par `RETURN true`, retrait de RLS, élargissement à `postgres` ou désactivation aveugle du garde.
- Si la réactivation est interrompue entre ses deux phases, l’accès reste fermé avec `sessionBoundaryPending=true`. Le propriétaire peut reprendre la finalisation à la même révision dans une transaction distincte ; un rejeu ne déplace pas la borne. Une suspension intervenue depuis rend cette ancienne finalisation non applicable. Ne pas modifier directement le drapeau ou la borne pour débloquer.
- Si le Lot 2 a été installé depuis, ses dépendances et son rollback doivent être examinés ensemble : ne pas retirer le schéma privé ou changer les signatures requises par ses policies/writers. Conserver la suspension sous JWT valide.
- La récupération propriétaire relève d’une maintenance authentifiée et auditée sur son UUID vérifié ; le registre ne propose aucun transfert ou reset public. Les droits de l’infrastructure restent distincts du propriétaire applicatif.

Toute restauration distante de définitions/grants, toute intervention sur Auth et tout déploiement restent soumis à une validation distincte. Il n’existe dans cette branche ni migration inverse destructive, ni commande automatique vers un projet réel.
