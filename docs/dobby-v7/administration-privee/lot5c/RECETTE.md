# Recette après installation future — non exécutée intégralement

Le paquet est **NO-GO** tant que les prévisualisations valides échouent. Les preuves des Lots 1–5B restent historiques ; les lignes ci-dessous sont des critères de recette au SHA/configuration final, sans campagne distante autorisée implicitement.

Utiliser owner et comptes canaris fictifs, deux foyers H1/H2 et fichiers factices, circuit SMTP privé. Les vrais Parents A/B font uniquement l’objet d’une attestation privée de conservation et d’un parcours explicitement autorisé ; aucune suspension/révocation de leurs comptes. L’ouverture de gates enfants réelles exige un accord distinct ; leur recette peut rester confinée à la copie fictive.

| Cas | Résultat exigé / preuve |
| --- | --- |
| Connexion/refresh/recovery | Compte admis actif : contexte canonique stable ; owner reconnu par UUID explicite. Mauvaise session, refresh invalide, expirée ou borne dépassée : refus malgré ancien JWT. Recovery/PKCE et refus d’un lien utilisé sur autre compte conformes au Lot 3. |
| Parent A/B | Mêmes UUID, foyer, memberId, liaisons actives, révisions et contenus famille/Missions, crédits/magie et droits. Aucun nouveau profil/foyer, enrôlement global ou réinvitation B. Comparaison privée avant/après et après restauration. |
| Invitations adultes | Nominative, approbation owner, cible confirmée, bonne génération et échéance. Prévisualisation valide/invalides GET et POST STABLE/READ ONLY. Acceptation atomique et replay ; autre compte/foyer ou ancienne admission refusés. **Chemin valide actuellement BLOQUÉ 25006.** |
| Invitations enfants | Liaison nominative au profil enfant existant, gates fermées par défaut ; sous gates fictives autorisées, prévisualisation et acceptation valides sans changement de session/foyer indu. Autre cible, profil déjà lié, lien expiré ou gates fermées : refus. **Lecture valide actuellement BLOQUÉE 25006.** |
| Livraison | Une opération/CAS, résultat incertain conservé sans renvoi automatique ; reprise explicite. Aucun e-mail externe avant autorisation et preuve de configuration SMTP. |
| Autorisations | Owner admin seul ; non-approuvé/suspendu sans accès métier. Parent/enfant et H2 conservent leurs limites ; aucune lecture de contenus H2 par le writer admin. ACL/defaults et anciennes RPC contrôlés. |
| Création/profil | Profil provisoire → foyer pour compte explicitement approuvé ; quota une fois, idempotence/replay, collision de payload, CAS des révisions et autorisations live. Aucun ancien RPC ne contourne la garde directe V7. |
| Missions | Exécuter graphe complet, droits parent/enfant, crédits/idempotence/révisions et rejet des écritures V3 fermées ; comparer les 12 empreintes. **Impossible intégralement dans la fixture locale publiée : corps privés absents, aucun stub.** |
| Synchronisation | Deux onglets et deux clients, files retenues après perte réseau/suspension, conflits et reprise sans réécriture d’un ancien état. Vérifier family, grocery, documents et Missions avec le client exact. |
| Storage HTTP | Lire/lister/upload/upsert/copier/déplacer/supprimer selon droits familiaux, sans affecter autre bucket/H2. Après suspension : GET authentifié et mutations refusés ; données déjà reçues non révocables. Aucun mock pour cette preuve. |
| Capacités antérieures | Ancien lien download et jeton upload valides, caches CDN/navigateur et extinction selon décision approuvée. Absence de trace ne vaut pas absence de capacité. Aucun vrai lien créé dans la préparation. |
| Suspension/réactivation | Canari uniquement : refus ancien JWT/session dès nouvel accès, concurrence et replay sous garde. Réactivation en deux transactions, finalisation post-commit, nouvelle session après cutoff ; anciennes admissions/générations ne revivent pas. |
| Rollback/restauration | Arrêt admin fonctionnel puis quarantaine sans perte de décision, test des refus maintenus. Restauration physique/OID et octets/configuration cohérents ; aucune réouverture avant recette et réconciliation de sécurité. **Pas de PASS Lot 5C.** |

Conserver les assertions et verdicts expurgés, sans JWT, URL signée, e-mail personnel, chemin de fichier familial ou ligne Auth. Un test qui reproduit un défaut demeure un échec fonctionnel, même si son diagnostic est précis.
