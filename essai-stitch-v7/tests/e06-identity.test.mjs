import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from'node:vm';
const ctx={window:{}};vm.runInNewContext(fs.readFileSync(new URL('../../essai-stitch-v5-famille/family-profile.js',import.meta.url),'utf8'),ctx);const P=ctx.window.DobbyMagicIdentity;
test('E06 stores confirmed algorithm metadata and explicit ceremony state via the existing profile patch',()=>{
 const member={id:'test',name:'TEST Camille Dubois',avatar:'🌿',opaque:{x:1},magicProfile:{version:1,avatarId:'portrait-2',future:true}};
 const result=P.patch(member,{profileFirstName:'TEST Camille',profileLastName:'Dubois',magicHouseId:'slytherin',magicHouseAlgorithm:'e06-v1',magicCeremony:'deferred'});
 assert.equal(result.firstName,'TEST Camille');assert.equal(result.lastName,'Dubois');assert.equal(result.magicProfile.houseAlgorithmVersion,'e06-v1');assert.equal(result.magicProfile.ceremonyStatus,'deferred');assert.equal(result.magicProfile.future,true);assert.equal(result.opaque.x,1);
 assert.throws(()=>P.patch(member,{magicHouseAlgorithm:'e06-v1'}),/résultat/i);assert.throws(()=>P.patch(member,{magicCeremony:'parent-authorized'}),/cérémonie/i);
});
test('manual E05 house/patronus changes remove only the corresponding computed-version attribution',()=>{
 const member={id:'test',name:'TEST',magicProfile:{version:1,houseId:'slytherin',patronusId:'otter',houseAlgorithmVersion:'e06-v1',patronusAlgorithmVersion:'e06-v1'}};
 const changed=P.patch(member,{magicHouseId:'ravenclaw'});assert.equal(changed.magicProfile.houseAlgorithmVersion,undefined);assert.equal(changed.magicProfile.patronusAlgorithmVersion,'e06-v1');assert.equal(member.magicProfile.houseAlgorithmVersion,'e06-v1');
});
