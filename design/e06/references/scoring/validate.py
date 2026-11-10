#!/usr/bin/env python3
"""DOBBY E06 — deterministic scoring and exhaustive offline QA (stdlib only).

Usage: python validate.py
Inputs: dobby-e06-scoring-v1.json in same directory.
No account, backend, profile, or user data involved.
"""
import collections
import itertools
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parent
CFG=json.loads((ROOT/'dobby-e06-scoring-v1.json').read_text(encoding='utf-8'))
H=CFG['house'];P=CFG['patronus'];NAMES=[name for row in P['animalGrid'] for name in row]

def rotated_final(scores, weighted, response_ids, allowed=None):
    """Tie-break after two score layers; deterministic and no fixed favored label."""
    if allowed is None: allowed=list(range(len(scores)))
    best=max(scores[i] for i in allowed)
    possible=[i for i in allowed if scores[i]==best]
    if len(possible)==1: return possible[0]
    top=max(weighted[i] for i in possible)
    possible=[i for i in possible if weighted[i]==top]
    if len(possible)==1: return possible[0]
    rotation=sum((q+1)*(int(ans)+1) for q,ans in enumerate(response_ids))%len(possible)
    return possible[rotation]

def house_scores(indices,limit=6):
    axes=H['axes'];labels=H['labels'];weights=H['weights'];tally={x:0 for x in axes}
    score=[0]*len(labels);weighted=[0]*len(labels)
    for q,v in enumerate(indices[:limit]):
        answer=H['questions'][q]['answers'][int(v)]
        a,b=answer['primary'],answer['secondary']
        tally[a]+=3;tally[b]+=1
        for k,label in enumerate(labels):
            n=3*weights[label][a]+weights[label][b]
            score[k]+=n
            weighted[k]+=(q+1)*n
    return score,weighted,tally

def house_result(answers, optional=None):
    assert len(answers)==6
    scores,secondary,_=house_scores(answers)
    top=sorted(scores,reverse=True)
    need=top[0]-top[1]<=H['extraQuestionIfTopGapAtMost']
    if need and optional is None:return {'needs_extra':True,'possible':[H['labels'][i] for i,s in enumerate(scores) if s>=top[0]-1]}
    allowed=[i for i,s in enumerate(scores) if s>=top[0]-1] if need else list(range(4))
    picks=list(answers)
    if need:
        picks.append(int(optional))
        answer=H['questions'][6]['answers'][int(optional)]
        for k,label in enumerate(H['labels']):
            w=H['weights'][label]
            n=3*w[answer['primary']]+w[answer['secondary']]
            scores[k]+=n
            secondary[k]+=7*n
    winner=rotated_final(scores,secondary,picks,allowed)
    return {'needs_extra':need,'result':H['labels'][winner]}

def patronus_scores(answers):
    m={x:0 for x in P['modes']};u={x:0 for x in P['nuances']}
    mt={x:0 for x in P['modes']};ut={x:0 for x in P['nuances']}
    for q,v in enumerate(answers):
        row=P['questions'][q]['answers'][int(v)]
        for scores,weighted,pre,sec in ((m,mt,'modePrimary','modeSecondary'),(u,ut,'nuancePrimary','nuanceSecondary')):
            scores[row[pre]]+=3;scores[row[sec]]+=1
            weighted[row[pre]]+=(q+1)*3;weighted[row[sec]]+=(q+1)
    return m,u,mt,ut

def patronus_result(answers, optional=None):
    assert len(answers)==5
    m,u,mt,ut=patronus_scores(answers)
    needs=(list(m.values()).count(max(m.values()))>1 or list(u.values()).count(max(u.values()))>1)
    if needs and optional is None:return {'needs_extra':True}
    picks=list(answers)
    if needs:
        picks.append(int(optional))
        row=P['questions'][5]['answers'][int(optional)]
        for scores,weighted,pre,sec in ((m,mt,'modePrimary','modeSecondary'),(u,ut,'nuancePrimary','nuanceSecondary')):
            scores[row[pre]]+=3;scores[row[sec]]+=1
            weighted[row[pre]]+=6*3;weighted[row[sec]]+=6
    im=rotated_final([m[k] for k in P['modes']],[mt[k] for k in P['modes']],picks)
    js=rotated_final([u[k] for k in P['nuances']],[ut[k] for k in P['nuances']],picks)
    return {'needs_extra':needs,'result':P['animalGrid'][im][js], 'mode':P['modes'][im], 'nuance':P['nuances'][js]}

def evaluate():
    assert len(H['questions'])==7 and len(P['questions'])==6
    assert len(H['labels'])==4 and len(NAMES)==12 and len(set(NAMES))==12
    for item in H['questions']+P['questions']:
        assert len(item['answers'])==4
        for row in item['answers']:
            assert row['text'].strip()
    for item in H['questions']:
        assert len({a['primary'] for a in item['answers']})==4
    for item in P['questions']:
        assert len({a['modePrimary'] for a in item['answers']})==4
    H_counts=collections.Counter();H_extra=0;H_examples={}
    for response in itertools.product(range(4),repeat=6):
        first=house_result(response)
        if first['needs_extra']:H_extra+=1
        outcomes=[]
        for option in range(4):
            after=house_result(response,option)
            assert after['needs_extra']==first['needs_extra']
            outcomes.append(after['result']);H_counts[after['result']]+=1
            H_examples.setdefault(after['result'], (response,option if after['needs_extra'] else None))
        if not first['needs_extra']:assert len(set(outcomes))==1
    P_counts=collections.Counter();P_extra=0;P_examples={}
    for response in itertools.product(range(4),repeat=5):
        first=patronus_result(response)
        if first['needs_extra']:P_extra+=1
        outcomes=[]
        for option in range(4):
            after=patronus_result(response,option)
            assert after['needs_extra']==first['needs_extra']
            outcomes.append(after['result']);P_counts[after['result']]+=1
            P_examples.setdefault(after['result'], (response,option if after['needs_extra'] else None))
        if not first['needs_extra']:assert len(set(outcomes))==1
    assert set(H_counts)==set(H['labels'])
    assert set(P_counts)==set(NAMES)
    total_h=sum(H_counts.values());total_p=sum(P_counts.values())
    assert total_h==4**7 and total_p==4**6
    # User expectation: reasonably balanced across equiprobable responses.
    deviation_h=max(abs(c-total_h/4)/(total_h/4) for c in H_counts.values())
    deviation_p=max(abs(c-total_p/12)/(total_p/12) for c in P_counts.values())
    assert deviation_h<=0.1, f'Houses distribution skew {deviation_h:.1%}'
    assert deviation_p<=0.1, f'Patronus distribution skew {deviation_p:.1%}'
    return {
     'version':CFG['id'], 'status':'PASS',
     'house':{'base_combinations':4**6,'optional_combinations_in_qa':4**7,'extra_question_base_cases':H_extra,'extra_question_share':round(H_extra/4**6,6),'distribution_expected_per_label':total_h/4,'distribution':dict((k,H_counts[k]) for k in H['labels']),'max_relative_deviation':round(deviation_h,6),'one_reachable_example_each':{k:dict(q1_to_q6=list(v[0]),q7=v[1]) for k,v in H_examples.items()}},
     'patronus':{'base_combinations':4**5,'optional_combinations_in_qa':4**6,'extra_question_base_cases':P_extra,'extra_question_share':round(P_extra/4**5,6),'distribution_expected_per_animal':total_p/12,'distribution':dict((k,P_counts[k]) for k in NAMES),'max_relative_deviation':round(deviation_p,6),'one_reachable_example_each':{k:dict(q1_to_q5=list(v[0]),q6=v[1]) for k,v in P_examples.items()}},
     'notes':['Comptages ponderes par 4 pour integrer les 4 choix de departage possibles, y compris lorsqu il n est pas demande.', 'Les proportions de simulation supposent que toutes les combinaisons de reponses sont equiprobables ; elles ne sont pas une preuve de distribution reelle.', 'Le score est purement ludique, non psychometrique.']}

if __name__=='__main__':
    result=evaluate()
    (ROOT/'qa-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('PASS — DOBBY E06',result['version'])
    for group in ('house','patronus'):
        g=result[group]
        print(f'{group}: max deviation {g["max_relative_deviation"]:.1%}, tiebreak required {g["extra_question_share"]:.1%} of base cases')
        print('  '+', '.join(f'{k}:{v}' for k,v in g['distribution'].items()))
