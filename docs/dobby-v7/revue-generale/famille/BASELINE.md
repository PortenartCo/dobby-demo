# Family F01–F10 baseline — 2026-11-13

Worktree: `/workspace/dobby-v7-review`, main baseline b327aa5. No remote Supabase access; no deployment in this subtask.

| ID | Reconciliation | Evidence / work required |
|---|---|---|
| F01 | À_CORRIGER | family.js renderSalon renders separate member, agenda, memo sections plus preparations; no accordions. Replace with exactly two exclusive accordions. |
| F02 | À_CORRIGER | renderSalon adds Contacts du foyer; Menu route contacts exists. Remove family duplicate. |
| F03 | À_CORRIGER | Native PREP-01 and event association already exist; presentation separate. Combine agenda + preparations within same family accordion, preserving identifiers/writers. |
| F04 | À_CORRIGER | Salon displays memo previews. Existing family-register.js native memo route supports local/shared data; remove salon and expose Menu Notes du foyer using same memos route. |
| F05 | À_CORRIGER | Combined add action and form category select exists. Split child and pet entry/form. |
| F06 | PARTIEL | Native member policy, E06 engines and magic write facade exist; form has identity, birthday, notes, existing avatar preserved only. Add selectable native avatars and child creation ceremony prompt. |
| F07 | À_CORRIGER | Pet mixed form species optional; no breed, detail currently displays magic + Runes. Suppress pet magic/reward presentation and native magic capability. |
| F08 | BLOQUÉ_BACKEND | No late account attachment API exists. Add disabled honest same-profile access action and manual backend contract; never call fake account creation. |
| F09 | BLOQUÉ_BACKEND | Member frontend policy is fail-closed without verified binding, but current demo policy limits parents' other-parent editing and allows pet magic; no remote RLS proof available. Correct narrow local policy, retain explicit backend validation requirement. |
| F10 | DÉJÀ_VALIDÉ à préserver | Existing native invitation conditional server gate, search/name/nickname/category, birthdays, member detail identity and PREP links. Run regressions after implementation. |

Après inspection approfondie (avant activation F08) : le pack SQL précédent contient déjà la candidate `dobby_v7_bind_existing_member`, mais pas le parcours complet d’invitation ciblée/acceptation tardive. La ligne F08 décrit donc l’absence de parcours activable, pas l’absence absolue de toute primitive SQL. Voir `CONTRAT-SERVEUR.md`.
