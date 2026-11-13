'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const rows=JSON.parse(fs.readFileSync('docs/dobby-v7/revue-generale/REGISTRE.json','utf8'));
assert.equal(rows.length,60);const required=new Set(rows.map(x=>x.id));assert.equal(required.size,60);
const report=fs.readFileSync('docs/dobby-v7/REVUE-GENERALE-LIVRAISON.md','utf8');
const allowed=new Set(['FAIT_TESTÉ_DÉPLOYÉ','FAIT_TESTÉ_NON_DÉPLOYÉ','PARTIEL','ATTENTE_UTILISATEUR','NON_FAIT']);
const table=report.split('\n').filter(line=>/^\| [SDNHMTCF][0-9]{2} \|/.test(line));
assert.equal(table.length,60,'Every normative ID needs one delivery row');
for(const line of table){const cells=line.split('|').slice(1,-1).map(x=>x.trim());assert.equal(cells.length,6);assert.ok(required.delete(cells[0]),'Unexpected/duplicate ID '+cells[0]);assert.ok(allowed.has(cells[1]),cells[0]+' unknown status');assert.ok(cells.slice(2).every(Boolean),'Missing file/test/evidence/reserve');}
assert.equal(required.size,0);
assert.ok(fs.existsSync('docs/dobby-v7/ACTIONS-MANUELLES-APRES-REVUE.md'));
console.log('REVIEW60_REPORT_PASS exact60 unique IDs, explicit statuses and manual actions');
