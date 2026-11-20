import test from 'node:test';
import assert from 'node:assert/strict';
import * as runes from '../family-runes-core.mjs';

const date = '2026-11-20T08:00:00.000Z';
const first = {missionId:'mise-en-place', memberId:'child', effort:'regular', amount:25, date, title:'Mettre la table', revision:1};
const bonus = {kind:'bonus', eventId:'rune:11111111-1111-4111-8111-111111111111', memberId:'child', amount:40, reason:'Entraide exceptionnelle', actorMemberId:'parent-a', date, revision:2};
const correction = {kind:'correction', eventId:'rune:22222222-2222-4222-8222-222222222222', memberId:'child', targetEventId:bonus.eventId, amount:15, previousAmount:40, reason:'Montant saisi par erreur', actorMemberId:'parent-b', date, revision:3};

test('les barèmes, le montant personnalisé et les 12 grades restent compatibles', () => {
  assert.deepEqual(runes.EFFORTS.map(({amount}) => amount), [10,25,50]);
  assert.equal(runes.rewardFor({effort:'light',customRunes:73}).amount, 73);
  assert.equal(runes.GRADE_CONFIG.levels.length, 12);
});

test('bonus, correction et seuil utilisent le même capital individuel', () => {
  const before = runes.memberSummary('child', [first,bonus]);
  assert.equal(before.total, 65);
  assert.equal(before.grade.threshold, 50);
  const after = runes.memberSummary('child', [first,bonus,correction]);
  assert.equal(after.total, 40);
  assert.equal(after.grade.threshold, 0);
  assert.deepEqual(after.credits, [first,bonus,correction]);
  assert.equal(runes.memberSummary('another-child', [first,bonus,correction]).total, 0);
});

test('une correction vise une attribution et un bénéficiaire existants au montant attendu', () => {
  for (const change of [{targetEventId:'absent'}, {memberId:'other'}, {amount:-1}, {previousAmount:41}, {reason:'  '}]) {
    assert.throws(() => runes.memberSummary('child', [first,bonus,{...correction,...change}]));
  }
  assert.throws(() => runes.memberSummary('child', [first,bonus,correction,correction]));
});

test('une correction attachée à un gain rouvert reste dans le journal sans modifier le capital', () => {
  const reversal = runes.reopeningRequest({id:first.missionId,status:'done'}, [first], [], date);
  const edit = {...correction, targetEventId:first.missionId, previousAmount:25, amount:35};
  const rows = [first,bonus,edit,{...reversal,revision:4}];
  assert.equal(runes.memberSummary('child', rows).total,40);
  assert.equal(runes.memberSummary('child', rows).credits.length,4);
});
