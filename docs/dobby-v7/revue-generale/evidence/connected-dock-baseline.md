# Connected ceremony dock follow-up baseline

HEAD c7b20d0; task check performed before source edits. Root found an untested N01 route gap after initial transversal commit f18a656. Initial N01 acceptance covered main module routes but not legacy connected ceremony routes.

Source evidence: chrome.mount returned early after DobbyOnboarding.chrome(); onboarding.chrome() set body>nav.hidden=true; onboarding.css hid .e06-active>nav; ritual.css additionally hid ritual nav. Custom ceremony header and ritual embedded preferences are intentional and must stay; dock exclusion conflicts with literal N01, whose only exception is preconnection.

New tests/v7-connected-ceremony-dock.cjs failed before edits exactly on `connected dock visible house` (actual false). No backend/network operations beyond localhost. Fix scope: separate shared dock from custom header mounting, remove connected CSS/hidden exclusion, reserve dock bottom safe area, await pending native onboarding operation before leaving via dock. Auth access CSS remains hidden.
