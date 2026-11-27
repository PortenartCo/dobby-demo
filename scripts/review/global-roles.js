/* Browser-only fixture for the native Family V7 and Missions V3 transports. */
'use strict';
(function () {
  const scenario = typeof module === 'object' && module.exports ? require('./global-scenario.js') : window.DobbyGlobalScenario;
  const profiles = new Map(scenario.profiles.map(profile => [profile.code,profile]));
  const isChild = client => profiles.get(client)?.role === 'child';
  const memberId = client => profiles.get(client)?.memberId;
  const array = value => Array.isArray(value) ? value : [];
  const object = value => value && typeof value === 'object' && !Array.isArray(value);
  const clone = value => JSON.parse(JSON.stringify(value));
  const uuid = value => typeof value === 'string' && /^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i.test(value);
  const scalar = value => value === null || ['boolean', 'string', 'number'].includes(typeof value);
  const pick = (value, keys) => Object.fromEntries(keys.filter(key => scalar(value?.[key])).map(key => [key, value[key]]));
  const canonical = value => Array.isArray(value) ? value.map(canonical) : object(value) ?
    Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
  const serialize = value => JSON.stringify(canonical(value));
  const same = (left, right) => serialize(left) === serialize(right);
  const sha256 = async value => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',
    new TextEncoder().encode(serialize(value)))), byte => byte.toString(16).padStart(2, '0')).join('');
  const assignment = row => array(row?.assigneeIds).length ? row.assigneeIds : row?.assigneeId ? [row.assigneeId] : [];
  const assigned = (row, id) => row?.allFamily !== true && assignment(row).includes(id);
  const uniqueAssignment = (row, id) => same(assignment(row), [id]);
  const eventCategories = new Set(['Famille', 'École', 'Activité', 'Anniversaire', 'Déplacement', 'Autre']);
  const visibility = new Set(['family', 'shared', 'children', 'restricted']);
  const houses = ['gryffindor', 'slytherin', 'ravenclaw', 'hufflepuff'];
  const patronuses = ['stag', 'otter', 'fox', 'wolf', 'cat', 'owl', 'horse', 'hare', 'swan', 'lynx', 'badger', 'dolphin'];
  const familyCapabilities = Object.freeze({protocol:2,installed:true,familyRolesAvailable:true,
    familyRolesVerified:true,storagePoliciesVerified:true,childAccountLinkAvailable:true,
    childAccountLinkVerified:true,childAccessProtocol:1});
  const missionCapabilities = Object.freeze({protocol:3,intentVersion:1,participantVersion:1,
    contract:'dobby-missions-intents-v3-1',maxPayloadBytes:262144,directWritesBlocked:true,
    atomicAllocations:true,canonicalAuthorization:true,clientVerified:true,
    ledgerVersions:[1,2,3],runesLot1:1,runesLot2:1});
  const routePrefix = '/rest/v1/rpc/';
  const routes = new Set(['dobby_v7_context','dobby_v7_family_capabilities','dobby_v7_child_module',
    'dobby_v7_child_access_status','dobby_v7_suspend_child_access','dobby_v7_update_magic','dobby_v7_update_member',
    'dobby_missions_v3_capabilities','dobby_missions_v3_write']);
  const supports = pathname => pathname.startsWith(routePrefix) && routes.has(pathname.slice(routePrefix.length));

  function projectMember(member, id) {
    const profile = pick(member,['id','name','firstName','memberCategory','avatar']);
    if (object(member.magicProfile)) {
      const keys = ['version','avatarId','houseId','patronusId'];
      if (member.id === id) keys.push('ceremonyStatus','houseSelectionSource','houseAlgorithmVersion',
        'patronusSelectionSource','patronusAlgorithmVersion');
      profile.magicProfile = pick(member.magicProfile,keys);
    }
    return profile;
  }

  function projectFamily(row, client) {
    const id = memberId(client);
    const viewable = event => typeof event?.id === 'string' && typeof event.title === 'string' &&
      eventCategories.has(event.category ?? 'Famille') && (!Object.hasOwn(event,'private') || event.private === false) &&
      (!Object.hasOwn(event,'visibility') || visibility.has(event.visibility)) &&
      (!Object.hasOwn(event,'visibleToMemberIds') && event.visibility !== 'restricted' || array(event.visibleToMemberIds).includes(id));
    return {module:row.module,revision:row.revision,updated_at:row.updated_at,payload:{
      familyMembers:array(row.payload.familyMembers).filter(member => typeof member?.id === 'string').map(member => projectMember(member,id)),
      familyEvents:array(row.payload.familyEvents).filter(viewable).map(event =>
        pick(event,['id','title','date','time','category','person','personId','location']))}};
  }

  function missionFields(row,id) {
    return {...pick(row,['id','title','due','category','priority','deadlineOffsetDays','status','createdAt',
      'completedAt','effort','customRunes','rewardVersion','seriesId','occurrenceDate','individualRunes',
      'approvalRequired','participantVersion']),assigneeId:id,assigneeIds:[id],
      childCompletionAllowed:uniqueAssignment(row,id) && row.individualRunes !== true};
  }

  function projectMission(row,id) {
    const view = missionFields(row,id);
    const rules = array(row.recurrence?.rules).filter(rule => assigned(rule.template,id)).map(rule => ({
      ...pick(rule,['from','start','frequency','state','shortMonth','monthDay']),
      weekdays:array(rule.weekdays).filter(day => Number.isInteger(day)),template:missionFields(rule.template,id)
    }));
    if (rules.length) view.recurrence = {...pick(row.recurrence,['version','seriesId']),rules};
    return view;
  }

  function projectCredits(rows,id) {
    const visible = rows.filter(row => row.allocations ? row.allocations.some(part => part.memberId === id) : row.memberId === id);
    const references = new Map(), nextCycles = new Map();
    for (const row of visible.filter(row => !row.kind || row.kind === 'grant').sort((left,right) => (left.cycle || 0) - (right.cycle || 0))) {
      const cycle = nextCycles.get(row.missionId) || 0;
      nextCycles.set(row.missionId,cycle+1);
      references.set(row.eventId || row.missionId,{cycle,ownId:row.eventId ? `${row.missionId}~${cycle}~grant` : row.missionId});
    }
    return visible.map(row => {
      if (['bonus','correction'].includes(row.kind)) return {...pick(row,['eventId','kind','revision','memberId','amount',
        'date','actorMemberId','previousAmount']),reason:row.kind==='bonus'?'Bonus de runes':'Correction de runes',
        ...(row.kind==='correction'?{targetEventId:references.get(row.targetEventId)?.ownId || row.targetEventId}:{})};
      const amount = row.allocations ? row.allocations.find(part => part.memberId === id).amount : row.amount;
      const key = row.kind === 'reversal' ? row.reverses : row.eventId || row.missionId;
      const grant = references.get(key);
      return {...pick(row,['missionId','effort','date','title','revision','customRunes','sourceMissionId','participationId','regularized']),
        memberId:id,amount,...(row.eventId && grant ? {kind:row.kind,cycle:grant.cycle,
          eventId:row.kind==='reversal'?`${row.missionId}~${grant.cycle}~reversal`:grant.ownId} : {}),
        ...(row.kind==='reversal'?{reverses:grant?.ownId}:{}),
        ...(row.allocations?{allocations:[{memberId:id,amount}],...(Object.hasOwn(row,'customRunes')||amount!==row.amount?{customRunes:amount}:{})}:{})};
    });
  }

  function projectMissions(row,client) {
    if (!isChild(client)) return clone(row);
    const id = memberId(client), payload = row.payload;
    const goal = (payload.runeGoals || {})[id];
    return {module:row.module,revision:row.revision,updated_at:row.updated_at,payload:{
      autoTasks:[],runeRequests:[],runeLedgerVersion:payload.runeLedgerVersion || 1,
      manualMissions:array(payload.manualMissions).filter(mission => assigned(mission,id)).map(mission => projectMission(mission,id)),
      runeCredits:projectCredits(array(payload.runeCredits),id),
      missionParticipation:array(payload.missionParticipation).filter(event => event.memberId===id).map(event => pick(event,
        ['id','revision','missionId','memberId','action','status','date','actorMemberId','effort','amount','creditId'])),
      runeGoals:goal ? {[id]:pick(goal,['id','threshold','mode','unlocked','date',...(goal.mode==='announced'?['title']:[])])} : {},
      runeRewards:array(payload.runeRewards).filter(reward => reward.memberId===id).map(reward => ({...pick(reward,
        ['id','confirmationId','memberId','threshold','mode','date','revision','actorMemberId']),
        title:reward.mode==='surprise'?'Récompense mystère':reward.title}))}};
  }

  function identity({client,user,state,household}) {
    const id = memberId(client), child = isChild(client), row = state.modules.family;
    const profile = row.payload.familyMembers.find(member => member.id === id);
    if (!profile || state.suspended?.[client]) return {protocol:1,phase:'rejected',userId:user,
      ...(state.suspended?.[client]?{reason:'child_access_suspended'}:{})};
    return {protocol:1,phase:'active',userId:user,householdId:household,memberId:id,
      profile:child?projectMember(profile,id):clone(profile),category:child?'child':'parent',pendingCeremony:false,
      familyRevision:row.revision,permissions:{canEdit:!child,canMagic:true,canCreate:!child,
        canInvite:!child,canManageDependents:!child,canManageHousehold:!child,canCompleteMissionsV3:true}};
  }

  function patchMagic(member,values) {
    const magic = {...(member.magicProfile || {version:1})};
    if (magic.version !== 1) throw Error('Version du profil magique inconnue.');
    for (const [kind, key, choices] of [['House','house',houses],['Patronus','patronus',patronuses]]) {
      const choice = values['magic'+kind+'Id'];
      const algorithm = values['magic'+kind+'Algorithm'];
      if (algorithm !== undefined && (algorithm !== 'e06-v1' || choice === undefined)) throw Error('Choix et version E06 requis ensemble.');
      if (choice === undefined) continue;
      if (!choices.includes(choice)) throw Error('Choix magique inconnu.');
      magic[key+'Id'] = choice;
      magic[key+'SelectionSource'] = algorithm ? 'calculated' : 'manual';
      if (algorithm) magic[key+'AlgorithmVersion'] = algorithm;
      else delete magic[key+'AlgorithmVersion'];
    }
    if (values.magicCeremony !== undefined && !['complete','deferred'].includes(values.magicCeremony)) throw Error('État de cérémonie inconnu.');
    magic.ceremonyStatus = houses.includes(magic.houseId) && patronuses.includes(magic.patronusId) ? 'complete' : 'deferred';
    return {...member,magicProfile:magic};
  }

  function patchMember(member,values) {
    if (values.memberCategory && values.memberCategory !== member.memberCategory) throw Error('Les catégories des quatre profils de démonstration sont fixes.');
    const next = {...member,...pick(values,['firstName','lastName','avatar','birthdate','nickname','notes'])};
    if (values.profileFirstName !== undefined) next.firstName = values.profileFirstName;
    if (values.profileLastName !== undefined) next.lastName = values.profileLastName;
    if (values.name !== undefined) next.name = values.name.trim();
    else if (['profileFirstName','profileLastName','firstName','lastName'].some(key => Object.hasOwn(values,key))) {
      next.name = [next.firstName,next.lastName].filter(Boolean).join(' ');
    }
    if (values.clearBirthdate === 'yes' || values.clearBirthdate === 'true') delete next.birthdate;
    if (values.magicAvatarId) next.magicProfile = {...(member.magicProfile || {version:1}),avatarId:values.magicAvatarId};
    if (!next.name?.trim()) throw Error('Nom de membre requis.');
    return next;
  }

  const errorReply = (respond,code,message,status=400) => respond({code,message},status);
  async function updateFamily(args, magic) {
    const {state,client,user,body,respond,denied} = args;
    const row = state.modules.family, own = memberId(client), child = isChild(client);
    const target = row.payload.familyMembers.findIndex(member => member.id === body?.p_member_id);
    if (target<0 || child&&(!magic||body.p_member_id!==own)) return denied();
    const keys = magic ? ['magicHouseId','magicHouseAlgorithm','magicPatronusId','magicPatronusAlgorithm',
      ...(child?[]:['magicCeremony'])] : ['name','firstName','lastName','profileFirstName','profileLastName',
      'avatar','birthdate','clearBirthdate','nickname','notes','memberCategory','magicAvatarId','species'];
    const values = body.p_values;
    if (!object(values) || !Object.keys(values).length || !uuid(body.p_operation_id) ||
      Object.values(values).some(value => typeof value !== 'string')) return errorReply(respond,'22023','Modification fictive invalide.');
    if (Object.keys(values).some(key => !keys.includes(key))) return denied();
    const key = 'family:'+body.p_operation_id, digest = await sha256(body), previous = state.operations?.[key];
    if (previous) return previous.user===user && previous.digest===digest && previous.magic===magic ?
      respond({protocol:1,replayed:true,context:identity(args)}) : errorReply(respond,'22023','Opération fictive réutilisée.');
    if (body.p_expected_revision !== row.revision) return errorReply(respond,'40001','Révision fictive périmée.',409);
    try {
      const patch = magic?patchMagic:patchMember;
      row.payload.familyMembers[target] = patch(row.payload.familyMembers[target],values);
    } catch (error) { return errorReply(respond,'22023',error.message); }
    row.revision++;
    row.updated_at = new Date().toISOString();
    (state.operations ||= {})[key] = {digest,user,magic};
    return respond({protocol:1,replayed:false,context:identity(args),module:child?projectFamily(row,client):clone(row)});
  }

  function createRoles(nativeRoot) {
    let cores;
    const native = () => cores ||= Promise.all(['family-mission-intents.mjs','family-runes-core.mjs','family-missions-core.mjs']
      .map(name => import(new URL(name,nativeRoot).href)));
    async function writeMission(args) {
      const {state,client,user,household,body,respond,denied} = args;
      const child = isChild(client), own = memberId(client), row = state.modules.missions;
      if (body?.p_household_id!==household) return denied();
      if (!uuid(body.p_operation_id) || !Number.isSafeInteger(body.p_expected_revision)) return errorReply(respond,'22023','Révision ou opération fictive invalide.');
      const [intents,runes,recurrences] = await native();
      const operationId = body.p_operation_id, operationKey = 'missions:'+operationId;
      const stamp = new Date().toISOString();
      const previous = state.operations?.[operationKey], digest = await sha256(body);
      if (previous) return previous.user===user && previous.digest===digest ?
        respond({protocol:3,replayed:true,operation:previous.receipt,module:projectMissions(row,client)}) :
        errorReply(respond,'22023','Opération fictive réutilisée.');
      if (body.p_expected_revision!==row.revision) return errorReply(respond,'40001','Révision fictive périmée.',409);
      const family = state.modules.family.payload.familyMembers;
      const payload = clone(row.payload), revision = row.revision+1;
      const surpriseTitles = {...state.rewardSurprises};
      try {
        const intent = intents.normalizeMissionIntent(body.p_intent);
        const mission = payload.manualMissions.find(task => task.id===intent.missionId);
        if (child && (!['project','complete','submit'].includes(intent.kind) ||
          intent.kind!=='project' && !assigned(mission,own) ||
          intent.kind==='complete' && (mission.individualRunes===true || !uniqueAssignment(mission,own) || !same(intent.participantIds,[own])) ||
          intent.kind==='submit' && (intent.memberId!==own || mission.individualRunes!==true))) return denied();
        const ownedRunes = payload.runeCredits.filter(event => !runes.isLot1Entry(event));
        if (intent.kind==='complete' || intent.kind==='reopen') {
          if (!mission || mission.individualRunes===true) return denied();
          const status = intent.kind==='complete'?'done':'open';
          if (mission.status!==status) {
            const awards = status==='done'?runes.completionRequests(mission,family,intent.participantIds,ownedRunes,[],stamp):
              runes.reopeningRequests(mission,ownedRunes,[],stamp);
            payload.runeCredits.push(...awards.map(event => ({...event,revision})));
            mission.status = status;
            if (status==='done') mission.completedAt = stamp;
            else delete mission.completedAt;
          }
        } else if (intent.kind==='project') {
          const original = payload.manualMissions;
          const known = new Set(original.map(task => task.id));
          const generated = recurrences.projectRecurringMissions(original,recurrences.brusselsDate(),{series:'individual'});
          payload.manualMissions = original.concat(generated.filter(task => !known.has(task.id) && (!child || assigned(task,own))));
        } else if (intent.kind==='snapshot') {
          const known = new Map(payload.manualMissions.map(task => [task.id,task]));
          const incoming = intent.payload.manualMissions;
          if (intent.payload.runeCredits!==undefined && !same(intent.payload.runeCredits,payload.runeCredits) ||
            incoming.some(task => task.status!==(known.get(task.id)?.status || 'open'))) return denied();
          payload.autoTasks = clone(intent.payload.autoTasks);
          payload.manualMissions = clone(incoming);
        } else if (runes.isLot1Entry(intent)) {
          if (!family.some(person => person.id===intent.memberId&&person.memberCategory==='child')) return denied();
          const {expectedAmount,...entry} = intent;
          payload.runeCredits.push({...entry,eventId:'rune:'+operationId,revision,date:stamp,actorMemberId:own,
            ...(intent.kind==='correction'?{previousAmount:expectedAmount}:{})});
        } else if (intent.kind.startsWith('reward-')) {
          if (!family.some(person => person.id===intent.memberId&&person.memberCategory==='child')) return denied();
          const member = intent.memberId, goal = (payload.runeGoals ||= {})[member], past = payload.runeRewards ||= [];
          const total = runes.memberSummary(member,payload.runeCredits).total;
          if (intent.kind==='reward-set') {
            const latest = Math.max(0,...past.filter(row => row.memberId===member).map(row => row.threshold));
            if (goal || intent.threshold<=Math.max(latest,total)) throw Error('Le nouveau palier doit dépasser le capital et le dernier seuil.');
            payload.runeGoals[member] = {id:operationId,mode:intent.mode,threshold:intent.threshold,unlocked:false,date:stamp,
              ...(intent.mode==='announced'?{title:intent.title}:{})};
            if (intent.mode==='surprise' && intent.title) surpriseTitles[operationId] = intent.title;
          } else {
            if (!goal || goal.id!==intent.goalId || total<goal.threshold) throw Error('Récompense fictive verrouillée ou déjà confirmée.');
            const title = goal.mode==='announced'?goal.title:intent.title || surpriseTitles[goal.id];
            if (!title) throw Error('Indiquez la récompense surprise à révéler.');
            past.push({id:goal.id,confirmationId:operationId,memberId:member,threshold:goal.threshold,mode:goal.mode,
              title,date:stamp,revision,actorMemberId:own});
            delete payload.runeGoals[member];
            delete surpriseTitles[goal.id];
          }
        } else {
          // The launch fixture does not seed individual participation workflows.
          // Leave that unsupported rather than manufacturing a positive receipt.
          return errorReply(respond,'22023','Le parcours individuel avec approbation est hors de ce scénario.');
        }
        for (const [member,goal] of Object.entries(payload.runeGoals || {})) {
          goal.unlocked = runes.memberSummary(member,payload.runeCredits).total>=goal.threshold;
        }
        intents.validateMissionV3Module({...row,payload},row);
      } catch (error) { return errorReply(respond,'22023',error.message); }
      const changed = !same(payload,row.payload);
      if (changed) {
        Object.assign(row,{payload,revision,updated_at:stamp});
        if (Object.keys(surpriseTitles).length || state.rewardSurprises) state.rewardSurprises = surpriseTitles;
      }
      const receipt = {id:operationId,revision:row.revision,digest,changed};
      (state.operations ||= {})[operationKey] = {receipt,user,digest};
      return respond({protocol:3,replayed:false,operation:receipt,module:projectMissions(row,client)});
    }

    async function handle(args) {
      const {client,method,url,body,state,household,respond,denied} = args;
      if (!supports(url.pathname)) return undefined;
      const rpc = url.pathname.slice(routePrefix.length), child = isChild(client);
      if (rpc==='dobby_v7_family_capabilities' && method==='POST') return respond(familyCapabilities);
      if (!memberId(client)) return denied();
      if (rpc==='dobby_v7_context' && method==='POST') return respond(identity(args));
      if (state.suspended?.[client]) return denied();
      if (rpc==='dobby_v7_child_module' && method==='GET') {
        if (!child || url.searchParams.get('p_household_id')!==household) return denied();
        const module = url.searchParams.get('p_module');
        if (module==='family') return respond(projectFamily(state.modules.family,client));
        if (module==='missions') return respond(projectMissions(state.modules.missions,client));
        return denied();
      }
      if (rpc==='dobby_v7_child_access_status' || rpc==='dobby_v7_suspend_child_access') {
        if (child) return denied();
        const target = method==='GET'?url.searchParams.get('p_member_id'):body?.p_member_id;
        const code = scenario.profiles.find(profile => profile.role==='child' && profile.memberId===target)?.code;
        if (!code) return denied();
        if (rpc==='dobby_v7_suspend_child_access' && method==='POST') (state.suspended ||= {})[code] = true;
        else if (rpc!=='dobby_v7_child_access_status' || method!=='GET') return denied();
        return respond({linked:true,active:!state.suspended?.[code]});
      }
      if (rpc==='dobby_v7_update_magic' && method==='POST') return updateFamily(args,true);
      if (rpc==='dobby_v7_update_member' && method==='POST') return updateFamily(args,false);
      if (rpc==='dobby_missions_v3_capabilities' && method==='GET' && url.searchParams.get('p_household_id')===household) return respond(missionCapabilities);
      if (rpc==='dobby_missions_v3_write' && method==='POST') return writeMission(args);
      return denied();
    }
    return Object.freeze({handle,supports,memberId,isChild,projectFamily,projectMissions});
  }
  if (typeof module === 'object' && module.exports) module.exports = createRoles;
  else window.DobbyGlobalRoles = createRoles(new URL('essai-stitch-v5-famille/',window.DobbyReview.root));
})();
