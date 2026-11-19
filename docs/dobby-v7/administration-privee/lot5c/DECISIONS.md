# Décisions avant bascule — aucun changement effectué

Ces décisions reprennent les réserves Lot 5A/5B. Elles ne nécessitent pas une nouvelle architecture et ne sont pas tranchées automatiquement par le paquet.

| Décision | Conditions et conséquence |
| --- | --- |
| Anciennes capacités Storage : extinction naturelle | Geler toutes les émissions, y compris serveurs privilégiés ; prouver dernière émission et TTL maximal effectif des downloads **et uploads**, puis borne des caches et marge. Si un de ces éléments manque, l’extinction n’est pas démontrable. Attendre un TTL supposé ne suffit pas. |
| Invalidation ciblée des objets | Identifier les références et impacts ; une suppression/déplacement coupe les octets à l’origine, avec effet métier et délai CDN. Un ancien jeton d’upload visant un chemin absent peut encore y créer un objet : traiter les uploads séparément. Aucune invalidation effectuée. |
| Rotation/révocation contrôlée de la clé URL | Examiner [URL Signing Keys](https://supabase.com/docs/guides/storage/security/url-signing-keys) et droits disponibles. Effet potentiellement global sur tous les buckets et utilisateurs signés par cette clé ; émission future, révocation et purge/cache à coordonner. Ne pas substituer une rotation des clés Auth. Réactiver une ancienne clé peut réhabiliter des signatures. Aucun support, rotation ou révocation dans ce lot. |
| Caches | [Smart CDN](https://supabase.com/docs/guides/storage/cdn/smart-cdn) et navigateur peuvent conserver une réponse indépendamment du jeton. Une copie déjà téléchargée ne peut pas être retirée. Définir les TTL réellement observés, la purge disponible et un contrôle final sans journaliser les bearer. |
| Sessions existantes A/B | Choisir explicitement conservation des sessions actives existantes ou nouvelle connexion à la bascule. Les gardes contrôlent la session réelle et les bornes, sans confiance dans un ancien claim de statut. Le bootstrap n’invalide ni ne recrée les comptes ; aucune déconnexion des vrais A/B n’est incluse. |
| Sessions des canaris suspendus/réactivés | Appliquer la frontière historique en deux transactions ; vérifier la nouvelle session après finalisation. Une rotation globale de clés JWT ou une suppression globale de sessions n’est pas requise ni autorisée par ce paquet. |
| Permissions Auth hébergées | Vérifier la visibilité existante de l’installateur pour le bridge ; aucune réparation par ADMIN/BYPASSRLS, rôle Auth géré, owner ou policy ajoutée. Si le canari échoue, maintenir flags et service fermés ; pas de contournement ou de support implicite. |

Le choix signé nécessite un GO humain documentant impact, fenêtre, preuve et retour possible. L’indicateur privé `signed_storage_resolved` atteste cette décision ; il ne teste pas des URL, ne purge aucun cache et ne certifie pas l’extinction à lui seul. Aucun inventaire de capacités réelles n’a été consulté ; **aucune absence d’ancien lien n’est affirmée**.
