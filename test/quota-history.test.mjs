import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createQuotaHistory} from '../quota-history.mjs';
test('promene limita su očitani intervali, čuvaju odgovore svih četova i preskaču reset i stare podatke',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'agent-quota-')),file=path.join(dir,'history.json');const turns=[{chatId:'parent',messageId:'m1',agent:'claude',title:'Glavni',model:'opus',createdAt:1100,completedAt:1500},{chatId:'child',parentChatId:'parent',messageId:'m2',agent:'claude',title:'Podagent',model:'opus',createdAt:1200,completedAt:1600},{chatId:'other',messageId:'m3',agent:'codex',createdAt:1300,completedAt:1700}];
 try{const history=createQuotaHistory(file,{turns:()=>turns});const sample=(updatedAt,remaining,resetAt=5000)=>({agent:'claude',updatedAt,windows:[{period:'fiveHour',remaining,resetAt}]});assert.equal(history.observe(sample(1000,90)),false);assert.equal(history.observe({...sample(1800,70),stale:true}),false);assert.equal(history.observe(sample(2000,85)),true);const event=history.list()[0];assert.equal(event.windows[0].drop,5);assert.equal(event.attribution,'observed-interval');assert.deepEqual(event.turns.map(t=>t.messageId),['m1','m2']);assert.equal(history.forChat('parent').length,1);assert.equal(history.forChat('child').length,1);assert.equal(history.observe(sample(1900,80)),false);assert.equal(history.observe(sample(3000,99,9000)),false);assert.equal(history.observe(sample(4000,98,9000)),true);assert.equal(history.list()[0].turns.length,0);assert.equal(createQuotaHistory(file).list().length,2);assert.equal(fs.statSync(file).mode&0o777,0o600);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
