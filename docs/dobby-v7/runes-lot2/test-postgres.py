"""Offline contracts for participations and rewards on the real V3 SQL chain."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from runpy import run_path
import json

HERE = Path(__file__).parent
fixture = run_path(str(HERE.parent/'runes-lot1/test-postgres.py'))
rpc,sql,op,uid,quote,encode = (fixture[k] for k in ('rpc','sql','op','uid','quote','encode'))

def run(a,b,child,outsider,hh,read,write,snapshot,mission):
    original = read()
    sql((HERE/'02-participations-recompenses.sql').read_text(),installer=True)
    assert read()==original
    assert rpc('dobby_missions_v3_capabilities',a,hh)['runesLot2']==1
    date,today,tomorrow=sql("SELECT concat_ws('|',d-1,d,d+1) FROM (SELECT (clock_timestamp() AT TIME ZONE 'Europe/Brussels')::date AS d)t;").split('|')
    sibling=uid(5)
    sql(f"UPDATE public.dobby_v2_memberships SET active=true WHERE household_id={quote(hh)} AND user_id={quote(sibling)};")

    def action(kind, member='child', actor=a, revision=None, error=None, operation=None, **values):
        return write({'kind':kind,'memberId':member,**values},read()['revision'] if revision is None else revision,actor,operation,error=error)

    def participation(mission_id, actor=a, member='child', kind='submit', **args):
        return action(kind,member,actor,missionId=mission_id,**args)

    def rows():
        return read()['payload']

    def entries(mid,member='child'):
        return [r for r in rows()['missionParticipation'] if r['missionId']==mid and r['memberId']==member]

    def progress(mid,member='child'):
        return entries(mid,member)[-1]

    def amount(mid,member='child'):
        return [row['amount'] for row in rows()['runeCredits'] if row.get('sourceMissionId')==mid and row['memberId']==member]

    today_row=mission('twins',assigneeIds=['child','sibling'],individualRunes=True,approvalRequired=False,due=today)
    review=mission('review',assigneeIds=['child','sibling'],individualRunes=True,approvalRequired=True,due=today)
    expired=mission('missed',assigneeIds=['child','sibling'],individualRunes=True,approvalRequired=True,due=date)
    late_pending=mission('late-pending',assigneeIds=['child'],individualRunes=True,approvalRequired=True,due=date)
    series=mission('everyday',assigneeIds=['child','sibling'],individualRunes=True,due=date,deadlineOffsetDays=0)
    template={k:v for k,v in series.items() if k not in ('id','due','status')}
    series['recurrence']={'version':1,'seriesId':'everyday','rules':[{'from':date,'start':date,
       'frequency':'daily','state':'active','shortMonth':'last-day','weekdays':[],'monthDay':1,'template':template}]}
    snapshot(rows()['manualMissions']+[today_row,review,expired,late_pending,series],read()['revision'])
    # A verified first child's participation must not complete the other child's.
    rev=read()['revision']; operation=op()
    participation('twins',child,revision=rev,operation=operation)
    assert participation('twins',child,revision=rev,operation=operation)['replayed']
    participation('twins',child,error='23514')
    participation('twins',child,'sibling',error='42501')
    assert amount('twins')==[25] and not amount('twins','sibling')
    participation('twins',sibling,'sibling')
    assert amount('twins','sibling')==[25]
    assert write({'kind':'complete','missionId':'twins','participantIds':['child','sibling']},read()['revision'],a,error='23514') is None
    print('PASS plein crédit indépendant par enfant, identifiant stable et refus de la validation groupée historique')

    participation('review',child)
    assert progress('review')['status']=='pending' and not amount('review')
    participation('review',child,kind='approve',error='42501')
    participation('review',b,kind='refuse',note='Recommencer s’il te plaît')
    assert progress('review')['note'].startswith('Recommencer') and not amount('review')
    participation('review',child)
    rev=read()['revision']
    def approve(parent):
        try:
            return participation('review',parent,kind='approve',revision=rev)
        except AssertionError as exc:
            assert '40001' in str(exc)
    with ThreadPoolExecutor(2) as pool:
        assert sum(x is not None for x in pool.map(approve,(a,b)))==1
    assert amount('review')==[25]
    print('PASS soumission, refus, resoumission puis validation concurrente par deux parents')

    participation('missed',child,error='23514')
    participation('missed',child,kind='regularize',error='42501')
    participation('missed',b,kind='regularize',note='Fait pendant le voyage')
    assert progress('missed')['action']=='regularize' and amount('missed')==[25] and not amount('missed','sibling')
    participation('missed',a,kind='regularize',error='23514')
    # Seed a submission with its actual historical date under fixture admin;
    # approval below still runs through the unmodified writer clock and CAS.
    yesterday=progress('review').copy()
    yesterday.update(id=op(),missionId='late-pending',action='submit',status='pending',
          amount=17,date=date+'T15:00:00.000Z',actorMemberId='child')
    yesterday.pop('creditId',None)
    sql(f"""BEGIN; GRANT dobby_socle_writer TO postgres WITH INHERIT FALSE,SET TRUE;
      SET LOCAL ROLE dobby_socle_writer; SET LOCAL request.jwt.claim.sub={quote(a)};
      UPDATE public.dobby_v2_modules SET payload=jsonb_set(payload,'{{missionParticipation}}',payload->'missionParticipation'||{encode([yesterday])})
      WHERE household_id={quote(hh)} AND module='missions'; RESET ROLE; COMMIT;""",installer=True)
    participation('late-pending',a,kind='regularize',error='23514')
    participation('late-pending',a,kind='approve')
    assert amount('late-pending')==[17]
    print('PASS expiration civile, régularisation unique et maintien d’une demande soumise avant échéance')

    projected=write({'kind':'project'},read()['revision'],child)
    occurrence_id='everyday-r'+today.replace('-','')
    assert any(row['id']==occurrence_id for row in projected['module']['payload']['manualMissions'])
    assert write({'kind':'project'},read()['revision'],child)['operation']['changed'] is False
    participation('everyday',a,kind='regularize')
    participation(occurrence_id,child)
    assert amount('everyday')==[25] and amount(occurrence_id)==[25]
    assert write({'kind':'project','today':tomorrow},read()['revision'],child,error='22023') is None
    print('PASS projection serveur sans parent connecté, et crédit séparé pour deux jours réellement traités')

    # Sibling has 25. Threshold 50 must count the bonus, then re-lock if corrected.
    rev=read()['revision']; secret='TEST SORTIE CONFIDENTIELLE'; goal=op()
    action('reward-set','sibling',b,revision=rev,operation=goal,mode='surprise',title=secret,threshold=50)
    assert secret not in json.dumps(read(sibling)) and secret not in json.dumps(read(a))
    sql('SELECT * FROM dobby_socle_private.rune_reward_surprises;',sibling,error='42501')
    action('reward-set','sibling',a,mode='announced',threshold=60,title='Tentative',error='23514')
    action('reward-confirm','sibling',sibling,goalId=goal,error='42501')
    action('reward-confirm','sibling',outsider,goalId=goal,error='42501')
    action('reward-confirm','sibling',a,goalId=goal,error='23514')
    action('bonus','sibling',a,amount=25,reason='Bonus')
    bonus=rows()['runeCredits'][-1]
    assert rows()['runeGoals']['sibling']['unlocked'] and read(a)==read(b)
    action('correction','sibling',b,targetEventId=bonus['eventId'],expectedAmount=25,amount=10,reason='Correction test')
    assert not rows()['runeGoals']['sibling']['unlocked']
    action('reward-confirm','sibling',b,goalId=goal,error='23514')
    action('correction','sibling',b,targetEventId=bonus['eventId'],expectedAmount=10,amount=25,reason='Correction de la correction')
    assert rows()['runeGoals']['sibling']['unlocked']
    rev=read()['revision']; chosen=op()
    action('reward-confirm','sibling',b,revision=rev,operation=chosen,goalId=goal)
    assert action('reward-confirm','sibling',b,revision=rev,operation=chosen,goalId=goal)['replayed']
    action('reward-confirm','sibling',a,goalId=goal,error='23514')
    confirmed=rows()['runeRewards'][-1]; assert confirmed['title']==secret
    action('correction','sibling',a,targetEventId=bonus['eventId'],expectedAmount=25,amount=1,reason='Correction après confirmation')
    assert rows()['runeRewards'][-1]==confirmed
    action('reward-set','sibling',a,mode='announced',threshold=40,title='Trop bas',error='23514')
    action('reward-set','sibling',a,mode='announced',threshold=70,title='Pique-nique')
    assert rows()['runeGoals']['sibling']['title']=='Pique-nique'
    assert read(outsider) is None
    print('PASS secret privatif, bonus, reverrouillage, confirmation unique, immutabilité, seuil suivant et lecture isolée')

if __name__=='__main__':
    fixture['run_fixture'](run)
