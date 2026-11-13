# DOBBY V7 — baseline Missions M01-M09

Base inspected: b327aa5194b5f5897f4354e13266059815722eaa, isolated worktree `/workspace/dobby-v7-review`; normative 00, 01, 02 read in order. No Supabase access performed or planned.

Native authority: `essai-stitch-v5-famille/family-missions.js`, `family-missions-core.mjs`, `family-runes-core.mjs`; V7 adapter: `essai-stitch-v7/tools-register.js` and E03 renderer in `bridge.js`. Architecture read: `docs/dobby-v7/stitch19-20/ARCHITECTURE.md`; native module README read. No AGENTS.md found by rg.

|ID|Baseline|Evidence and retained behavior|
|--|--|--|
|M01|À_CORRIGER|V7 has three numbered sections but renders them all at once; native form is one long form. Draft infrastructure exists in register renderer. Writer runs only at final submit.|
|M02|DÉJÀ_VALIDÉ local existing tests|V7 submit uses existing `fmsForm` writer then `goMissions()` only when native layer closes. Retain and cover wizard final path.|
|M03|À_CORRIGER|Presets 10/25/50 exist and custom integer/zero validation exists; V7 injects explicit Personnalisée radio and does not empty custom on preset.|
|M04|À_CORRIGER|Date uses Aujourd’hui/Demain/Week-end/Date précise, calendar always visible. No default no-deadline button.|
|M05|À_CORRIGER|createdAt separate already; recurrence uses due as occurrence identity and needs compatibility preservation; remove Week-end and visible almanac.|
|M06|À_CORRIGER|Single assignee radio sourced from native st.familyMembers. No multi/family assignment. Preserve missing historic ID, never fabricate household members.|
|M07|NON_RÉALISÉ|Single assigned member gets total reward immediately on native toggle; no actual participant prompt or split.|
|M08|BLOQUÉ_BACKEND + À_CORRIGER local|V1/V2 append-only grants/reversals and occurrence IDs preserve idempotence locally. New allocation contract is absent server-side and must remain gated for shared operations. Child permissions not remotely validated.|
|M09|À_CORRIGER|Need static thin gold border for urgent cards, separate overdue label, completed normal. Existing E03 renderer is source for UI integration.|

Plan: preserve V1/V2 writers/data and extend a V3 atomic allocation event for local completions, with explicit shared backend gate. Shared V3 and new child permissions remain ATTENTE_UTILISATEUR until manual SQL + real account recipe. Tests are local/fixtures only and cannot certify remote permissions.
