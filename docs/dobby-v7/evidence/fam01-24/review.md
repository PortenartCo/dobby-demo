# Revue indépendante et corrections

Relecture en lecture seule par /root/family_review, complétée par les contrôles de chaque lot. Aucun fichier ni service modifié par le relecteur.

Points importants confirmés puis corrigés :

1. Un parent de démonstration pouvait envoyer des identifiants Maison/Patronus et prétendre à une version E06 sans répondre au questionnaire. Le writer exige désormais la capacité éphémère native et recalcule les résultats E06 pour tous les acteurs, parents compris. Tests directs du formulaire couvrant le refus et la confirmation réelle.
2. L’origine Carnet était perdue sur un lien direct/rechargement du formulaire membre et des descendants Grimoire/santé. Le routeur conserve memberOrigin et l’origine immédiate, puis restaure un retour déterministe. Vérification indépendante en navigateur et test fam-detail après rechargement.

Autres contrôles/corrections ciblés : dates historiques conservées jusqu’à correction/effacement explicite ; snapshot du membre attaché au brouillon pour refuser une édition périmée même après actualisation/reprise ; sélection de mois par mois civil avec borne de fin de mois ; provenance des événements conservée.

La revue a signalé l’ancienne possibilité de contourner les droits via les écritures médicales indépendantes. Les handlers natifs locaux et partagés ont été protégés sans copie/migration de leurs données. Le test Chromium direct démontre le contrôle ancien/nouveau titulaire lors d’une réaffectation. Un ancien handler capture masqué par le champ caché name=id a été corrigé au point d’écriture effectif, sans correctif de façade seulement.

Dépendances explicitement jugées : les autorisations serveur et l’association compte/membre ne sont pas disponibles, donc aucune garantie serveur n’est annoncée et les mutations réelles sont refusées. Les interfaces de convives E07 restent un autre contrat ; aucune modification du chantier Cuisine. La publication et la CI distante sont interdites, pas des validations manquantes à entreprendre ici.

Aucun autre problème important identifié dans les adaptateurs Agenda/Mémos après les vérifications de navigation et de snapshots. La relecture et les fixtures ne constituent pas un audit de sécurité du serveur existant.
