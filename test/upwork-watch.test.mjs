import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createUpworkWatch,upworkPrompt,watchQuery} from '../upwork-watch.mjs';

const temp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'upwork-watch-'));

test('upwork čuvar: proverava tek posle intervala i pamti viđene poruke',()=>{
 const dir=temp();let t=10*3600000;
 const w=createUpworkWatch(path.join(dir,'s.json'),{now:()=>t});
 w.update({project:dir});
 assert.equal(w.due(),true);
 w.markCheck();assert.equal(w.due(),false);
 t+=3*3600000;assert.equal(w.due(),true);
 assert.deepEqual(w.fresh(['a','b']),['a','b']);
 w.markRun(['a'],'c1');
 assert.deepEqual(w.fresh(['a','b','b']),['b']);
 assert.equal(w.state().chatId,'c1');
});

test('upwork čuvar: isključen ili bez foldera projekta ne pokreće ništa',()=>{
 const dir=temp();
 const w=createUpworkWatch(path.join(dir,'s.json'),{now:()=>1e12});
 w.update({project:path.join(dir,'nema')});assert.equal(w.due(),false);
 w.update({project:dir,enabled:false});assert.equal(w.due(),false);
 assert.throws(()=>w.update({intervalHours:0}));
});

test('upwork čuvar: upit i uputstvo za mali čet',()=>{
 assert.equal(watchQuery('Upwork oglasi'),'label:Upwork-oglasi newer_than:3d');
 const p=upworkPrompt({address:'http://x',project:'/p',ids:['m1','m2']});
 assert.match(p,/m1, m2/);assert.match(p,/trash/);assert.match(p,/Ponude ne šalji/);
});

test('server: čuvar je vezan za Gmail i ima API',()=>{
 const s=fs.readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
 assert.match(s,/from '\.\/upwork-watch\.mjs'/);
 assert.match(s,/\/api\/upwork-watch\/run/);
 assert.match(s,/gmail\.search\(\{q:watchQuery/);
});

test('upwork čuvar: pretraga u Chrome-u samo u prozoru 14-22 h i najviše na 3 sata',()=>{
 const dir=temp(),day=new Date(2026,10,7,0,0,0).getTime();let t=day+9*3600000;
 const w=createUpworkWatch(path.join(dir,'s.json'),{now:()=>t});
 w.update({project:dir});
 assert.equal(w.searchDue(),false);
 t=day+15*3600000;assert.equal(w.searchDue(),true);
 w.markSearch();t+=2*3600000;assert.equal(w.searchDue(),false);
 t+=3600000;assert.equal(w.searchDue(),true);
 t=day+22*3600000+60000;assert.equal(w.searchDue(),false);
 w.update({search:false});t=day+15*3600000;w.markSearch();t+=4*3600000;assert.equal(w.searchDue(),false);
 assert.match(upworkPrompt({address:'x',project:'/p',search:true}),/Find work/);
 assert.doesNotMatch(upworkPrompt({address:'x',project:'/p',ids:['m']}),/Find work/);
});
