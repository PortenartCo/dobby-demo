# PASS — scoped member-baseline reset review

Reviewed immutable `/workspace/scratch/stitch-family-baseline-review/family.js`, SHA-256 `8d1ab2260fe774f6a101f195106ccd636ff8ca9ab4144b4442e18812f5090ee1`.

Compared with `/workspace/scratch/stitch19-20-native-review-v2/source/essai-stitch-v7/family.js`. The only source change is line 185: the `member-edit` action also sets `ui.memberBaseline=null` before `open()`. No changes requested.

- The reset removes the cached baseline from the previous new/edit form. For the health-page edit button without `data-person`, `renderMemberEdit()` (line 89) now computes a fresh canonical member baseline when no retained draft exists. This fixes the cached string `'null'` left after member creation and also prevents a previous successful edit's baseline from contaminating a subsequent edit.
- Saved drafts keep priority: `saved?.memberBaseline` still precedes `ui.memberBaseline` and fresh canonical data. `captureDraft()` preserves the mounted form's original baseline (line 153), and the action's subsequent `open()` captures edits before rendering. Clearing the UI cache therefore does not upgrade a retained draft to a newer version.
- The stale-save comparison at line 187 is unchanged and continues to compare the form's baseline with the current full canonical member before calling `E.saveMember`. Draft keys, changed-field restoration, cancellation and successful-save disposal are unchanged (lines 152–155).
- No member identity, household/account context, permission or revision/CAS argument is changed by this line. The existing engine still checks member permissions and binds verified own-profile writes to matching user/member/household context, passing `expectedRevision: bound.familyRevision` (`essai-stitch-v7/family-engine.js`, lines 35–52). This is a diff-impact conclusion; the previously reviewed API/SQL authorization was not re-audited.

Independent targeted browser proof: `node /workspace/scratch/stitch-family-baseline-review/baseline-check.cjs` exited 0; results are in `baseline-check.log`. The browser explicitly received the immutable controller via request interception, used real local V7/native dependencies, isolated browser storage and a fictional native-frame parent persona, and blocked all non-local requests. All four checks passed with no page errors:

1. New child → detail → health → edit without `data-person` uses that child's canonical baseline; rename saves with the same member ID.
2. A live draft retains typed values and its original baseline after a native member change; save is rejected without overwriting current data.
3. Re-entering edit through the changed action retains a saved draft's original baseline despite clearing the UI cache; stale save remains rejected.
4. Browser Back restores saved typed data and its original baseline after a native change; stale save remains rejected and the typed values remain present.

Observed owner campaign evidence: `family-stitch1920-final.log` reports `FAMILY_BASELINE_REENTRY_PASS`, `FAMILY_PATH_PASS` and `FAMILY_MEMBER_PASS` at both 320 px and 390 px. This review does not certify unrelated campaign stages.

Only scratch review/test artifacts were written. No production source edits, staging, commits or remote calls were performed.
