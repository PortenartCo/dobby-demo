# DOBBY V7 — Revue Menu isolée

Entrée : `index.html`, puis `essai-stitch-v7/famille.html?client=A#menu` ou `?client=B#menu`. Le Menu utilise les pages, formulaires et writers natifs de la candidate. Les données fictives Famille et les clients A/B proviennent du constructeur Famille inchangé. Les autorisations de démonstration ne représentent aucune association de compte vérifiée par un serveur.

Le backend simulé, son verrou, les stockages A/B et la réinitialisation utilisent un espace Menu distinct des aperçus Famille et global publiés. Le transport conserve exactement le code hérité, à la substitution de cet espace près. Les anciennes démonstrations ne sont pas modifiées.

Aucun compte réel, connexion à Supabase, migration SQL, invitation réelle ni appel IA payant. La politique CSP bloque les connexions externes. HTTPS ou localhost, IndexedDB et Web Locks sont nécessaires à la simulation A/B. Chaque construction exige des sources commises et un nouveau répertoire ; `--allow-dirty` est réservé aux preuves locales. Le manifeste consigne la comparaison source, les constructeurs hérités, les transformations et les empreintes SHA-256 de chaque ressource.
